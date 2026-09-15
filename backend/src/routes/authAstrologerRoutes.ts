import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { pool, query } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { getSocketServer } from "../socket/io.js";
import { jwtSecret } from "./authOtpCache.js";
import { sendResetLinkEmail } from "./authOtpDelivery.js";
import {
  emailSchema,
  forgotPasswordBody,
  phoneSchema,
  resetPasswordBody,
} from "./authPhone.js";

const router = Router();

const astrologerLoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
const astrologerSpecializationOptions = [
  "Love & Relationship",
  "Career",
  "Finance",
  "Vastu",
  "Numerology",
  "Tarot",
  "Palmistry",
  "Vedic Astrology",
] as const;

const astrologerLanguageOptions = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
  "Gujarati",
] as const;

const astrologerRegisterBody = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  experience: z.coerce.number().int().min(0, "Experience must be >= 0"),
  specializations: z
    .array(z.enum(astrologerSpecializationOptions))
    .min(1, "Select at least one specialization"),
  languages: z
    .array(z.enum(astrologerLanguageOptions))
    .min(1, "Select at least one language"),
  ratePerMinute: z
    .coerce.number()
    .int()
    .min(5, "Rate per minute must be at least 5")
    .max(500, "Rate per minute must be at most 500"),
  bio: z.string().max(300).optional(),
});
router.post("/astrologer/login", async (req: Request, res: Response) => {
  const parsed = astrologerLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const { email, password } = parsed.data;

  type LoginRow = {
    user_id: string;
    password_hash: string | null;
    astrologer_id: string;
    bio: string | null;
    specializations: string[];
    languages: string[];
    avg_rating: string | null;
    total_reviews: number;
    price_per_minute: string | null;
    is_available: boolean;
    is_online: boolean;
    is_verified: boolean;
    experience_years: number | null;
    u_email: string;
    u_name: string;
    u_phone: string;
    u_avatar_url: string | null;
    u_profile_photo_url: string | null;
    a_profile_photo_url: string | null;
  };

  const result = await query<LoginRow>(
    `SELECT
       a.id AS astrologer_id,
       a.user_id,
       a.bio,
       a.specializations,
       a.languages,
       a.avg_rating,
       a.total_reviews,
       a.price_per_minute,
       a.is_available,
       a.is_online,
       a.is_verified,
       a.experience_years,
       u.password_hash,
       u.email AS u_email,
       u.name AS u_name,
       u.phone AS u_phone,
       u.avatar_url AS u_avatar_url,
       u.profile_photo_url AS u_profile_photo_url,
       a.profile_photo_url AS a_profile_photo_url
     FROM users u
     INNER JOIN astrologers a ON a.user_id = u.id
     WHERE u.email = $1`,
    [email]
  );

  const row = result.rows[0];
  if (!row?.password_hash) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  if (!row.is_verified) {
    res.status(403).json({
      success: false,
      error:
        "Your account is pending approval. Please wait for admin review.",
    });
    return;
  }

  const token = jwt.sign(
    { userId: row.user_id, role: "astrologer", is_approved: row.is_verified },
    jwtSecret(),
    { expiresIn: "30d", }
  );

  await query(
    `UPDATE astrologers
     SET is_online = true
     WHERE user_id = $1`,
    [row.user_id]
  );
  try {
    getSocketServer().emit("astrologer_status_changed", {
      astrologerId: row.astrologer_id,
      is_online: true,
    });
  } catch {
    // socket may be unavailable in tests
  }

  const astrologer = {
    id: row.astrologer_id,
    user_id: row.user_id,
    bio: row.bio,
    specializations: row.specializations,
    languages: row.languages,
    rating: row.avg_rating != null ? Number(row.avg_rating) : null,
    total_reviews: row.total_reviews,
    price_per_minute:
      row.price_per_minute != null ? Number(row.price_per_minute) : null,
    is_available: row.is_available,
    is_online: true,
    is_approved: row.is_verified,
    is_verified: row.is_verified,
    experience_years: row.experience_years,
    user: {
      email: row.u_email,
      name: row.u_name,
      phone: row.u_phone,
      avatar_url: row.u_avatar_url,
      profile_photo_url:
        row.a_profile_photo_url ?? row.u_profile_photo_url ?? null,
    },
  };

  res.json({
    success: true,
    data: { token, astrologer },
  });
});

