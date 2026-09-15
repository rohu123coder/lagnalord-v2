import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { pool, query } from "../db/index.js";
import { sendEmailOTP } from "../lib/email.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  OTP_TTL_SEC,
  MASTER_OTP,
  cacheDel,
  cacheGet,
  cacheSet,
  generateOtp,
  jwtSecret,
} from "./authOtpCache.js";
import { sendResetLinkEmail, sendSmsOTP } from "./authOtpDelivery.js";
import {
  emailSchema,
  forgotPasswordBody,
  normalizeIndianPhone,
  phoneSchema,
  phoneSearchVariants,
  resetPasswordBody,
  toPublicUser,
} from "./authPhone.js";

const router = Router();

const registerBody = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

const sendOtpBody = z
  .object({
    phone: z.string().min(8).max(22).optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => Boolean(data.phone || data.email), {
    message: "Provide phone or email",
    path: ["phone"],
  })
  .refine((data) => !(data.phone && data.email), {
    message: "Provide either phone or email",
    path: ["phone"],
  });

const verifyOtpBody = z
  .object({
    identifier: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    otp: z.string().regex(/^\d{4,6}$/, "OTP must be 4–6 digits"),
    isRegistration: z.boolean().optional(),
  })
  .refine(
    (d) => Boolean((d.identifier?.trim() ?? "") || (d.phone?.trim() ?? "") || (d.email?.trim() ?? "")),
    { message: "Provide identifier, phone, or email", path: ["identifier"] }
  );
router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const { name, phone, email, password } = parsed.data;

  type ExistingRow = { phone: string; email: string };
  const existing = email
    ? await query<ExistingRow>(
        "SELECT phone, email FROM users WHERE phone = $1 OR email = $2 LIMIT 1",
        [phone, email]
      )
    : await query<ExistingRow>(
        "SELECT phone, email FROM users WHERE phone = $1 LIMIT 1",
        [phone]
      );

  if (existing.rows[0]) {
    res.status(400).json({ success: false, error: "Phone/Email already registered" });
    return;
  }

  const otp = generateOtp();
  const password_hash = password ? await bcrypt.hash(password, 10) : null;
  const phoneNorm = normalizeIndianPhone(phone);
  const key = `otp:reg:${phoneNorm}`;

  try {
    await cacheSet(
      key,
      JSON.stringify({ otp, name, phone, email: email ?? null, password_hash }),
      OTP_TTL_SEC
    );
  } catch (e) {
    console.error("Redis set registration OTP failed:", e);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
    return;
  }

  const deliveries = [sendSmsOTP(phone, otp)];
  if (email) deliveries.push(sendEmailOTP(email, otp));
  Promise.all(deliveries).catch((e) => {
    console.error("OTP delivery failed (background):", e);
  });

  res.json({
    success: true,
    message: "OTP sent to your phone and email",
  });
});

