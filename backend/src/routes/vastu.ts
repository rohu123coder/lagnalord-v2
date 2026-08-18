import multer from "multer";
import streamifier from "streamifier";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { query } from "../db/index.js";
import { cloudinary } from "../lib/cloudinary.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  analyzeVastuPhotos,
  applyVastuRules,
  buildVastuReport,
  calculateVastuScore,
  isValidPropertyType,
  VASTU_PROPERTY_TYPES,
} from "../services/vastuService.js";

const router = Router();

const vastuUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

type VastuScanRow = {
  id: string;
  user_id: string;
  property_type: string;
  north_direction: string;
  photo_urls: unknown;
  overall_score: string | null;
  report: unknown;
  raw_analysis: unknown;
  created_at: Date;
};

function rejectAstrologer(req: Request, res: Response): boolean {
  if (req.user?.role === "astrologer") {
    res.status(403).json({
      success: false,
      error: "This feature is available for app users only",
    });
    return true;
  }
  return false;
}

function parseUserDescriptions(raw: unknown): Array<{ roomLabel?: string; description: string }> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (item && typeof item === "object" && "description" in item) {
            const entry = item as { roomLabel?: string; description?: string };
            return {
              roomLabel: entry.roomLabel,
              description: typeof entry.description === "string" ? entry.description : "",
            };
          }
          return { description: "" };
        });
      }
    } catch {
      return [];
    }
  }
  return [];
}
function parseRoomLabels(raw: unknown): string[] {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((v) => (typeof v === "string" ? v : String(v)));
      }
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.map((v) => (typeof v === "string" ? v : String(v)));
  }
  return [];
}

router.post(
  "/analyze",
  authMiddleware,
  vastuUpload.any(),
  async (req: Request, res: Response) => {
    if (rejectAstrologer(req, res)) return;

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const allFiles = req.files as Express.Multer.File[] | undefined;
    const files = allFiles?.filter((f) => f.fieldname === "photos");
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: "At least one photo is required" });
      return;
    }

    const propertyTypeRaw =
      typeof req.body?.propertyType === "string"
        ? req.body.propertyType.trim().toLowerCase()
        : "residential";

    if (!isValidPropertyType(propertyTypeRaw)) {
      res.status(400).json({
        success: false,
        error: `Invalid propertyType. Must be one of: ${VASTU_PROPERTY_TYPES.join(", ")}`,
      });
      return;
    }

    const northRaw = req.body?.northDirection;
    const northDirection = Number(northRaw);
    if (!Number.isFinite(northDirection) || northDirection < 0 || northDirection > 360) {
      res.status(400).json({
        success: false,
        error: "northDirection is required and must be a number between 0 and 360",
      });
      return;
    }

    const roomLabels = parseRoomLabels(req.body?.roomLabels);
    const userDescriptions = parseUserDescriptions(req.body?.userDescriptions);

    const compassDirections: number[] = (() => {
      const raw = req.body?.compassDirections;
      if (typeof raw !== "string") return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v));
        }
      } catch {
        return [];
      }
      return [];
    })();

    let photoUrls: Array<{
      url: string;
      roomLabel: string;
      compassDirection: number;
      userDescription: string;
    }>;
    try {
      photoUrls = await Promise.all(
        files.map(async (file, index) => {
          const url = await uploadToCloudinary(file.buffer, "divinemarg/vastu");
          const compassRaw = compassDirections[index] ?? req.body?.compassDirection;
          const compassDirection = Number(compassRaw);
          return {
            url,
            roomLabel: roomLabels[index] ?? `Room ${index + 1}`,
            compassDirection: Number.isFinite(compassDirection) ? compassDirection : northDirection,
            userDescription: userDescriptions[index]?.description ?? "",
          };
        })
      );
    } catch (e) {
      console.error("[Vastu] Cloudinary upload failed:", e);
      res.status(500).json({ success: false, error: "Photo upload failed" });
      return;
    }

    let scanId: string;
    try {
      const insert = await query<{ id: string }>(
        `INSERT INTO vastu_scans (
           user_id, property_type, north_direction, photo_urls, status
         )
         VALUES ($1, $2, $3, $4::jsonb, 'pending')
         RETURNING id`,
        [userId, propertyTypeRaw, northDirection, JSON.stringify(photoUrls)]
      );
      const row = insert.rows[0];
      if (!row) {
        res.status(500).json({ success: false, error: "Failed to create scan" });
        return;
      }
      scanId = row.id;
    } catch (e) {
      console.error("[Vastu] Failed to create pending scan:", e);
      res.status(500).json({ success: false, error: "Failed to start analysis" });
      return;
    }

    res.status(202).json({
      success: true,
      data: { id: scanId, status: "pending" },
    });

    void (async () => {
      try {
        const analysis = await analyzeVastuPhotos(photoUrls, propertyTypeRaw, northDirection);
        const appliedRules = applyVastuRules(analysis, propertyTypeRaw);
        const scores = calculateVastuScore(analysis, appliedRules, photoUrls.length);
        const report = buildVastuReport(scores, appliedRules, analysis, propertyTypeRaw);

        await query(
          `UPDATE vastu_scans
           SET overall_score = $1, report = $2::jsonb, raw_analysis = $3::jsonb, status = 'completed'
           WHERE id = $4`,
          [report.overallScore, JSON.stringify(report), JSON.stringify(analysis), scanId]
        );

        const { notifyVastuReportReady } = await import("../services/pushNotifications.js");
        await notifyVastuReportReady({
          userId,
          scanId,
          overallScore: report.overallScore,
        });
      } catch (e) {
        console.error("[Vastu] Background analysis failed for scan", scanId, ":", e);
        try {
          await query(`UPDATE vastu_scans SET status = 'failed' WHERE id = $1`, [scanId]);
          const { notifyVastuFailed } = await import("../services/pushNotifications.js");
          await notifyVastuFailed({ userId });
        } catch (innerErr) {
          console.error("[Vastu] Failed to mark scan as failed:", innerErr);
        }
      }
    })();
  }
);