router.post("/astrologer/logout", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId || req.user?.role !== "astrologer") {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const statusResult = await query<{ id: string }>(
    `UPDATE astrologers
     SET is_online = false
     WHERE user_id = $1
     RETURNING id`,
    [userId]
  );
  const astrologerId = statusResult.rows[0]?.id;
  if (astrologerId) {
    try {
      getSocketServer().emit("astrologer_status_changed", {
        astrologerId,
        is_online: false,
      });
    } catch {
      // socket may be unavailable in tests
    }
  }

  res.json({ success: true });
});

router.post("/astrologer/forgot-password", async (req: Request, res: Response) => {
  const parsed = forgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  type AstrologerResetRow = {
    id: string;
    email: string;
  };

  const result = await query<AstrologerResetRow>(
    `SELECT u.id, u.email
     FROM users u
     INNER JOIN astrologers a ON a.user_id = u.id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [parsed.data.email]
  );

  const user = result.rows[0];
  if (!user) {
    res.status(404).json({ success: false, error: "No account found" });
    return;
  }

  try {
    await sendResetLinkEmail(user.email, "/astrologer/reset-password", user.id);
  } catch (e) {
    console.error("Astrologer password reset email failed:", e);
    res.status(500).json({ success: false, error: "Failed to send reset link" });
    return;
  }

  res.json({ success: true, message: "Reset link sent" });
});

router.post("/astrologer/reset-password", async (req: Request, res: Response) => {
  const parsed = resetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  type ResetTokenRow = {
    id: string;
    user_id: string;
  };

  const tokenResult = await query<ResetTokenRow>(
    `SELECT prt.id, prt.user_id
     FROM password_reset_tokens prt
     INNER JOIN astrologers a ON a.user_id = prt.user_id
     WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
     LIMIT 1`,
    [parsed.data.token]
  );

  const resetToken = tokenResult.rows[0];
  if (!resetToken) {
    res.status(400).json({ success: false, error: "Invalid or expired token" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2`,
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      `UPDATE password_reset_tokens
       SET used = true
       WHERE id = $1`,
      [resetToken.id]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Astrologer password reset failed:", e);
    res.status(500).json({ success: false, error: "Could not reset password" });
    return;
  } finally {
    client.release();
  }

  res.json({ success: true, message: "Password reset successfully" });
});

router.post("/astrologer/register", async (req: Request, res: Response) => {
  const parsed = astrologerRegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const {
    name,
    email,
    phone,
    password,
    experience,
    specializations,
    languages,
    ratePerMinute,
    bio,
  } = parsed.data;

  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );

  if (existing.rows[0]) {
    res.status(409).json({ success: false, error: "Email already registered" });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const created = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, email, phone, password_hash]
    );

    const userId = created.rows[0]?.id;
    if (!userId) {
      await client.query("ROLLBACK");
      res.status(500).json({ success: false, error: "Could not create user" });
      return;
    }

    await client.query(
      `INSERT INTO astrologers (
         user_id,
         price_per_minute,
         experience_years,
         specializations,
         languages,
         bio,
         is_verified,
         is_available
       )
       VALUES ($1, $2, $3, $4, $5, $6, false, false)`,
      [
        userId,
        ratePerMinute,
        experience,
        specializations,
        languages,
        bio && bio.trim().length > 0 ? bio.trim() : null,
      ]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Application submitted",
      userId,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("astrologer register failed:", e);
    res.status(500).json({ success: false, error: "Could not submit application" });
  } finally {
    client.release();
  }
});

export { router as authAstrologerRouter };
