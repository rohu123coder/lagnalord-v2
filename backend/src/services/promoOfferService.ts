import type { PoolClient, QueryResult, QueryResultRow } from "pg";

import { pool, query } from "../db/index.js";

async function q<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient | undefined,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  if (client) {
    return client.query<T>(text, params);
  }
  return query<T>(text, params);
}

export type PromoAppliesTo = "ai_chat" | "human_chat" | "both";
export type PromoUnitType = "minutes" | "messages";

export type PromoOffer = {
  id: string;
  name: string;
  applies_to: PromoAppliesTo;
  unit_type: PromoUnitType;
  unit_value: number;
  start_at: Date;
  end_at: Date;
  per_user_limit: number;
  active: boolean;
};

export type ConsumeOfferResult = {
  coveredUnits: number;
  uncoveredUnits: number;
  fullyCovered: boolean;
};

export async function getActiveEligibleOffer(
  userId: string,
  appliesTo: Exclude<PromoAppliesTo, "both">,
  client?: PoolClient,
  unitType?: PromoUnitType
): Promise<PromoOffer | null> {
  const result = await q<{
    id: string;
    name: string;
    applies_to: PromoAppliesTo;
    unit_type: PromoUnitType;
    unit_value: number;
    start_at: Date;
    end_at: Date;
    per_user_limit: number;
    active: boolean;
  }>(
    client,
    `SELECT o.id, o.name, o.applies_to, o.unit_type, o.unit_value,
            o.start_at, o.end_at, o.per_user_limit, o.active
     FROM promo_offers o
     WHERE o.active = true
       AND now() >= o.start_at
       AND now() <= o.end_at
       AND (o.applies_to = $2 OR o.applies_to = 'both')
       AND ($3::text IS NULL OR o.unit_type = $3)
       AND (
         EXISTS (
           SELECT 1 FROM promo_offer_claims c
           WHERE c.offer_id = o.id
             AND c.user_id = $1
             AND c.units_used < c.units_granted
         )
         OR (
           SELECT COUNT(*) FROM promo_offer_claims c
           WHERE c.offer_id = o.id AND c.user_id = $1
         ) < o.per_user_limit
       )
     ORDER BY o.end_at ASC
     LIMIT 1`,
    [userId, appliesTo, unitType ?? null]
  );
  return result.rows[0] ?? null;
}

export async function consumeOfferUnit(
  userId: string,
  offerId: string,
  unitsToConsume: number,
  client?: PoolClient
): Promise<ConsumeOfferResult> {
  if (unitsToConsume <= 0) {
    return { coveredUnits: 0, uncoveredUnits: 0, fullyCovered: true };
  }

  const run = async (cx: PoolClient): Promise<ConsumeOfferResult> => {
    const offerResult = await cx.query<{ unit_value: number }>(
      `SELECT unit_value FROM promo_offers WHERE id = $1 FOR UPDATE`,
      [offerId]
    );
    const offer = offerResult.rows[0];
    if (!offer) {
      return {
        coveredUnits: 0,
        uncoveredUnits: unitsToConsume,
        fullyCovered: false,
      };
    }

    const existing = await cx.query<{
      units_granted: number;
      units_used: number;
    }>(
      `SELECT units_granted, units_used
       FROM promo_offer_claims
       WHERE offer_id = $1 AND user_id = $2
       FOR UPDATE`,
      [offerId, userId]
    );

    let granted = offer.unit_value;
    let used = 0;
    if (!existing.rows[0]) {
      await cx.query(
        `INSERT INTO promo_offer_claims (offer_id, user_id, units_granted, units_used)
         VALUES ($1, $2, $3, 0)`,
        [offerId, userId, granted]
      );
    } else {
      granted = existing.rows[0].units_granted;
      used = existing.rows[0].units_used;
    }

    const remaining = Math.max(0, granted - used);
    const coveredUnits = Math.min(unitsToConsume, remaining);
    const uncoveredUnits = unitsToConsume - coveredUnits;

    if (coveredUnits > 0) {
      await cx.query(
        `UPDATE promo_offer_claims
         SET units_used = units_used + $1
         WHERE offer_id = $2 AND user_id = $3`,
        [coveredUnits, offerId, userId]
      );
    }

    return {
      coveredUnits,
      uncoveredUnits,
      fullyCovered: uncoveredUnits === 0,
    };
  };

  if (client) {
    return run(client);
  }

  const own = await pool.connect();
  try {
    await own.query("BEGIN");
    const result = await run(own);
    await own.query("COMMIT");
    return result;
  } catch (e) {
    await own.query("ROLLBACK");
    throw e;
  } finally {
    own.release();
  }
}

export async function applyPromoThenWalletDebit(params: {
  userId: string;
  appliesTo: Exclude<PromoAppliesTo, "both">;
  unitType: PromoUnitType;
  unitsToConsume: number;
  walletAmount: number;
}): Promise<
  | {
      ok: true;
      charged: number;
      wallet_balance: number | null;
      offer_id: string | null;
    }
  | { ok: false; required: number }
> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const offer = await getActiveEligibleOffer(
      params.userId,
      params.appliesTo,
      client,
      params.unitType
    );

    let charged = params.walletAmount;
    let offerId: string | null = null;

    if (offer && offer.unit_type === params.unitType) {
      const consumed = await consumeOfferUnit(
        params.userId,
        offer.id,
        params.unitsToConsume,
        client
      );
      offerId = offer.id;
      if (consumed.fullyCovered) {
        charged = 0;
      } else if (consumed.coveredUnits > 0 && params.unitsToConsume > 0) {
        charged =
          params.walletAmount * (consumed.uncoveredUnits / params.unitsToConsume);
      }
    }

    let walletBalance: number | null = null;
    if (charged > 0) {
      const deduct = await client.query<{ wallet_balance: string }>(
        `UPDATE users
         SET wallet_balance = wallet_balance - $1::numeric
         WHERE id = $2 AND wallet_balance >= $1::numeric
         RETURNING wallet_balance`,
        [charged, params.userId]
      );
      if (deduct.rows.length === 0) {
        await client.query("ROLLBACK");
        return { ok: false, required: charged };
      }
      walletBalance = Number(deduct.rows[0].wallet_balance);
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status)
         VALUES ($1, 'deduction', $2, 'success')`,
        [params.userId, charged]
      );
    }

    await client.query("COMMIT");
    return {
      ok: true,
      charged,
      wallet_balance: walletBalance,
      offer_id: offerId,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