router.get("/history", authMiddleware, async (req: Request, res: Response) => {
  if (rejectAstrologer(req, res)) return;

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    const result = await query<{
      id: string;
      created_at: Date;
      overall_score: string;
      property_type: string;
    }>(
      `SELECT id, created_at, overall_score, property_type
       FROM vastu_scans
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at.toISOString(),
        overallScore: Number(row.overall_score),
        propertyType: row.property_type,
      })),
    });
  } catch (e) {
    console.error("[Vastu] History fetch failed:", e);
    res.status(500).json({ success: false, error: "Failed to fetch scan history" });
  }
});

const idParamSchema = z.string().uuid();

router.get("/scan/:id", authMiddleware, async (req: Request, res: Response) => {
  if (rejectAstrologer(req, res)) return;

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const parsedId = idParamSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(400).json({ success: false, error: "Invalid scan id" });
    return;
  }

  try {
    const result = await query<VastuScanRow & { status: string }>(
      `SELECT id, user_id, property_type, north_direction, photo_urls,
              overall_score, report, raw_analysis, created_at, status
       FROM vastu_scans
       WHERE id = $1 AND user_id = $2`,
      [parsedId.data, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Scan not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        status: row.status,
        propertyType: row.property_type,
        northDirection: Number(row.north_direction),
        photoUrls: row.photo_urls,
        overallScore: row.overall_score != null ? Number(row.overall_score) : 0,
        report: row.report,
        rawAnalysis: row.raw_analysis,
        createdAt: row.created_at.toISOString(),
      },
    });
  } catch (e) {
    console.error("[Vastu] Get scan failed:", e);
    res.status(500).json({ success: false, error: "Failed to fetch scan" });
  }
});

export default router;
