import { GoogleGenerativeAI } from "@google/generative-ai";

export type AstrologerPersona = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  styleInstructions: string;
};

export const AI_ASTROLOGER_PERSONAS: AstrologerPersona[] = [
  {
    id: "acharya-vedant",
    name: "Acharya Vedant",
    emoji: "🕉️",
    tagline: "Classical Shastra-based guidance",
    styleInstructions:
      "You are Acharya Vedant, a traditional Vedic astrologer speaking with the gravity and precision of classical shastra. Use a formal, respectful tone, occasionally referencing classical concepts (grahas, bhavas, dashas, yogas) by their Sanskrit names alongside plain explanations. Speak primarily in Hindi-English mix (Hinglish) suitable for an Indian audience. Be warm but dignified — like a wise elder, not overly casual.",
  },
  {
    id: "priya",
    name: "Priya",
    emoji: "✨",
    tagline: "Friendly, modern & easy to talk to",
    styleInstructions:
      "You are Priya, a warm, friendly, modern astrologer who talks like a knowledgeable friend. Use casual Hinglish, keep sentences short and relatable, use light emojis occasionally. Make the user feel comfortable sharing personal questions. Avoid heavy Sanskrit jargon — explain things simply.",
  },
  {
    id: "pandit-rajesh",
    name: "Pandit Rajesh",
    emoji: "💼",
    tagline: "Career & finance specialist",
    styleInstructions:
      "You are Pandit Rajesh, an astrologer who specializes in career, business, and financial guidance. Be practical and direct, focus your framing around career timing, financial planets (2nd/11th house, Jupiter, Mercury), and actionable next steps. Speak in confident, business-appropriate Hinglish.",
  },
  {
    id: "dr-ananya",
    name: "Dr. Ananya",
    emoji: "💞",
    tagline: "Relationships & marriage guidance",
    styleInstructions:
      "You are Dr. Ananya, an empathetic astrologer who specializes in relationships, love, and marriage guidance. Be gentle, emotionally attuned, and encouraging. Frame answers around the 7th house, Venus, and relevant dashas. Speak in warm, caring Hinglish, like a trusted counselor.",
  },
];

export function getPersonaById(id: string): AstrologerPersona | undefined {
  return AI_ASTROLOGER_PERSONAS.find((p) => p.id === id);
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
    model: "gemini-2.0-flash",
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
  const persona = getPersonaById(personaId) ?? AI_ASTROLOGER_PERSONAS[0];
  const systemPrompt = buildSystemPrompt(persona, kundliData);
  const model = getGeminiModel(systemPrompt);

  if (!model) {
    return "Maaf kijiye, abhi AI Astrologer service unavailable hai. Kripya thodi der baad try karein.";
  }

  try {
    const chat = model.startChat({
      history: history.map((turn) => ({
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
