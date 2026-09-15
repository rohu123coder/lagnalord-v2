import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { query } from "../db/index.js";
import { jwtSecret } from "./adminShared.js";

const router = Router();

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

export { router as adminAuthRouter };
