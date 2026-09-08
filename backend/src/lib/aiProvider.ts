import { GoogleGenerativeAI } from "@google/generative-ai";

const GENERATION_MODEL = "gemini-3.6-flash";
const EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSIONS = 768;

export type ChatTurn = {
  role: "user" | "model";
  text: string;
};

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

function sanitizeHistory(history: ChatTurn[]): ChatTurn[] {
  const firstUserIdx = history.findIndex((turn) => turn.role === "user");
  return firstUserIdx === -1 ? [] : history.slice(firstUserIdx);
}

/**
 * Single Gemini text-generation entry point for conversational replies.
 * With history: startChat + sendMessage. Without: generateContent.
 */
export async function generateText(params: {
  systemPrompt: string;
  userMessage: string;
  history?: ChatTurn[];
}): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: GENERATION_MODEL,
    systemInstruction: params.systemPrompt,
  });

  if (params.history !== undefined) {
    const history = sanitizeHistory(params.history);
    const chat = model.startChat({
      history: history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
    });
    const result = await chat.sendMessage(params.userMessage);
    return result.response.text().trim();
  }

  const result = await model.generateContent(params.userMessage);
  return result.response.text().trim();
}

/**
 * Gemini text-embedding-004 produces a 768-dimensional vector
 * (Google's documented default output size for this model).
 */
export async function embedText(text: string): Promise<number[]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  const values = result.embedding.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-d embedding from ${EMBEDDING_MODEL}, got ${values?.length ?? 0}`
    );
  }
  return values;
}

export function embeddingToVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
