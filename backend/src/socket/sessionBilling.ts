import type { PoolClient } from "pg";
import type { Server } from "socket.io";

import { pool } from "../db/index.js";
import { applyMinutesOfferToHumanChat } from "../services/promoOfferService.js";
import { notifySessionEnded } from "../services/pushNotifications.js";
import {
  autoConnectNextInQueue,
  emitQueuePositionUpdates,
  emitWaitlistUpdated,
} from "./waitlistHandlers.js";
import {
  clearWaitingSessionTimeout,
  liveSessions,
  startSessionTimer,
  stopSessionTimer,
  type LiveSessionState,
} from "./sessionState.js";

// BILLING TEST CHECKLIST:
// 1. Normal session: chat 2 min → End Session → wallet -₹30, astrologer +₹30, dashboard shows "2 min / ₹30"
// 2. Sub-minute session with messages: chat 30s, send 1 msg → End → charge ₹15 (min 1 min rule)
// 3. Sub-minute session NO messages: join → End immediately → charge ₹0
// 4. Double end: user clicks End Chat, astrologer also clicks End Session simultaneously → billing fires once only
// 5. Server restart mid-session: restart backend → rejoin → timer resumes from DB started_at → End → correct duration billed
// 6. Wallet display: after session ends, navbar + dashboard wallet shows updated balance (not stale ₹500)

async function updateAstrologerAverageSessionDuration(
  client: PoolClient,
  astrologerId: string
): Promise<void> {
  await client.query(
    `UPDATE astrologers
     SET avg_session_duration = (
       SELECT COALESCE(AVG(latest.total_minutes), 5)
       FROM (
         SELECT cs.total_minutes
         FROM chat_sessions cs
         WHERE cs.astrologer_id = $1
           AND cs.status = 'ended'
           AND cs.total_minutes > 0
         ORDER BY cs.started_at DESC NULLS LAST
         LIMIT 20
       ) latest
     )
     WHERE id = $1`,
    [astrologerId]
  );
}

export async function finalizeChatSession(
  io: Server,
  sessionId: string
): Promise<
  | { ended: true; totalMinutes: number; totalCharged: number }
  | { ended: false; reason: "deduction_failed" }
  | null
