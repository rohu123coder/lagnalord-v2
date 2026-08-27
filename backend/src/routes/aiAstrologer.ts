import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../db/index.js";
import {
  getAllActivePersonas,
  getAstrologerReply,
  type ChatTurn,
} from "../services/aiAstrologerService.js";

const router = Router();

router.get("/personas", async (_req, res) => {
  try {
    const personas = await getAllActivePersonas();
    const publicPersonas = personas.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      tagline: p.tagline,
      photo_url: p.photoUrl,
      rate_per_min: p.ratePerMin,
    }));
    return res.json({ success: true, personas: publicPersonas });
  } catch (e) {
    console.error("[AIAstrologer] /personas route error:", e);
    return res.status(500).json({ error: "Failed to load personas" });
  }
});

router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { personaId, kundliData, history, message } = req.body as {
      personaId?: string;
      kundliData?: unknown;
      history?: ChatTurn[];
      message?: string;
    };

    if (!personaId || typeof personaId !== "string") {
      return res.status(400).json({ error: "personaId is required" });
    }
    if (!kundliData) {
      return res.status(400).json({ error: "kundliData is required" });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "message too long (max 2000 characters)" });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Please log in to chat with an AI Astrologer" });
    }

    const rateResult = await query<{ rate_per_min: string }>(
      `SELECT rate_per_min FROM ai_astrologers WHERE id = $1 AND is_active = true`,
      [personaId]
    );
    const rateRow = rateResult.rows[0];
    if (!rateRow) {
      return res.status(404).json({ error: "This astrologer is no longer available" });
    }
    const charge = Number(rateRow.rate_per_min);

    const deduct = await query<{ wallet_balance: string }>(
      `UPDATE users
       SET wallet_balance = wallet_balance - $1::numeric
       WHERE id = $2 AND wallet_balance >= $1::numeric
       RETURNING wallet_balance`,
      [charge, userId]
    );
    if (deduct.rows.length === 0) {
      return res.status(400).json({
        error: "Insufficient wallet balance. Please recharge to continue chatting.",
        data: { required: charge },
      });
    }
    await query(
      `INSERT INTO transactions (user_id, type, amount, status)
       VALUES ($1, 'deduction', $2, 'success')`,
      [userId, charge]
    );

    const safeHistory: ChatTurn[] = Array.isArray(history)
      ? history
          .filter(
            (h): h is ChatTurn =>
              h &&
              (h.role === "user" || h.role === "model") &&
              typeof h.text === "string"
          )
          .slice(-20)
      : [];

    const reply = await getAstrologerReply(
      personaId,
      kundliData,
      safeHistory,
      message.trim()
    );

    return res.json({ success: true, reply });
  } catch (e) {
    console.error("[AIAstrologer] /chat route error:", e);
    return res.status(500).json({ error: "Failed to get astrologer reply" });
  }
});

export default router;
