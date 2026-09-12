import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import streamifier from "streamifier";
import { z } from "zod";

import { pool, query } from "../db/index.js";
import { cloudinary } from "../lib/cloudinary.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { embedText, embeddingToVectorLiteral } from "../lib/aiProvider.js";
import { notifyWalletCredited } from "../services/pushNotifications.js";

const router = Router();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "divinemarg/ai-astrologers", resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

const jwtSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error("JWT_SECRET is not set");
  }
  return s;
};

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const { email, password } = parsed.data;

  type AdminRow = {
    id: string;
    email: string;
    password_hash: string;
    role: string;
  };

  const result = await query<AdminRow>(
    `SELECT id, email, password_hash, role::text AS role
     FROM admins WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  const admin = result.rows[0];
  if (!admin) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { userId: admin.id, role: admin.role },
    jwtSecret(),
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    data: {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    },
  });
});

router.use(authMiddleware);
router.use(requireAdmin);

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get("/stats", async (_req: Request, res: Response) => {
  const [usersCount, astrologersCount, revenueRow, sessionsCount] =
    await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM users`
      ).then((r) => Number(r.rows[0]?.count ?? 0)),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM astrologers`
      ).then((r) => Number(r.rows[0]?.count ?? 0)),
      query<{ sum: string | null }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS sum
         FROM transactions
         WHERE type = 'recharge' AND status = 'success'`
      ).then((r) => Number(r.rows[0]?.sum ?? 0)),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM chat_sessions WHERE status = 'active'`
      ).then((r) => Number(r.rows[0]?.count ?? 0)),
    ]);

  res.json({
    success: true,
    data: {
      totalUsers: usersCount,
      totalAstrologers: astrologersCount,
      totalRevenue: revenueRow,
      activeSessions: sessionsCount,
    },
  });
});

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

const idParamSchema = z.object({
  id: z.string().uuid(),
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

const aiAstrologerBody = z.object({
  name: z.string().min(1, "Name is required"),
  photo_url: z.string().url().optional().nullable(),
  emoji: z.string().min(1).max(8).default("🔮"),
  tagline: z.string().default(""),
  rate_per_min: z.number().positive("Rate must be positive"),
  personality_prompt: z.string().min(20, "Personality prompt is required"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

router.get("/ai-astrologers", async (_req: Request, res: Response) => {
  const result = await query<{
    id: string;
    name: string;
    photo_url: string | null;
    emoji: string;
    tagline: string;
    rate_per_min: string;
    personality_prompt: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
  }>(
    `SELECT id, name, photo_url, emoji, tagline, rate_per_min::text, personality_prompt, is_active, sort_order, created_at
     FROM ai_astrologers
     ORDER BY sort_order ASC, created_at ASC`
  );

  res.json({
    success: true,
    data: {
      astrologers: result.rows.map((row) => ({
        ...row,
        rate_per_min: Number(row.rate_per_min),
      })),
    },
  });
});

router.post("/ai-astrologers", async (req: Request, res: Response) => {
  const parsed = aiAstrologerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }
  const b = parsed.data;
  const inserted = await query<{ id: string }>(
    `INSERT INTO ai_astrologers (name, photo_url, emoji, tagline, rate_per_min, personality_prompt, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [b.name, b.photo_url ?? null, b.emoji, b.tagline, b.rate_per_min, b.personality_prompt, b.is_active, b.sort_order]
  );

  res.json({ success: true, data: { id: inserted.rows[0]?.id } });
});

router.put("/ai-astrologers/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid astrologer id" });
    return;
  }
  const bodyParsed = aiAstrologerBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({
      success: false,
      error: bodyParsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }
  const { id } = idParsed.data;
  const b = bodyParsed.data;

  const updated = await query<{ id: string }>(
    `UPDATE ai_astrologers
     SET name = $1, photo_url = $2, emoji = $3, tagline = $4, rate_per_min = $5,
         personality_prompt = $6, is_active = $7, sort_order = $8, updated_at = now()
     WHERE id = $9
     RETURNING id`,
    [b.name, b.photo_url ?? null, b.emoji, b.tagline, b.rate_per_min, b.personality_prompt, b.is_active, b.sort_order, id]
  );

  if (!updated.rows[0]) {
    res.status(404).json({ success: false, error: "AI astrologer not found" });
    return;
  }

  res.json({ success: true, data: { id } });
});

