import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { query } from "../db/index.js";
import { embedText, embeddingToVectorLiteral } from "../lib/aiProvider.js";
import { idParamSchema, paginationQuery } from "./adminShared.js";

const router = Router();

const knowledgeListQuery = paginationQuery.extend({
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

const knowledgeBody = z.object({
  category: z.string().trim().min(1).max(80),
  question: z.string().trim().min(3).max(2000),
  answer: z.string().trim().min(3).max(20000),
  is_active: z.boolean().optional().default(true),
});

const knowledgePatchBody = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  question: z.string().trim().min(3).max(2000).optional(),
  answer: z.string().trim().min(3).max(20000).optional(),
  is_active: z.boolean().optional(),
});

router.get("/knowledge-base", async (req: Request, res: Response) => {
  const parsed = knowledgeListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid query",
    });
    return;
  }

  const { page, limit, category, search } = parsed.data;
  const offset = (page - 1) * limit;
  const conditions: string[] = ["TRUE"];
  const params: unknown[] = [];
  let p = 1;

  if (category) {
    conditions.push(`category = $${p++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(question ILIKE $${p} OR answer ILIKE $${p} OR category ILIKE $${p})`);
    params.push(`%${search}%`);
    p += 1;
  }

  const whereSql = conditions.join(" AND ");

  try {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM knowledge_base WHERE ${whereSql}`,
      params
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const categoriesResult = await query<{ category: string }>(
      `SELECT DISTINCT category FROM knowledge_base ORDER BY category ASC`
    );

    const listParams = [...params, limit, offset];
    const result = await query<{
      id: string;
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
      has_embedding: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, category, question, answer, is_active,
              (embedding IS NOT NULL) AS has_embedding,
              created_at, updated_at
       FROM knowledge_base
       WHERE ${whereSql}
       ORDER BY updated_at DESC
       LIMIT $${p++} OFFSET $${p}`,
      listParams
    );

    res.json({
      success: true,
      data: {
        entries: result.rows,
        categories: categoriesResult.rows.map((row) => row.category),
        page,
        limit,
        total,
      },
    });
  } catch (e) {
    console.error("admin knowledge-base list failed:", e);
    res.status(500).json({
      success: false,
      error: "Could not load knowledge base (has the pgvector migration been run?)",
    });
  }
});

router.post("/knowledge-base", async (req: Request, res: Response) => {
  const parsed = knowledgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const { category, question, answer, is_active } = parsed.data;
  try {
    const embedding = await embedText(question);
    const inserted = await query<{
      id: string;
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO knowledge_base (category, question, answer, embedding, is_active)
       VALUES ($1, $2, $3, $4::vector, $5)
       RETURNING id, category, question, answer, is_active, created_at, updated_at`,
      [category, question, answer, embeddingToVectorLiteral(embedding), is_active]
    );

    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (e) {
    console.error("admin knowledge-base create failed:", e);
    res.status(500).json({ success: false, error: "Could not create knowledge entry" });
  }
});

router.put("/knowledge-base/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid knowledge entry id" });
    return;
  }
  const bodyParsed = knowledgePatchBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({
      success: false,
      error: bodyParsed.error.issues[0]?.message ?? "Invalid body",
    });
    return;
  }

  const existing = await query<{
    id: string;
    category: string;
    question: string;
    answer: string;
    is_active: boolean;
  }>(
    `SELECT id, category, question, answer, is_active FROM knowledge_base WHERE id = $1`,
    [idParsed.data.id]
  );
  const row = existing.rows[0];
  if (!row) {
    res.status(404).json({ success: false, error: "Knowledge entry not found" });
    return;
  }

  const next = {
    category: bodyParsed.data.category ?? row.category,
    question: bodyParsed.data.question ?? row.question,
    answer: bodyParsed.data.answer ?? row.answer,
    is_active: bodyParsed.data.is_active ?? row.is_active,
  };
  const questionChanged = next.question !== row.question;
  const answerChanged = next.answer !== row.answer;

  try {
    let embeddingLiteral: string | null = null;
    if (questionChanged || answerChanged) {
      embeddingLiteral = embeddingToVectorLiteral(await embedText(next.question));
    }

    const updated = await query<{
      id: string;
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      embeddingLiteral
        ? `UPDATE knowledge_base
           SET category = $1, question = $2, answer = $3, is_active = $4,
               embedding = $5::vector, updated_at = now()
           WHERE id = $6
           RETURNING id, category, question, answer, is_active, created_at, updated_at`
        : `UPDATE knowledge_base
           SET category = $1, question = $2, answer = $3, is_active = $4, updated_at = now()
           WHERE id = $5
           RETURNING id, category, question, answer, is_active, created_at, updated_at`,
      embeddingLiteral
        ? [next.category, next.question, next.answer, next.is_active, embeddingLiteral, idParsed.data.id]
        : [next.category, next.question, next.answer, next.is_active, idParsed.data.id]
    );

    res.json({ success: true, data: updated.rows[0] });
  } catch (e) {
    console.error("admin knowledge-base update failed:", e);
    res.status(500).json({ success: false, error: "Could not update knowledge entry" });
  }
});

router.delete("/knowledge-base/:id", async (req: Request, res: Response) => {
  const idParsed = idParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ success: false, error: "Invalid knowledge entry id" });
    return;
  }

  const deleted = await query<{ id: string }>(
    `DELETE FROM knowledge_base WHERE id = $1 RETURNING id`,
    [idParsed.data.id]
  );
  if (!deleted.rows[0]) {
    res.status(404).json({ success: false, error: "Knowledge entry not found" });
    return;
  }

  res.json({ success: true, data: { id: deleted.rows[0].id } });
});

export { router as adminKnowledgeRouter };
