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
    const { personaId, kundliData, history, message, sessionId } = req.body as {
      personaId?: string;
      kundliData?: unknown;
      history?: ChatTurn[];
      message?: string;
      sessionId?: string;
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

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const sessionInsert = await query<{ id: string }>(
        `INSERT INTO ai_chat_sessions (user_id, ai_astrologer_id)
         VALUES ($1, $2)
         RETURNING id`,
        [userId, personaId]
      );
      activeSessionId = sessionInsert.rows[0]?.id;
    }

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

    if (activeSessionId) {
      await query(
        `INSERT INTO ai_chat_messages (session_id, role, text, charge)
         VALUES ($1, 'user', $2, $3), ($1, 'model', $4, 0)`,
        [activeSessionId, message.trim(), charge, reply]
      );
      await query(
        `UPDATE ai_chat_sessions
         SET total_charged = total_charged + $1,
             message_count = message_count + 2,
             last_message_at = now()
         WHERE id = $2`,
        [charge, activeSessionId]
      );
    }

    return res.json({ success: true, reply, sessionId: activeSessionId });
  } catch (e) {
    console.error("[AIAstrologer] /chat route error:", e);
    return res.status(500).json({ error: "Failed to get astrologer reply" });
  }
});

router.get("/sessions", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await query<{
      id: string;
      ai_astrologer_id: string;
      astrologer_name: string;
      astrologer_emoji: string;
      astrologer_photo_url: string | null;
      total_charged: string;
      message_count: number;
      started_at: string;
      last_message_at: string;
    }>(
      `SELECT s.id, s.ai_astrologer_id,
              a.name AS astrologer_name,
              a.emoji AS astrologer_emoji,
              a.photo_url AS astrologer_photo_url,
              s.total_charged::text, s.message_count,
              s.started_at, s.last_message_at
       FROM ai_chat_sessions s
       JOIN ai_astrologers a ON a.id = s.ai_astrologer_id
       WHERE s.user_id = $1
       ORDER BY s.last_message_at DESC
       LIMIT 50`,
      [userId]
    );
    return res.json({
      success: true,
      sessions: result.rows.map((r) => ({
        id: r.id,
        astrologerId: r.ai_astrologer_id,
        astrologerName: r.astrologer_name,
        astrologerEmoji: r.astrologer_emoji,
        astrologerPhotoUrl: r.astrologer_photo_url,
        totalCharged: Number(r.total_charged),
        messageCount: r.message_count,
        startedAt: r.started_at,
        lastMessageAt: r.last_message_at,
      })),
    });
  } catch (e) {
    console.error("[AIAstrologer] /sessions route error:", e);
    return res.status(500).json({ error: "Failed to load chat sessions" });
  }
});

router.get("/sessions/:id", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const sessionId = req.params.id;
  try {
    const sessionResult = await query<{
      id: string;
      user_id: string;
      astrologer_name: string;
      astrologer_emoji: string;
      astrologer_photo_url: string | null;
      total_charged: string;
    }>(
      `SELECT s.id, s.user_id,
              a.name AS astrologer_name,
              a.emoji AS astrologer_emoji,
              a.photo_url AS astrologer_photo_url,
              s.total_charged::text
       FROM ai_chat_sessions s
       JOIN ai_astrologers a ON a.id = s.ai_astrologer_id
       WHERE s.id = $1`,
      [sessionId]
    );
    const session = sessionResult.rows[0];
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: "Session not found" });
    }
    const messagesResult = await query<{
      role: "user" | "model";
      text: string;
      created_at: string;
    }>(
      `SELECT role, text, created_at
       FROM ai_chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return res.json({
      success: true,
      session: {
        id: session.id,
        astrologerName: session.astrologer_name,
        astrologerEmoji: session.astrologer_emoji,
        astrologerPhotoUrl: session.astrologer_photo_url,
        totalCharged: Number(session.total_charged),
      },
      messages: messagesResult.rows.map((m) => ({
        role: m.role,
        text: m.text,
        createdAt: m.created_at,
      })),
    });
  } catch (e) {
    console.error("[AIAstrologer] /sessions/:id route error:", e);
    return res.status(500).json({ error: "Failed to load chat session" });
  }
});

export default router;