router.delete("/ai-astrologers/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid astrologer id" });
    return;
  }
  const { id } = idParsed.data;

  const deleted = await query<{ id: string }>(
    `DELETE FROM ai_astrologers WHERE id = $1 RETURNING id`,
    [id]
  );

  if (!deleted.rows[0]) {
    res.status(404).json({ success: false, error: "AI astrologer not found" });
    return;
  }

  res.json({ success: true, data: { id } });
});

router.post(
  "/ai-astrologers/upload-photo",
  (req: Request, res: Response, next) => {
    photoUpload.single("photo")(req, res, (err: unknown) => {
      if (err) {
        const isMulterSizeError =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: string }).code === "LIMIT_FILE_SIZE";
        res.status(400).json({
          success: false,
          error: isMulterSizeError
            ? "Image is too large. Please upload a photo under 5MB."
            : "Invalid image file. Please use JPEG, PNG, or WebP.",
        });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }
    try {
      const url = await uploadToCloudinary(req.file.buffer);
      res.json({ success: true, data: { url } });
    } catch (e) {
      console.error("[AdminAiAstrologers] Cloudinary upload failed:", e);
      res.status(500).json({ success: false, error: "Photo upload failed" });
    }
  }
);

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

router.get("/settings", async (_req: Request, res: Response) => {
  const result = await query<{ key: string; value: string | null }>(
    `SELECT key, value FROM platform_settings`
  );

  const settings: Record<string, string | null> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  res.json({ success: true, data: { settings } });
});

const settingsPutBody = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()])
);