> {
  const liveState = liveSessions.get(sessionId);
  if (liveState?.billed) {
    return null;
  }
  if (liveState) {
    liveState.billed = true;
  }

  let live: LiveSessionState | null = null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lockResult = await client.query<{
      id: string;
      user_id: string;
      astrologer_id: string;
      astrologer_user_id: string;
      astrologer_name: string;
      status: string;
      started_at: Date | null;
      price_per_minute: string | null;
    }>(
      `SELECT cs.id,
              cs.user_id,
              cs.astrologer_id,
              a.user_id AS astrologer_user_id,
              au.name AS astrologer_name,
              cs.status,
              cs.started_at,
              a.price_per_minute
       FROM chat_sessions cs
       INNER JOIN astrologers a ON a.id = cs.astrologer_id
       INNER JOIN users au ON au.id = a.user_id
       WHERE cs.id = $1
       FOR UPDATE`,
      [sessionId]
    );

    const row = lockResult.rows[0];
    if (!row) {
      if (liveState) {
        liveState.billed = false;
      }
      await client.query("ROLLBACK");
      return null;
    }

    if (row.status === "ended" || row.status === "cancelled") {
      clearWaitingSessionTimeout(sessionId);
      liveSessions.delete(sessionId);
      await client.query("ROLLBACK");
      return null;
    }

    clearWaitingSessionTimeout(sessionId);
    live = stopSessionTimer(sessionId);
    const price = Number(row.price_per_minute ?? 0);
    if (!live) {
      console.log("[TIMER] using DB fallback for duration calc", sessionId);
    }
    const authoritativeStart =
      live?.startTime ??
      (row.started_at ? new Date(row.started_at).getTime() : Date.now());
    const rawDuration = Math.max(
      0,
      Math.ceil((Date.now() - authoritativeStart) / 60_000)
    );
    const bothCommunicated =
      (live?.userMessageCount ?? 0) >= 1 &&
      (live?.astrologerMessageCount ?? 0) >= 1;
    const finalDuration = rawDuration > 0 ? rawDuration : bothCommunicated ? 1 : 0;
    const effectiveDuration = bothCommunicated ? finalDuration : 0;

    const userId = row.user_id;
    const astrologerName = row.astrologer_name;
    const { billableMinutes } = await applyMinutesOfferToHumanChat(
      userId,
      effectiveDuration,
      price,
      client
    );
    const rawCharge = billableMinutes * price;
    const totalCharged = Math.round(rawCharge * 100) / 100;

    if (totalCharged > 0) {
      const deduct = await client.query<{ wallet_balance: string }>(
        `UPDATE users
         SET wallet_balance = wallet_balance - $1::numeric
         WHERE id = $2 AND wallet_balance >= $1::numeric
         RETURNING wallet_balance`,
        [totalCharged, userId]
      );
      if (deduct.rows.length === 0) {
        if (live) {
          startSessionTimer(io, sessionId, live.startTime);
          live.billed = false;
        }
        await client.query("ROLLBACK");
        return { ended: false, reason: "deduction_failed" };
      }

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status)
         VALUES ($1, 'deduction', $2, 'success')`,
        [userId, totalCharged]
      );

      await client.query(
        `INSERT INTO astrologer_earnings_log (astrologer_id, session_id, amount)
         VALUES ($1, $2, $3)`,
        [row.astrologer_id, sessionId, totalCharged]
      );
    }

    await client.query(
      `UPDATE chat_sessions
       SET status = 'ended',
           ended_at = now(),
           total_minutes = $1,
           total_charged = $2::numeric
       WHERE id = $3`,
      [effectiveDuration, totalCharged, sessionId]
    );
    await updateAstrologerAverageSessionDuration(client, row.astrologer_id);

    await client.query("COMMIT");
    liveSessions.delete(sessionId);

    console.log("[TIMER] session ended", sessionId, "duration:", effectiveDuration, "mins");
    console.log("[BILLING] charged:", effectiveDuration * price);
    console.log(
      "[BILLING AUDIT]",
      JSON.stringify({
        sessionId,
        userId,
        astrologerName,
        durationMinutes: effectiveDuration,
        ratePerMinute: price,
        totalCharged,
        timestamp: new Date().toISOString(),
        timerSource: live ? "live_memory" : "db_fallback",
        bothCommunicated,
        userMessageCount: live?.userMessageCount ?? 0,
        astrologerMessageCount: live?.astrologerMessageCount ?? 0,
      })
    );

    io.to(sessionId).emit("session_ended", {
      sessionId,
      duration: effectiveDuration,
      charge: totalCharged,
      astrologerName,
      totalMinutes: effectiveDuration,
      totalCharged,
    });

    void notifySessionEnded({
      userId,
      astrologerName,
      duration: effectiveDuration,
      cost: totalCharged,
    }).catch((err) => console.error("[Push] Failed to notify session end:", err));

    await emitWaitlistUpdated(
      io,
      row.astrologer_user_id,
      row.astrologer_id
    );
    await emitQueuePositionUpdates(io, row.astrologer_id);
    await autoConnectNextInQueue(
      io,
      row.astrologer_id,
      row.astrologer_user_id,
      row.astrologer_name
    );

    return { ended: true, totalMinutes: effectiveDuration, totalCharged };
  } catch (e) {
    if (live) {
      startSessionTimer(io, sessionId, live.startTime);
      live.billed = false;
    } else if (liveState) {
      liveState.billed = false;
    }
    await client.query("ROLLBACK");
    console.error("finalizeChatSession failed:", e);
    return null;
  } finally {
    client.release();
  }
}

export async function billingTick(io: Server): Promise<void> {
  const result = await pool.query<{
    id: string;
    wallet_balance: string;
    price_per_minute: string | null;
  }>(
    `SELECT cs.id, u.wallet_balance, a.price_per_minute
     FROM chat_sessions cs
     INNER JOIN users u ON u.id = cs.user_id
     INNER JOIN astrologers a ON a.id = cs.astrologer_id
     WHERE cs.status = 'active'`
  );

  for (const row of result.rows) {
    const balance = Number(row.wallet_balance ?? 0);
    const ppm = Number(row.price_per_minute ?? 0);
    if (ppm <= 0) {
      continue;
    }
    if (balance < ppm) {
      io.to(row.id).emit("insufficient_balance", { sessionId: row.id });
      await finalizeChatSession(io, row.id);
    }
  }
}

