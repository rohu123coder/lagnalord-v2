import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { query } from "../db/index.js";
import { idParamSchema, paginationQuery } from "./adminShared.js";

const router = Router();

const astrologersQuery = paginationQuery.extend({
  search: z.string().optional(),
});

router.get("/astrologers", async (req: Request, res: Response) => {
  const parsed = astrologersQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid query",
    });
    return;
  }

  const { page, limit, search } = parsed.data;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? `AND (u.name ILIKE $1 OR u.email ILIKE $1)`
    : "";
  const countParams = search ? [`%${search}%`] : [];
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM astrologers a
     INNER JOIN users u ON u.id = a.user_id
     WHERE TRUE ${searchFilter}`,
    countParams
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const listFilter = search
    ? `AND (u.name ILIKE $1 OR u.email ILIKE $1)`
    : "";
  const listParams = search
    ? [`%${search}%`, limit, offset]
    : [limit, offset];
  const limitSql = search ? `LIMIT $2 OFFSET $3` : `LIMIT $1 OFFSET $2`;

  const result = await query<{
    id: string;
    user_id: string;
    rating: string | null;
    is_verified: boolean;
    is_available: boolean;
    user_name: string;
    user_email: string;
    user_phone: string;
    total_earnings: string;
  }>(
    `SELECT
       a.id,
       a.user_id,
       a.rating::text AS rating,
       a.is_verified,
       a.is_available,
       u.name AS user_name,
       u.email AS user_email,
       u.phone AS user_phone,
       COALESCE(e.sum_amount, 0)::text AS total_earnings
     FROM astrologers a
     INNER JOIN users u ON u.id = a.user_id
     LEFT JOIN (
       SELECT astrologer_id, SUM(amount) AS sum_amount
       FROM astrologer_earnings_log
       GROUP BY astrologer_id
     ) e ON e.astrologer_id = a.id
     WHERE TRUE ${listFilter}
     ORDER BY u.name ASC
     ${limitSql}`,
    listParams
  );

  res.json({
    success: true,
    data: {
      astrologers: result.rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        phone: row.user_phone,
        rating: row.rating != null ? Number(row.rating) : null,
        is_verified: row.is_verified,
        is_available: row.is_available,
        total_earnings: Number(row.total_earnings),
      })),
      page,
      limit,
      total,
    },
  });
});

router.post("/astrologers/:id/verify", async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid astrologer id",
    });
    return;
  }

  const { id } = parsed.data;
  const updated = await query<{ id: string }>(
    `UPDATE astrologers SET is_verified = true WHERE id = $1 RETURNING id`,
    [id]
  );

  if (!updated.rows[0]) {
    res.status(404).json({ success: false, error: "Astrologer not found" });
    return;
  }

  res.json({ success: true, data: { astrologerId: id, is_verified: true } });
});

router.post("/astrologers/:id/suspend", async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid astrologer id",
    });
    return;
  }

  const { id } = parsed.data;
  const updated = await query<{ id: string }>(
    `UPDATE astrologers
     SET is_verified = false, is_available = false
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (!updated.rows[0]) {
    res.status(404).json({ success: false, error: "Astrologer not found" });
    return;
  }

  res.json({
    success: true,
    data: { astrologerId: id, is_verified: false, is_available: false },
  });
});

export { router as adminAstrologersRouter };
