import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { query } from "../db/index.js";
import { idParamSchema } from "./adminShared.js";

const router = Router();

const offerAppliesTo = z.enum(["ai_chat", "human_chat", "both", "whatsapp_ai_chat"]);
const offerUnitType = z.enum(["minutes", "messages"]);

const offerCreateBody = z.object({
  name: z.string().trim().min(1).max(120),
  applies_to: offerAppliesTo,
  unit_type: offerUnitType,
  unit_value: z.coerce.number().int().min(1).max(1_000_000),
  start_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid start_at"),
  end_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid end_at"),
  per_user_limit: z.coerce.number().int().min(1).max(100).default(1),
  active: z.boolean().optional().default(true),
});

const offerPatchBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  applies_to: offerAppliesTo.optional(),
  unit_type: offerUnitType.optional(),
  unit_value: z.coerce.number().int().min(1).max(1_000_000).optional(),
  start_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid start_at").optional(),
  end_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid end_at").optional(),
  per_user_limit: z.coerce.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
});

type OfferRow = {
  id: string;
  name: string;
  applies_to: "ai_chat" | "human_chat" | "both" | "whatsapp_ai_chat";
  unit_type: "minutes" | "messages";
  unit_value: number;
  start_at: Date;
  end_at: Date;
  per_user_limit: number;
  active: boolean;
  created_at: Date;
  claim_count: string;
};

function offerStatus(row: { active: boolean; start_at: Date; end_at: Date }): "inactive" | "scheduled" | "live" | "expired" {
  if (!row.active) return "inactive";
  const now = Date.now();
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "live";
}

function serializeOffer(row: OfferRow) {
  return {
    id: row.id,
    name: row.name,
    applies_to: row.applies_to,
    unit_type: row.unit_type,
    unit_value: row.unit_value,
    start_at: row.start_at,
    end_at: row.end_at,
    per_user_limit: row.per_user_limit,
    active: row.active,
    created_at: row.created_at,
    claim_count: Number(row.claim_count),
    status: offerStatus(row),
  };
}

router.get("/offers", async (_req: Request, res: Response) => {
  try {
    const result = await query<OfferRow>(
      `SELECT o.id, o.name, o.applies_to, o.unit_type, o.unit_value,
              o.start_at, o.end_at, o.per_user_limit, o.active, o.created_at,
              COUNT(c.id)::text AS claim_count
       FROM promo_offers o
       LEFT JOIN promo_offer_claims c ON c.offer_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    res.json({
      success: true,
      data: { offers: result.rows.map(serializeOffer) },
    });
  } catch (e) {
    console.error("admin offers list failed:", e);
    res.status(500).json({
      success: false,
      error: "Could not load offers (has the promo_offers migration been run?)",
    });
  }
});

router.post("/offers", async (req: Request, res: Response) => {
  const parsed = offerCreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const body = parsed.data;
  if (new Date(body.end_at).getTime() <= new Date(body.start_at).getTime()) {
    res.status(400).json({ success: false, error: "end_at must be after start_at" });
    return;
  }

  try {
    const inserted = await query<OfferRow>(
      `INSERT INTO promo_offers
         (name, applies_to, unit_type, unit_value, start_at, end_at, per_user_limit, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, applies_to, unit_type, unit_value, start_at, end_at,
                 per_user_limit, active, created_at, '0'::text AS claim_count`,
      [
        body.name,
        body.applies_to,
        body.unit_type,
        body.unit_value,
        body.start_at,
        body.end_at,
        body.per_user_limit,
        body.active,
      ]
    );
    res.status(201).json({ success: true, data: serializeOffer(inserted.rows[0]) });
  } catch (e) {
    console.error("admin offers create failed:", e);
    res.status(500).json({ success: false, error: "Could not create offer" });
  }
});

router.patch("/offers/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid offer id" });
    return;
  }
  const bodyParsed = offerPatchBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({
      success: false,
      error: bodyParsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const existing = await query<{
    id: string;
    name: string;
    applies_to: "ai_chat" | "human_chat" | "both" | "whatsapp_ai_chat";
    unit_type: "minutes" | "messages";
    unit_value: number;
    start_at: Date;
    end_at: Date;
    per_user_limit: number;
    active: boolean;
  }>(
    `SELECT id, name, applies_to, unit_type, unit_value, start_at, end_at, per_user_limit, active
     FROM promo_offers WHERE id = $1`,
    [idParsed.data.id]
  );
  const row = existing.rows[0];
  if (!row) {
    res.status(404).json({ success: false, error: "Offer not found" });
    return;
  }

  const next = {
    name: bodyParsed.data.name ?? row.name,
    applies_to: bodyParsed.data.applies_to ?? row.applies_to,
    unit_type: bodyParsed.data.unit_type ?? row.unit_type,
    unit_value: bodyParsed.data.unit_value ?? row.unit_value,
    start_at: bodyParsed.data.start_at ?? row.start_at.toISOString(),
    end_at: bodyParsed.data.end_at ?? row.end_at.toISOString(),
    per_user_limit: bodyParsed.data.per_user_limit ?? row.per_user_limit,
    active: bodyParsed.data.active ?? row.active,
  };

  if (new Date(next.end_at).getTime() <= new Date(next.start_at).getTime()) {
    res.status(400).json({ success: false, error: "end_at must be after start_at" });
    return;
  }

  try {
    const updated = await query<OfferRow>(
      `UPDATE promo_offers
       SET name = $1, applies_to = $2, unit_type = $3, unit_value = $4,
           start_at = $5, end_at = $6, per_user_limit = $7, active = $8
       WHERE id = $9
       RETURNING id, name, applies_to, unit_type, unit_value, start_at, end_at,
                 per_user_limit, active, created_at,
                 (SELECT COUNT(*)::text FROM promo_offer_claims c WHERE c.offer_id = promo_offers.id) AS claim_count`,
      [
        next.name,
        next.applies_to,
        next.unit_type,
        next.unit_value,
        next.start_at,
        next.end_at,
        next.per_user_limit,
        next.active,
        idParsed.data.id,
      ]
    );
    res.json({ success: true, data: serializeOffer(updated.rows[0]) });
  } catch (e) {
    console.error("admin offers update failed:", e);
    res.status(500).json({ success: false, error: "Could not update offer" });
  }
});

export { router as adminOffersRouter };
