import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { pool, query } from "../db/index.js";
import { notifyWalletCredited } from "../services/pushNotifications.js";
import { idParamSchema, paginationQuery } from "./adminShared.js";

const router = Router();

const usersQuery = paginationQuery.extend({
  search: z.string().optional(),
});

router.get("/users", async (req: Request, res: Response) => {
  const parsed = usersQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid query",
    });
    return;
  }

  const { page, limit, search } = parsed.data;
  const offset = (page - 1) * limit;

  const searchCond = search ? `AND u.phone ILIKE $1` : "";
  const searchParam = search ? [`%${search}%`] : [];

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users u WHERE TRUE ${searchCond}`,
    searchParam
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const listSql = `SELECT
       u.id,
       u.name,
       u.phone,
       u.wallet_balance::text AS wallet_balance,
       u.is_suspended,
       u.created_at,
       COALESCE(s.spent, 0)::text AS total_spent
     FROM users u
     LEFT JOIN (
       SELECT user_id, SUM(amount) AS spent
       FROM transactions
       WHERE type = 'deduction' AND status = 'success'
       GROUP BY user_id
     ) s ON s.user_id = u.id
     WHERE TRUE ${searchCond}
     ORDER BY u.created_at DESC
     LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

  const listParams = search
    ? [`%${search}%`, limit, offset]
    : [limit, offset];

  const result = await query<{
    id: string;
    name: string;
    phone: string;
    wallet_balance: string;
    is_suspended: boolean;
    created_at: Date;
    total_spent: string;
  }>(listSql, listParams);

  res.json({
    success: true,
    data: {
      users: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        wallet_balance: Number(row.wallet_balance),
        total_spent: Number(row.total_spent),
        is_suspended: row.is_suspended,
        join_date: row.created_at,
      })),
      page,
      limit,
      total,
    },
  });
});

router.post("/users/:id/suspend", async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid user id",
    });
    return;
  }

  const { id } = parsed.data;
  const updated = await query<{ id: string }>(
    `UPDATE users SET is_suspended = true WHERE id = $1 RETURNING id`,
    [id]
  );

  if (!updated.rows[0]) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  res.json({ success: true, data: { userId: id, is_suspended: true } });
});

router.post("/users/:id/unsuspend", async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid user id",
    });
    return;
  }

  const { id } = parsed.data;
  const updated = await query<{ id: string }>(
    `UPDATE users SET is_suspended = false WHERE id = $1 RETURNING id`,
    [id]
  );

  if (!updated.rows[0]) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  res.json({ success: true, data: { userId: id, is_suspended: false } });
});

const walletAdjustmentBody = z.object({
  amount: z.number().positive(),
  direction: z.enum(["credit", "debit"]),
  reason: z.string().trim().min(10).max(500),
});

router.post("/users/:id/wallet-adjustment", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid user id" });
    return;
  }

  const bodyParsed = walletAdjustmentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({
      success: false,
      error: bodyParsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const adminId = req.user?.userId;
  if (!adminId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const { id: userId } = idParsed.data;
  const { direction, reason } = bodyParsed.data;
  const amount = Math.round(bodyParsed.data.amount * 100) / 100;
  if (amount <= 0) {
    res.status(400).json({ success: false, error: "Amount must be greater than 0" });
    return;
  }

  const txType = direction === "credit" ? "admin_credit" : "admin_debit";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query<{ id: string; wallet_balance: string }>(
      `SELECT id, wallet_balance::text AS wallet_balance
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const currentBalance = Number(user.wallet_balance);
    if (direction === "debit" && currentBalance < amount) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        error: "Insufficient wallet balance",
      });
      return;
    }

    const updated =
      direction === "credit"
        ? await client.query<{ wallet_balance: string }>(
            `UPDATE users
             SET wallet_balance = wallet_balance + $1::numeric
             WHERE id = $2
             RETURNING wallet_balance::text AS wallet_balance`,
            [amount, userId]
          )
        : await client.query<{ wallet_balance: string }>(
            `UPDATE users
             SET wallet_balance = wallet_balance - $1::numeric
             WHERE id = $2 AND wallet_balance >= $1::numeric
             RETURNING wallet_balance::text AS wallet_balance`,
            [amount, userId]
          );

    if (!updated.rows[0]) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        error: "Insufficient wallet balance",
      });
      return;
    }

    await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, status, reason, performed_by_admin_id)
       VALUES ($1, $2::transaction_type, $3, 'success', $4, $5)`,
      [userId, txType, amount, reason, adminId]
    );

    await client.query("COMMIT");

    const newWalletBalance = Number(updated.rows[0].wallet_balance);

    if (direction === "credit") {
      void notifyWalletCredited({
        userId,
        amount,
        newBalance: newWalletBalance,
      }).catch((err) =>
        console.error("[Push] Failed to notify admin wallet credit:", err)
      );
    }

    res.json({
      success: true,
      data: {
        userId,
        direction,
        amount,
        type: txType,
        wallet_balance: newWalletBalance,
      },
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("admin wallet-adjustment failed:", e);
    res.status(500).json({ success: false, error: "Could not adjust wallet" });
  } finally {
    client.release();
  }
});

export { router as adminUsersRouter };
