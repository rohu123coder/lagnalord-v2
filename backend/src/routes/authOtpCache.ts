import { randomInt } from "node:crypto";

import { redis } from "../lib/redis.js";

export const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
};

export const OTP_TTL_SEC = 600;

/** In-memory fallback when Redis set/get fails */
const otpMemoryStore = new Map<string, { value: string; expiresAt: number }>();

export async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  try {
    await redis.set(key, value, { EX: ttlSec });
    return;
  } catch (e) {
    console.error("Redis set failed, using in-memory OTP store:", e);
  }
  otpMemoryStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const v = await redis.get(key);
    if (v !== null) {
      return v;
    }
  } catch (e) {
    console.error("Redis get failed, trying in-memory OTP store:", e);
  }
  const m = otpMemoryStore.get(key);
  if (!m) {
    return null;
  }
  if (Date.now() > m.expiresAt) {
    otpMemoryStore.delete(key);
    return null;
  }
  return m.value;
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    /* noop */
  }
  otpMemoryStore.delete(key);
}

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}
