import { z } from "zod";

/** Canonical form: +91 + 10 digits (e.g. +919876543210) */
export function normalizeIndianPhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-]/g, "");
  if (trimmed.startsWith("+91")) {
    const rest = trimmed.slice(3).replace(/\D/g, "").slice(0, 10);
    return rest.length === 10 ? `+91${rest}` : trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(local)) {
      return `+91${local}`;
    }
  }
  return trimmed;
}

export function phoneSearchVariants(canonical: string): string[] {
  if (!canonical.startsWith("+91") || canonical.length !== 13) {
    return [canonical];
  }
  const local = canonical.slice(3);
  return [`+91${local}`, local, `91${local}`];
}

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number");

export const emailSchema = z.string().email("Must be a valid email address");

export const forgotPasswordBody = z.object({
  email: emailSchema,
});

export const resetPasswordBody = z.object({
  token: z.string().length(64, "Invalid token"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type UserPublic = {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  wallet_balance: number;
};

export function toPublicUser(row: {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  wallet_balance: string;
}): UserPublic {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    wallet_balance: Number(row.wallet_balance),
  };
}
