import { Router } from "express";
import {
  AI_ASTROLOGER_PERSONAS,
  getAstrologerReply,
  type ChatTurn,
} from "../services/aiAstrologerService.js";

const router = Router();

router.get("/personas", (_req, res) => {
  const publicPersonas = AI_ASTROLOGER_PERSONAS.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    tagline: p.tagline,
  }));
  return res.json({ success: true, personas: publicPersonas });
});

router.post("/chat", async (req, res) => {
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
