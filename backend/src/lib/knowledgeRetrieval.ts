import { query } from "../db/index.js";
import { embedText, embeddingToVectorLiteral } from "./aiProvider.js";

export type KnowledgeMatch = {
  answer: string;
  question: string;
  similarity: number;
};

/**
 * Cosine similarity via pgvector `<=>` (cosine distance).
 * similarity = 1 - distance. Returns null if nothing clears the threshold,
 * or if lookup fails (missing table, embed error, etc.).
 */
export async function findBestMatch(
  category: string,
  queryText: string,
  similarityThreshold = 0.82
): Promise<KnowledgeMatch | null> {
  try {
    const embedding = await embedText(queryText);
    const vector = embeddingToVectorLiteral(embedding);
    const result = await query<{
      question: string;
      answer: string;
      similarity: string;
    }>(
      `SELECT question, answer,
              (1 - (embedding <=> $2::vector))::text AS similarity
       FROM knowledge_base
       WHERE category = $1
         AND is_active = true
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector
       LIMIT 1`,
      [category, vector]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }
    const similarity = Number(row.similarity);
    if (!Number.isFinite(similarity) || similarity < similarityThreshold) {
      return null;
    }
    return {
      question: row.question,
      answer: row.answer,
      similarity,
    };
  } catch (e) {
    console.error("[KnowledgeRetrieval] findBestMatch failed:", e);
    return null;
  }
}
