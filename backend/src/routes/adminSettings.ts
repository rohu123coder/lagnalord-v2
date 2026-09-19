import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { pool, query } from "../db/index.js";
import { requireAdminWrite } from "../middleware/auth.js";

const router = Router();

router.get("/settings", requireAdminWrite, async (_req: Request, res: Response) => {
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

router.put("/settings", requireAdminWrite, async (req: Request, res: Response) => {
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

export { router as adminSettingsRouter };
