import { GoogleGenerativeAI } from "@google/generative-ai";
import { query } from "../db/index.js";

export type AstrologerPersona = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  styleInstructions: string;
  photoUrl: string | null;
  ratePerMin: number;
};

export async function getPersonaById(id: string): Promise<AstrologerPersona | undefined> {
  const result = await query<{
    id: string;
    name: string;
    emoji: string;
    tagline: string;
    personality_prompt: string;
    photo_url: string | null;
    rate_per_min: string;
  }>(
    `SELECT id, name, emoji, tagline, personality_prompt, photo_url, rate_per_min::text
     FROM ai_astrologers
     WHERE id = $1 AND is_active = true`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    tagline: row.tagline,
    styleInstructions: row.personality_prompt,
    photoUrl: row.photo_url,
    ratePerMin: Number(row.rate_per_min),
  };
}

export async function getAllActivePersonas(): Promise<AstrologerPersona[]> {
  const result = await query<{
    id: string;
    name: string;
    emoji: string;
    tagline: string;
    personality_prompt: string;
    photo_url: string | null;
    rate_per_min: string;
  }>(
    `SELECT id, name, emoji, tagline, personality_prompt, photo_url, rate_per_min::text
     FROM ai_astrologers
     WHERE is_active = true
     ORDER BY sort_order ASC, created_at ASC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    tagline: row.tagline,
    styleInstructions: row.personality_prompt,
    photoUrl: row.photo_url,
    ratePerMin: Number(row.rate_per_min),
  }));
}

const BASE_ACCURACY_RULES = `You are an AI Vedic astrologer chatbot embedded in an astrology app. You will be given the user's exact, precomputed birth chart data as JSON below. This data is authoritative and already calculated by a Swiss Ephemeris backend — treat it as ground truth.

STRICT RULES YOU MUST FOLLOW:
1. NEVER invent, guess, or hallucinate any planetary position, house, rashi, nakshatra, dasha period, dosha, or yoga that is not explicitly present in the JSON data provided below. If the user asks about something not covered by the data (e.g. exact date of marriage, exact date of promotion), explain what the chart indicates in terms of favorable periods or trends based on the actual dasha/planet data given, but do NOT state a specific guaranteed date or outcome as fact.
2. Always ground your answers in the specific planets, houses, dasha periods, doshas, and yogas from the provided data — reference them by name so the user can see the answer is personalized to their actual chart, not generic.
3. If asked a question with insufficient data to answer (e.g. a divisional chart not provided), say so honestly rather than fabricating an answer.
4. Keep responses conversational and well-formatted for a chat UI — moderate length, not overly long essays. Use line breaks for readability.
5. Never provide medical, legal, or financial guarantees. For health/legal/financial topics, frame guidance as traditional astrological indications, not professional advice, and suggest consulting a relevant professional for serious matters.
6. Stay in character per your assigned persona's tone and style, described below.`;

export function buildSystemPrompt(persona: AstrologerPersona, kundliData: unknown): string {
  const kundliJson = JSON.stringify(kundliData, null, 2);
  return `${BASE_ACCURACY_RULES}

YOUR PERSONA:
${persona.styleInstructions}

USER'S BIRTH CHART DATA (ground truth — use only this):
${kundliJson}`;
}

function getGeminiModel(systemInstruction: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[AIAstrologer] GEMINI_API_KEY not set");
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction,
  });
}

export type ChatTurn = {
  role: "user" | "model";
  text: string;
};

export async function getAstrologerReply(
  personaId: string,
  kundliData: unknown,
  history: ChatTurn[],
  message: string
): Promise<string> {
  const persona = await getPersonaById(personaId);
  if (!persona) {
    return "Yeh astrologer ab available nahi hai. Kripya doosra astrologer select karein.";
  }
  const systemPrompt = buildSystemPrompt(persona, kundliData);
  const model = getGeminiModel(systemPrompt);

  if (!model) {
    return "Maaf kijiye, abhi AI Astrologer service unavailable hai. Kripya thodi der baad try karein.";
  }

  try {
    let sanitizedHistory = history;
    const firstUserIdx = sanitizedHistory.findIndex((t) => t.role === "user");
    sanitizedHistory = firstUserIdx === -1 ? [] : sanitizedHistory.slice(firstUserIdx);

    const chat = model.startChat({
      history: sanitizedHistory.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
    });
    const result = await chat.sendMessage(message);
    const text = result.response.text();
    return text.trim() || "Maaf kijiye, main abhi is sawaal ka jawab nahi de paaya. Dobara try karein.";
  } catch (e) {
    console.error("[AIAstrologer] Gemini chat error:", e);
    return "Kuch technical dikkat aa gayi hai. Kripya thodi der baad phir try karein.";
  }
}
