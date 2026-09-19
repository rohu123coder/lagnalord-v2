const PRODUCTION_ORIGINS = [
  "https://divinemarg.com",
  "https://www.divinemarg.com",
  "https://lagnalords.com",
  "https://www.lagnalords.com",
  "https://lagnalord-v2-admin.vercel.app",
  "https://divinemarg-admin.vercel.app",
];

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
];

function parseOriginList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter((s) => s.length > 0);
}

export function allowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS?.trim();
  if (fromEnv) {
    return parseOriginList(fromEnv);
  }

  const origins = [...PRODUCTION_ORIGINS];
  const frontend = process.env.FRONTEND_URL?.trim().replace(/\/$/, "");
  if (frontend && !origins.includes(frontend)) {
    origins.push(frontend);
  }
  if (process.env.NODE_ENV !== "production") {
    for (const local of LOCAL_DEV_ORIGINS) {
      if (!origins.includes(local)) {
        origins.push(local);
      }
    }
  }
  return origins;
}

const originSet = (): Set<string> => new Set(allowedOrigins());

/** Express/Socket.IO cors origin callback. No Origin (mobile/native) is allowed. */
export function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (!origin || originSet().has(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}