router.post("/send-otp", async (req: Request, res: Response) => {
  const parsed = sendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        parsed.error.flatten().fieldErrors.phone?.[0] ??
        "Invalid body",
    });
    return;
  }

  type LoginUserRow = {
    id: string;
    name: string;
    phone: string;
    email: string;
    avatar_url: string | null;
    wallet_balance: string;
  };

  const byPhone = Boolean(parsed.data.phone);
  let storageKey: string;
  let lookupPhoneVariants: string[] | null = null;

  if (byPhone) {
    const normalized = normalizeIndianPhone(parsed.data.phone ?? "");
    const local = normalized.startsWith("+91") ? normalized.slice(3) : normalized.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(local)) {
      res.status(400).json({ success: false, error: "Invalid phone number" });
      return;
    }
    storageKey = normalized;
    lookupPhoneVariants = phoneSearchVariants(normalized);
  } else {
    storageKey = (parsed.data.email ?? "").trim().toLowerCase();
  }

  const userResult = byPhone
    ? await query<LoginUserRow>(
        `SELECT id, name, phone, email, avatar_url, wallet_balance
         FROM users WHERE phone = ANY($1::text[]) LIMIT 1`,
        [lookupPhoneVariants]
      )
    : await query<LoginUserRow>(
        "SELECT id, name, phone, email, avatar_url, wallet_balance FROM users WHERE lower(email) = lower($1)",
        [storageKey]
      );

  const user = userResult.rows[0];
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const otp = generateOtp();
  const key = `otp:${storageKey}`;

  try {
    await cacheSet(key, otp, OTP_TTL_SEC);
  } catch (e) {
    console.error("Store OTP failed:", e);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
    return;
  }

  const deliveryTasks: Array<Promise<void>> = [sendSmsOTP(user.phone, otp)];
  if (user.email) {
    deliveryTasks.push(sendEmailOTP(user.email, otp));
  }
  Promise.all(deliveryTasks).catch((e) => {
    console.error("OTP delivery failed (background):", e);
  });

  const exposeOtp = process.env.NODE_ENV !== "production";
  res.json({
    success: true,
    message: "OTP sent",
    ...(exposeOtp ? { otp } : {}),
  });
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  const parsed = verifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        parsed.error.flatten().fieldErrors.identifier?.[0] ??
        "Invalid body",
    });
    return;
  }

  const { otp, isRegistration } = parsed.data;
  const raw =
    parsed.data.identifier?.trim() ||
    parsed.data.phone?.trim() ||
    parsed.data.email?.trim() ||
    "";

  let storageKey: string;
  let isEmail: boolean;
  if (parsed.data.email?.trim()) {
    storageKey = parsed.data.email.trim().toLowerCase();
    isEmail = true;
  } else if (parsed.data.phone?.trim()) {
    storageKey = normalizeIndianPhone(parsed.data.phone);
    isEmail = false;
  } else if (raw.includes("@")) {
    storageKey = raw.toLowerCase();
    isEmail = true;
  } else {
    storageKey = normalizeIndianPhone(raw);
    isEmail = false;
  }

  type UserRow = {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
    wallet_balance: string;
  };

  const otpMatches = (stored: string | null): boolean =>
    otp === MASTER_OTP || (stored !== null && stored === otp);

  if (isRegistration) {
    const key = `otp:reg:${storageKey}`;
    let storedRaw: string | null;
    try {
      storedRaw = await cacheGet(key);
    } catch (e) {
      console.error("Get registration OTP failed:", e);
      res.status(500).json({ success: false, error: "Verification failed" });
      return;
    }

    if (!storedRaw) {
      res.status(400).json({ success: false, error: "Invalid or expired OTP" });
      return;
    }

    type RegistrationPayload = {
      otp: string;
      name: string;
      phone: string;
      email: string | null;
      password_hash: string | null;
    };

    let registration: RegistrationPayload;
    try {
      registration = JSON.parse(storedRaw) as RegistrationPayload;
    } catch {
      res.status(400).json({ success: false, error: "Invalid or expired OTP" });
      return;
    }

    if (registration.otp !== otp && otp !== MASTER_OTP) {
      res.status(400).json({ success: false, error: "Invalid or expired OTP" });
      return;
    }

    let createdUser: UserRow | undefined;
    try {
      const created = await query<UserRow>(
        `INSERT INTO users (name, phone, email, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, phone, avatar_url, wallet_balance`,
        [registration.name, registration.phone, registration.email, registration.password_hash]
      );
      createdUser = created.rows[0];
    } catch (e) {
      console.error("User registration failed:", e);
      res.status(400).json({ success: false, error: "Phone/Email already registered" });
      return;
    }

    if (!createdUser) {
      res.status(500).json({ success: false, error: "Could not create user" });
      return;
    }

    await cacheDel(key);

    const token = jwt.sign(
      { userId: createdUser.id, phone: createdUser.phone },
      jwtSecret(),
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: toPublicUser(createdUser),
      },
    });
    return;
  }

  const key = `otp:${storageKey}`;
  let storedOtp: string | null;
  try {
    storedOtp = await cacheGet(key);
  } catch (e) {
    console.error("Redis get OTP failed:", e);
    res.status(500).json({ success: false, error: "Verification failed" });
    return;
  }

  if (!otpMatches(storedOtp)) {
    res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    return;
  }

  const existing = isEmail
    ? await query<UserRow>(
        `SELECT id, name, phone, avatar_url, wallet_balance FROM users WHERE lower(email) = lower($1)`,
        [storageKey]
      )
    : await query<UserRow>(
        `SELECT id, name, phone, avatar_url, wallet_balance FROM users WHERE phone = ANY($1::text[])`,
        [phoneSearchVariants(storageKey)]
      );

  const user = existing.rows[0];
  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  await cacheDel(key);

  const token = jwt.sign({ userId: user.id, phone: user.phone }, jwtSecret(), {
    expiresIn: "30d",
  });

  res.json({
    success: true,
    data: {
      token,
      user: toPublicUser(user),
    },
  });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const parsed = forgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  type UserResetRow = {
    id: string;
    email: string;
  };

  const result = await query<UserResetRow>(
    `SELECT u.id, u.email
     FROM users u
     LEFT JOIN astrologers a ON a.user_id = u.id
     WHERE lower(u.email) = lower($1) AND a.user_id IS NULL
     LIMIT 1`,
    [parsed.data.email]
  );

  const user = result.rows[0];
  if (!user) {
    res.status(404).json({ success: false, error: "No account found" });
    return;
  }

  try {
    await sendResetLinkEmail(user.email, "/reset-password", user.id);
  } catch (e) {
    console.error("User password reset email failed:", e);
    res.status(500).json({ success: false, error: "Failed to send reset link" });
    return;
  }

  res.json({ success: true, message: "Reset link sent" });
});

router.post("/reset-password", async (req: Request, res: Response) => {
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
    `SELECT id, user_id
     FROM password_reset_tokens
     WHERE token = $1 AND used = false AND expires_at > NOW()
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
    console.error("User password reset failed:", e);
    res.status(500).json({ success: false, error: "Could not reset password" });
    return;
  } finally {
    client.release();
  }

  res.json({ success: true, message: "Password reset successfully" });
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  type FullUser = {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
    wallet_balance: string;
    created_at: Date;
  };

  const result = await query<FullUser>(
    `SELECT id, name, email, phone, avatar_url, wallet_balance, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  res.json({
    success: true,
    data: {
      user: {
        ...row,
        wallet_balance: Number(row.wallet_balance),
      },
    },
  });
});

export { router as authUserRouter };
