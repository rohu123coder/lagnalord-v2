import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { query } from "../db/index.js";
import { idParamSchema, photoUpload, uploadToCloudinary } from "./adminShared.js";

const router = Router();

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

export { router as adminAiAstrologersRouter };
