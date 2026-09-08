import { Router, type Request, type Response } from "express";

import { query } from "../db/index.js";

const router = Router();

const PUBLIC_POPUP_KEYS = [
  "popup_enabled",
  "popup_headline",
  "popup_subtext",
  "popup_offer_text",
  "popup_button1_label",
  "popup_button2_label",
] as const;

const PUBLIC_POPUP_DEFAULTS: Record<(typeof PUBLIC_POPUP_KEYS)[number], string> = {
  popup_enabled: "false",
  popup_headline: "",
  popup_subtext: "",
  popup_offer_text: "",
  popup_button1_label: "",
  popup_button2_label: "",
};

router.get("/public", async (_req: Request, res: Response) => {
  try {
    const result = await query<{ key: string; value: string | null }>(
      `SELECT key, value FROM platform_settings WHERE key = ANY($1::text[])`,
      [PUBLIC_POPUP_KEYS]
    );

    const stored: Record<string, string | null> = {};
    for (const row of result.rows) {
      stored[row.key] = row.value;
    }

    const data: Record<string, string> = {};
    for (const key of PUBLIC_POPUP_KEYS) {
      const value = stored[key];
      data[key] =
        value == null || value === ""
          ? PUBLIC_POPUP_DEFAULTS[key]
          : value;
    }
    if (data.popup_enabled !== "true") {
      data.popup_enabled = "false";
    }

    res.json({ success: true, data });
  } catch (e) {
    console.error("public settings read failed:", e);
    res.status(500).json({ success: false, error: "Could not load settings" });
  }
});

export default router;
export { PUBLIC_POPUP_KEYS };
