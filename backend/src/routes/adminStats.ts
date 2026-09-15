import { Router, type Request, type Response } from "express";

import { query } from "../db/index.js";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  const [usersCount, astrologersCount, revenueRow, sessionsCount] =
    await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM users`
      ).then((r) => Number(r.rows[0]?.count ?? 0)),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM astrologers`
      ).then((r) => Number(r.rows[0]?.count ?? 0)),
      query<{ sum: string | null }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS sum
         FROM transactions
         WHERE type = 'recharge' AND status = 'success'`
      ).then((r) => Number(r.rows[0]?.sum ?? 0)),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM chat_sessions WHERE status = 'active'`
      ).then((r) => Number(r.rows[0]?.count ?? 0)),
    ]);

  res.json({
    success: true,
    data: {
      totalUsers: usersCount,
      totalAstrologers: astrologersCount,
      totalRevenue: revenueRow,
      activeSessions: sessionsCount,
    },
  });
});

export { router as adminStatsRouter };
