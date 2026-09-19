import { Cashfree, CFEnvironment } from "cashfree-pg";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { pool, query } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { notifyWalletCredited } from "../services/pushNotifications.js";

const router = Router();

router.use(authMiddleware);
router.use((req: Request, res: Response, next) => {
  const role = req.user?.role;
  if (role === "astrologer" || role === "admin" || role === "superadmin") {
    res.status(403).json({
      success: false,
      error: "Wallet recharge is only available to end users",
    });
    return;
  }
  next();
});

function cashfreeMode(): "sandbox" | "production" {
  return process.env.CASHFREE_ENV === "SANDBOX" ? "sandbox" : "production";
}

function cashfreeEnvironment(): CFEnvironment {
  return cashfreeMode() === "sandbox"
    ? CFEnvironment.SANDBOX
    : CFEnvironment.PRODUCTION;
}

function getCashfree(): Cashfree {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    throw new Error("CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required");
  }
  return new Cashfree(cashfreeEnvironment(), appId, secret);
}

export function getCashfreeWebhookVerifier(): Cashfree {
  const appId = process.env.CASHFREE_APP_ID ?? "";
  const secret =
    process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "CASHFREE_WEBHOOK_SECRET or CASHFREE_SECRET_KEY is required"
    );
  }
  return new Cashfree(cashfreeEnvironment(), appId, secret);
}

export type CreditCashfreeResult =
  | { ok: false; reason: "not_found" }
  | {
      ok: true;
      alreadyCredited: boolean;
      credited: number;
      wallet_balance: number;
      userId: string;
    };

export async function creditCashfreeRechargeIfPending(opts: {
  cashfreeOrderId: string;
  cashfreePaymentId?: string | null;
  userId?: string;
}): Promise<CreditCashfreeResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const txResult = await client.query<{
      id: string;
      user_id: string;
      amount: string;
      status: string;
    }>(
      opts.userId
        ? `SELECT id, user_id, amount, status FROM transactions
           WHERE cashfree_order_id = $1 AND user_id = $2
           FOR UPDATE`
        : `SELECT id, user_id, amount, status FROM transactions
           WHERE cashfree_order_id = $1
           FOR UPDATE`,
      opts.userId
        ? [opts.cashfreeOrderId, opts.userId]
        : [opts.cashfreeOrderId]
    );

    const tx = txResult.rows[0];
    if (!tx) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_found" };
    }

    const creditAmount = Number(tx.amount);

    const balResult = await client.query<{ wallet_balance: string }>(
      `SELECT wallet_balance FROM users WHERE id = $1`,
      [tx.user_id]
    );
    const currentBalance = Number(balResult.rows[0]?.wallet_balance ?? 0);

    if (tx.status === "success") {
      await client.query("COMMIT");
      return {
        ok: true,
        alreadyCredited: true,
        credited: creditAmount,
        wallet_balance: currentBalance,
        userId: tx.user_id,
      };
    }

    if (tx.status !== "pending") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_found" };
    }

    await client.query(
      `UPDATE users
       SET wallet_balance = wallet_balance + $1::numeric
       WHERE id = $2`,
      [creditAmount, tx.user_id]
    );

    await client.query(
      `UPDATE transactions
       SET status = 'success',
           cashfree_payment_id = COALESCE($1, cashfree_payment_id)
       WHERE id = $2`,
      [opts.cashfreePaymentId ?? null, tx.id]
    );

    await client.query("COMMIT");

    const newBalResult = await query<{ wallet_balance: string }>(
      `SELECT wallet_balance FROM users WHERE id = $1`,
      [tx.user_id]
    );
    const newWalletBalance = Number(newBalResult.rows[0]?.wallet_balance ?? 0);

    void notifyWalletCredited({
      userId: tx.user_id,
      amount: creditAmount,
      newBalance: newWalletBalance,
    }).catch((err) =>
      console.error("[Push] Failed to notify wallet credit:", err)
    );

    return {
      ok: true,
      alreadyCredited: false,
      credited: creditAmount,
      wallet_balance: newWalletBalance,
      userId: tx.user_id,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

const createOrderBody = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default("INR"),
});