router.put("/settings", async (req: Request, res: Response) => {
  const parsed = settingsPutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const entries = Object.entries(parsed.data).map(([key, value]) => [
    key,
    value === null || value === undefined ? null : String(value),
  ]) as [string, string | null][];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of entries) {
      await client.query(
        `INSERT INTO platform_settings (key, value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, value]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("admin settings update failed:", e);
    res.status(500).json({ success: false, error: "Could not save settings" });
    return;
  } finally {
    client.release();
  }

  const result = await query<{ key: string; value: string | null }>(
    `SELECT key, value FROM platform_settings`
  );

  const settings: Record<string, string | null> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  res.json({ success: true, data: { settings } });
});

const knowledgeListQuery = paginationQuery.extend({
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

const knowledgeBody = z.object({
  category: z.string().trim().min(1).max(80),
  question: z.string().trim().min(3).max(2000),
  answer: z.string().trim().min(3).max(20000),
  is_active: z.boolean().optional().default(true),
});

const knowledgePatchBody = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  question: z.string().trim().min(3).max(2000).optional(),
  answer: z.string().trim().min(3).max(20000).optional(),
  is_active: z.boolean().optional(),
});

router.get("/knowledge-base", async (req: Request, res: Response) => {
  const parsed = knowledgeListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid query",
    });
    return;
  }

  const { page, limit, category, search } = parsed.data;
  const offset = (page - 1) * limit;
  const conditions: string[] = ["TRUE"];
  const params: unknown[] = [];
  let p = 1;

  if (category) {
    conditions.push(`category = $${p++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(question ILIKE $${p} OR answer ILIKE $${p} OR category ILIKE $${p})`);
    params.push(`%${search}%`);
    p += 1;
  }

  const whereSql = conditions.join(" AND ");

  try {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM knowledge_base WHERE ${whereSql}`,
      params
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const categoriesResult = await query<{ category: string }>(
      `SELECT DISTINCT category FROM knowledge_base ORDER BY category ASC`
    );

    const listParams = [...params, limit, offset];
    const result = await query<{
      id: string;
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
      has_embedding: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, category, question, answer, is_active,
              (embedding IS NOT NULL) AS has_embedding,
              created_at, updated_at
       FROM knowledge_base
       WHERE ${whereSql}
       ORDER BY updated_at DESC
       LIMIT $${p++} OFFSET $${p}`,
      listParams
    );

    res.json({
      success: true,
      data: {
        entries: result.rows,
        categories: categoriesResult.rows.map((row) => row.category),
        page,
        limit,
        total,
      },
    });
  } catch (e) {
    console.error("admin knowledge-base list failed:", e);
    res.status(500).json({
      success: false,
      error: "Could not load knowledge base (has the pgvector migration been run?)",
    });
  }
});

router.post("/knowledge-base", async (req: Request, res: Response) => {
  const parsed = knowledgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const { category, question, answer, is_active } = parsed.data;
  try {
    const embedding = await embedText(question);
    const inserted = await query<{
      id: string;
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO knowledge_base (category, question, answer, embedding, is_active)
       VALUES ($1, $2, $3, $4::vector, $5)
       RETURNING id, category, question, answer, is_active, created_at, updated_at`,
      [category, question, answer, embeddingToVectorLiteral(embedding), is_active]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (e) {
    console.error("admin knowledge-base create failed:", e);
    res.status(500).json({ success: false, error: "Could not create knowledge entry" });
  }
});

router.put("/knowledge-base/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid knowledge entry id" });
    return;
  }
  const bodyParsed = knowledgePatchBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({
      success: false,
      error: bodyParsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const existing = await query<{
    id: string;
    category: string;
    question: string;
    answer: string;
    is_active: boolean;
  }>(
    `SELECT id, category, question, answer, is_active FROM knowledge_base WHERE id = $1`,
    [idParsed.data.id]
  );
  const row = existing.rows[0];
  if (!row) {
    res.status(404).json({ success: false, error: "Knowledge entry not found" });
    return;
  }

  const next = {
    category: bodyParsed.data.category ?? row.category,
    question: bodyParsed.data.question ?? row.question,
    answer: bodyParsed.data.answer ?? row.answer,
    is_active: bodyParsed.data.is_active ?? row.is_active,
  };
  const questionChanged = next.question !== row.question;
  const answerChanged = next.answer !== row.answer;

  try {
    let embeddingLiteral: string | null = null;
    if (questionChanged || answerChanged) {
      embeddingLiteral = embeddingToVectorLiteral(await embedText(next.question));
    }

    const updated = await query<{
      id: string;
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      embeddingLiteral
        ? `UPDATE knowledge_base
           SET category = $1, question = $2, answer = $3, is_active = $4,
               embedding = $5::vector, updated_at = now()
           WHERE id = $6
           RETURNING id, category, question, answer, is_active, created_at, updated_at`
        : `UPDATE knowledge_base
           SET category = $1, question = $2, answer = $3, is_active = $4, updated_at = now()
           WHERE id = $5
           RETURNING id, category, question, answer, is_active, created_at, updated_at`,
      embeddingLiteral
        ? [next.category, next.question, next.answer, next.is_active, embeddingLiteral, idParsed.data.id]
        : [next.category, next.question, next.answer, next.is_active, idParsed.data.id]
    );

    res.json({ success: true, data: updated.rows[0] });
  } catch (e) {
    console.error("admin knowledge-base update failed:", e);
    res.status(500).json({ success: false, error: "Could not update knowledge entry" });
  }
});

router.delete("/knowledge-base/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid knowledge entry id" });
    return;
  }

  const deleted = await query<{ id: string }>(
    `DELETE FROM knowledge_base WHERE id = $1 RETURNING id`,
    [idParsed.data.id]
  );
  if (!deleted.rows[0]) {
    res.status(404).json({ success: false, error: "Knowledge entry not found" });
    return;
  }

  res.json({ success: true, data: { id: deleted.rows[0].id } });
});

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

export { router as adminRouter };
