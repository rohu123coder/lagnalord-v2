import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { query } from "../db/index.js";

const secret = process.env.JWT_SECRET;

function isStaffRole(role?: string): boolean {
  return (
    role === "admin" ||
    role === "superadmin" ||
    role === "finance" ||
    role === "viewer"
  );
}

/** True if the user row is missing or `is_suspended`. PK lookup only. */
export async function userAccountBlocked(userId: string): Promise<boolean> {
  const result = await query<{ is_suspended: boolean }>(
    `SELECT is_suspended FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return !row || row.is_suspended;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!secret) {
    console.error("JWT_SECRET is not set");
    res.status(500).json({ success: false, error: "Server misconfiguration" });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as Express.Request["user"] & {
      userId?: string;
    };
    if (!decoded?.userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
    if (!isStaffRole(decoded.role) && (await userAccountBlocked(decoded.userId))) {
      res.status(403).json({ success: false, error: "Account suspended" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

export function requireAstrologer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "astrologer") {
    res.status(403).json({ success: false, error: "Astrologer access only" });
    return;
  }
  next();
}

export function requireAdminRole(
  ...allowedRoles: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ success: false, error: "Admin access only" });
      return;
    }
    next();
  };
}

/** Any staff JWT (read access). Composer gate for /api/admin/*. */
export const requireAdmin = requireAdminRole(
  "admin",
  "superadmin",
  "finance",
  "viewer"
);

/** Mutations that are not finance-specific. */
export const requireAdminWrite = requireAdminRole("admin", "superadmin");

/** Wallet adjustment: full admins plus finance. */
export const requireFinanceAccess = requireAdminRole(
  "admin",
  "superadmin",
  "finance"
);

/** Attaches `req.user` when a valid Bearer token is present; no-op otherwise. */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!secret) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      userId?: string;
      phone?: string;
      role?: string;
      iat?: number;
      exp?: number;
    };
    if (decoded?.userId) {
      req.user = {
        userId: decoded.userId,
        phone: decoded.phone,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    }
  } catch {
    // public response when token invalid
  }
  next();
}
