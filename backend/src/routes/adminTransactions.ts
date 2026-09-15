import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { query } from "../db/index.js";
import { paginationQuery } from "./adminShared.js";

const router = Router();

const transactionsListQuery = paginationQuery.extend({
  limit: z.coerce.number().int().min(1).max(10000).default(20),
  status: z.enum(["pending", "success", "failed"]).optional(),
  type: z.enum(["recharge", "deduction", "refund", "admin_credit", "admin_debit"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

router.get("/transactions", async (req: Request, res: Response) => {
  const parsed = transactionsListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid query",
    });
    return;
  }

  const { page, limit, status, type, from, to } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = ["TRUE"];
  const params: unknown[] = [];
  let p = 1;

  if (status) {
    conditions.push(`t.status = $${p++}`);
    params.push(status);
  }
  if (type) {
    conditions.push(`t.type = $${p++}`);
    params.push(type);
  }
  if (from) {
    conditions.push(`t.created_at >= $${p++}::date`);
    params.push(from);
  }
  if (to) {
    conditions.push(`t.created_at < ($${p++}::date + interval '1 day')`);
    params.push(to);
  }

  const whereSql = conditions.join(" AND ");

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM transactions t
     INNER JOIN users u ON u.id = t.user_id
     WHERE ${whereSql}`,
    params
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const listParams = [...params, limit, offset];
  const limIdx = p++;
  const offIdx = p;

  const result = await query<{
    id: string;
    user_id: string;
    user_phone: string;
    type: string;
    amount: string;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    cashfree_order_id: string | null;
    cashfree_payment_id: string | null;
    status: string;
    created_at: Date;
  }>(
    `SELECT
       t.id,
       t.user_id,
       u.phone AS user_phone,
       t.type::text AS type,
       t.amount::text AS amount,
       t.razorpay_order_id,
       t.razorpay_payment_id,
       t.cashfree_order_id,
       t.cashfree_payment_id,
       t.status::text AS status,
       t.created_at
     FROM transactions t
     INNER JOIN users u ON u.id = t.user_id
     WHERE ${whereSql}
     ORDER BY t.created_at DESC
     LIMIT $${limIdx} OFFSET $${offIdx}`,
    listParams
  );

  res.json({
    success: true,
    data: {
      transactions: result.rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        user_phone: row.user_phone,
        type: row.type,
        amount: Number(row.amount),
        razorpay_order_id: row.razorpay_order_id,
        razorpay_payment_id: row.razorpay_payment_id,
        cashfree_order_id: row.cashfree_order_id,
        cashfree_payment_id: row.cashfree_payment_id,
        status: row.status,
        created_at: row.created_at,
      })),
      page,
      limit,
      total,
    },
  });
});

export { router as adminTransactionsRouter };