router.post("/create-order", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = createOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  let cf: Cashfree;
  try {
    cf = getCashfree();
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Payment provider misconfigured" });
    return;
  }

  const { amount, currency } = parsed.data;
  if (amount < 1) {
    res.status(400).json({
      success: false,
      error: "Minimum recharge amount is 1 INR",
    });
    return;
  }

  const userResult = await query<{
    phone: string;
    email: string | null;
    name: string | null;
  }>(`SELECT phone, email, name FROM users WHERE id = $1`, [userId]);
  const user = userResult.rows[0];
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const phoneDigits = user.phone.replace(/\D/g, "").slice(-10);
  if (phoneDigits.length !== 10) {
    res.status(400).json({ success: false, error: "A valid phone number is required" });
    return;
  }

  const orderId = `rc_${userId.replace(/-/g, "").slice(0, 12)}_${Date.now()}`.slice(
    0,
    40
  );

  let order: {
    order_id?: string;
    payment_session_id?: string;
    order_amount?: number;
    order_currency?: string;
  };
  try {
    const created = await cf.PGCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: userId.replace(/-/g, ""),
        customer_phone: phoneDigits,
        ...(user.email ? { customer_email: user.email } : {}),
        ...(user.name ? { customer_name: user.name } : {}),
      },
      order_tags: { user_id: userId },
    });
    order = created.data;
  } catch (e) {
    console.error("Cashfree order failed:", e);
    res.status(502).json({ success: false, error: "Could not create payment order" });
    return;
  }

  const cashfreeOrderId = order.order_id;
  const paymentSessionId = order.payment_session_id;
  if (!cashfreeOrderId || !paymentSessionId) {
    res.status(502).json({ success: false, error: "Could not create payment order" });
    return;
  }

  await query(
    `INSERT INTO transactions (user_id, type, amount, cashfree_order_id, status)
     VALUES ($1, 'recharge', $2, $3, 'pending')`,
    [userId, amount, cashfreeOrderId]
  );

  res.status(201).json({
    success: true,
    data: {
      orderId: cashfreeOrderId,
      paymentSessionId,
      amount: order.order_amount ?? amount,
      currency: order.order_currency ?? currency,
      mode: cashfreeMode(),
    },
  });
});

const verifyPaymentBody = z.object({
  orderId: z.string().min(1),
});

router.post("/verify-payment", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = verifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const { orderId } = parsed.data;

  let cf: Cashfree;
  try {
    cf = getCashfree();
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Payment provider misconfigured" });
    return;
  }

  let orderStatus: string | undefined;
  let paymentId: string | null = null;
  try {
    const fetched = await cf.PGFetchOrder(orderId);
    orderStatus = fetched.data.order_status;
    const payments = fetched.data as { payments?: { cf_payment_id?: string }[] };
    paymentId = payments.payments?.[0]?.cf_payment_id ?? null;
  } catch (e) {
    console.error("Cashfree fetch order failed:", e);
    res.status(502).json({ success: false, error: "Could not verify payment" });
    return;
  }

  if (orderStatus !== "PAID") {
    res.status(400).json({ success: false, error: "Payment not completed yet" });
    return;
  }

  try {
    const result = await creditCashfreeRechargeIfPending({
      cashfreeOrderId: orderId,
      cashfreePaymentId: paymentId,
      userId,
    });

    if (!result.ok) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        credited: result.credited,
        wallet_balance: result.wallet_balance,
      },
    });
  } catch (e) {
    console.error("verify-payment transaction failed:", e);
    res.status(500).json({ success: false, error: "Could not complete payment" });
  }
});

const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get("/transactions", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsed = transactionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid query",
    });
    return;
  }

  const { page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM transactions WHERE user_id = $1`,
    [userId]
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const result = await query<{
    id: string;
    type: string;
    amount: string;
    status: string;
    created_at: Date;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    cashfree_order_id: string | null;
    cashfree_payment_id: string | null;
  }>(
    `SELECT id, type, amount, status, created_at, razorpay_order_id, razorpay_payment_id,
            cashfree_order_id, cashfree_payment_id
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  res.json({
    success: true,
    data: {
      transactions: result.rows.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
      page,
      limit,
      total,
    },
  });
});

export { router as walletRouter };
