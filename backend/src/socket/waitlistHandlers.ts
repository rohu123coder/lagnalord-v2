import type { PoolClient } from "pg";
import type { Server, Socket } from "socket.io";
import { z } from "zod";

import { pool } from "../db/index.js";
import { startSessionTimer } from "./sessionState.js";

const joinWaitlistPayload = z.object({
  astrologerId: z.string().uuid(),
});

const waitlistActionPayload = z.object({
  waitlistId: z.string().uuid(),
  action: z.enum(["accept", "decline", "already_added"]),
});

const cancelWaitlistPayload = z.object({
  waitlistId: z.string().uuid(),
  astrologerId: z.string().uuid().optional(),
});

const acceptFromWaitlistPayload = z.object({
  waitlistId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

type WaitlistQueueRow = {
  id: string;
  astrologer_id: string;
  user_id: string;
  user_name: string;
  position: number;
};

type WaitlistPositionRow = {
  id: string;
  user_id: string;
  position: number;
};

export async function loadAstrologerQueue(
  astrologerId: string
): Promise<WaitlistQueueRow[]> {
  const queueResult = await pool.query<WaitlistQueueRow>(
    `SELECT w.id,
            w.astrologer_id,
            w.user_id,
            w.position,
            u.name AS user_name
     FROM astrologer_waitlist w
     INNER JOIN users u ON u.id = w.user_id
     WHERE w.astrologer_id = $1
       AND w.status = 'waiting'
     ORDER BY w.position`,
    [astrologerId]
  );
  return queueResult.rows;
}

export async function emitQueuePositionUpdates(
  io: Server,
  astrologerId: string
): Promise<void> {
  const result = await pool.query<WaitlistPositionRow>(
    `SELECT id, user_id, position
     FROM astrologer_waitlist
     WHERE astrologer_id = $1
       AND status = 'waiting'
     ORDER BY position`,
    [astrologerId]
  );
  const queueLength = result.rows.length;
  for (const row of result.rows) {
    io.to(`user:${row.user_id}`).emit("queue_position_update", {
      waitlistId: row.id,
      astrologerId,
      newPosition: row.position,
      queueLength,
    });
  }
}

export async function emitWaitlistUpdated(
  io: Server,
  astrologerUserId: string,
  astrologerId: string
): Promise<WaitlistQueueRow[]> {
  const queue = await loadAstrologerQueue(astrologerId);
  const mappedQueue = queue.map((row) => ({
    waitlistId: row.id,
    userId: row.user_id,
    userName: row.user_name,
    position: row.position,
  }));
  io.to(`user:${astrologerUserId}`).emit("waitlist_updated", {
    astrologerId,
    queue: mappedQueue,
    total: queue.length,
  });
  io.emit("waitlist_updated", {
    astrologerId,
    queue: mappedQueue,
    total: queue.length,
  });
  return queue;
}

async function reorderWaitlistAfterRemoval(
  client: PoolClient,
  astrologerId: string,
  removedPosition: number
): Promise<void> {
  await client.query(
    `UPDATE astrologer_waitlist
     SET position = position - 1,
         updated_at = now()
     WHERE astrologer_id = $1
       AND status = 'waiting'
       AND position > $2`,
    [astrologerId, removedPosition]
  );
}

async function acceptWaitlistEntry(
  io: Server,
  astrologerUserId: string,
  waitlistId: string
): Promise<{ ok: true; sessionId: string } | { ok: false; reason: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const waitlistResult = await client.query<{
      id: string;
      astrologer_id: string;
      user_id: string;
      position: number;
      status: string;
      user_name: string;
      astrologer_name: string;
    }>(
      `SELECT w.id,
              w.astrologer_id,
              w.user_id,
              w.position,
              w.status,
              u.name AS user_name,
              au.name AS astrologer_name
       FROM astrologer_waitlist w
       INNER JOIN users u ON u.id = w.user_id
       INNER JOIN astrologers a ON a.id = w.astrologer_id
       INNER JOIN users au ON au.id = a.user_id
       WHERE w.id = $1
         AND a.user_id = $2
       FOR UPDATE`,
      [waitlistId, astrologerUserId]
    );
    const wait = waitlistResult.rows[0];
    if (!wait || wait.status !== "waiting") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "waitlist_not_available" };
    }

    const activeSession = await client.query<{ id: string }>(
      `SELECT id
       FROM chat_sessions
       WHERE astrologer_id = $1
         AND status = 'active'
       LIMIT 1`,
      [wait.astrologer_id]
    );
    if (activeSession.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "astrologer_busy" };
    }

    const sessionInsert = await client.query<{ id: string }>(
      `INSERT INTO chat_sessions (user_id, astrologer_id, status, started_at)
       VALUES ($1, $2, 'active', now())
       RETURNING id`,
      [wait.user_id, wait.astrologer_id]
    );
    const session = sessionInsert.rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "session_create_failed" };
    }

    await client.query(
      `UPDATE astrologer_waitlist
       SET status = 'accepted',
           session_id = $2,
           updated_at = now()
       WHERE id = $1`,
      [wait.id, session.id]
    );
    await reorderWaitlistAfterRemoval(client, wait.astrologer_id, wait.position);
    await client.query("COMMIT");

    io.to(`user:${wait.user_id}`).emit("session_starting", {
      sessionId: session.id,
      astrologerId: wait.astrologer_id,
      astrologerName: wait.astrologer_name,
    });
    io.to(`user:${astrologerUserId}`).emit("waitlist_session_started", {
      waitlistId: wait.id,
      sessionId: session.id,
      userId: wait.user_id,
      userName: wait.user_name,
    });
    await emitWaitlistUpdated(io, astrologerUserId, wait.astrologer_id);
    await emitQueuePositionUpdates(io, wait.astrologer_id);
    return { ok: true, sessionId: session.id };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("acceptWaitlistEntry failed:", err);
    return { ok: false, reason: "internal_error" };
  } finally {
    client.release();
  }
}

export async function autoConnectNextInQueue(
  io: Server,
  astrologerId: string,
  astrologerUserId: string,
  astrologerName: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const nextInQueue = await client.query<{
      id: string;
      astrologer_id: string;
      user_id: string;
      position: number;
      user_name: string;
    }>(
      `SELECT w.id,
              w.astrologer_id,
              w.user_id,
              w.position,
              u.name AS user_name
       FROM astrologer_waitlist w
       INNER JOIN users u ON u.id = w.user_id
       WHERE w.astrologer_id = $1
         AND w.status = 'waiting'
       ORDER BY w.position ASC
       LIMIT 1
       FOR UPDATE`,
      [astrologerId]
    );
    const next = nextInQueue.rows[0];
    if (!next) {
      await client.query("ROLLBACK");
      return;
    }

    const newSession = await client.query<{ id: string }>(
      `INSERT INTO chat_sessions (user_id, astrologer_id, status, started_at)
       VALUES ($1, $2, 'active', NOW())
       RETURNING id`,
      [next.user_id, astrologerId]
    );
    const newSessionId = newSession.rows[0]?.id;
    if (!newSessionId) {
      await client.query("ROLLBACK");
      return;
    }

    await client.query(
      `UPDATE astrologer_waitlist
       SET status = 'accepted',
           session_id = $2,
           updated_at = now()
       WHERE id = $1`,
      [next.id, newSessionId]
    );

    await reorderWaitlistAfterRemoval(client, astrologerId, next.position);
    await client.query("COMMIT");

    io.to(`user:${next.user_id}`).emit("queue_your_turn", {
      sessionId: newSessionId,
      astrologerId,
      astrologerName,
      message: "Your turn! Connecting you now...",
    });
    io.to(`user:${next.user_id}`).emit("session_starting", {
      sessionId: newSessionId,
      astrologerId,
      astrologerName,
    });
    io.to(`user:${astrologerUserId}`).emit("waitlist_session_started", {
      waitlistId: next.id,
      sessionId: newSessionId,
      userId: next.user_id,
      userName: next.user_name,
    });

    startSessionTimer(io, newSessionId, Date.now());
    await emitWaitlistUpdated(io, astrologerUserId, astrologerId);
    await emitQueuePositionUpdates(io, astrologerId);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("autoConnectNextInQueue failed:", err);
  } finally {
    client.release();
  }
}

export function registerWaitlistHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user;

    socket.on("join_waitlist", async (payload: unknown) => {
      const parsed = joinWaitlistPayload.safeParse(payload);
      if (!parsed.success || user.role === "astrologer") {
        return;
      }
      const { astrologerId } = parsed.data;

      const astroResult = await pool.query<{
        astrologer_id: string;
        astrologer_user_id: string;
        astrologer_name: string;
        user_name: string;
      }>(
        `SELECT a.id AS astrologer_id,
                a.user_id AS astrologer_user_id,
                au.name AS astrologer_name,
                u.name AS user_name
         FROM astrologers a
         INNER JOIN users au ON au.id = a.user_id
         INNER JOIN users u ON u.id = $2
         WHERE a.id = $1`,
        [astrologerId, user.userId]
      );
      const astro = astroResult.rows[0];
      if (!astro) {
        socket.emit("waitlist_error", { reason: "astrologer_not_found" });
        return;
      }

      const activeResult = await pool.query<{ id: string }>(
        `SELECT id
         FROM chat_sessions
         WHERE astrologer_id = $1
           AND status = 'active'
         LIMIT 1`,
        [astrologerId]
      );
      if (!activeResult.rows[0]) {
        socket.emit("waitlist_error", {
          reason: "astrologer_available",
          astrologerId,
        });
        return;
      }

      const existingResult = await pool.query<{
        id: string;
        position: number;
      }>(
        `SELECT id, position
         FROM astrologer_waitlist
         WHERE astrologer_id = $1
           AND user_id = $2
           AND status = 'waiting'
         LIMIT 1`,
        [astrologerId, user.userId]
      );
      const existing = existingResult.rows[0];
      if (existing) {
        const queue = await emitWaitlistUpdated(
          io,
          astro.astrologer_user_id,
          astrologerId
        );
        await emitQueuePositionUpdates(io, astrologerId);
        socket.emit("waitlist_joined", {
          waitlistId: existing.id,
          position: existing.position,
          queueLength: queue.length,
          astrologerId,
        });
        io.to(`user:${astro.astrologer_user_id}`).emit("waitlist_request", {
          userId: user.userId,
          userName: astro.user_name,
          waitlistId: existing.id,
          position: existing.position,
          astrologerId,
        });
        return;
      }

      const insertResult = await pool.query<{
        id: string;
        position: number;
      }>(
        `WITH next_pos AS (
           SELECT COALESCE(MAX(position), 0) + 1 AS pos
           FROM astrologer_waitlist
           WHERE astrologer_id = $1
             AND status = 'waiting'
         )
         INSERT INTO astrologer_waitlist (
           astrologer_id,
           user_id,
           position,
           status
         )
         VALUES ($1, $2, (SELECT pos FROM next_pos), 'waiting')
         RETURNING id, position`,
        [astrologerId, user.userId]
      );
      const created = insertResult.rows[0];
      if (!created) {
        socket.emit("waitlist_error", { reason: "waitlist_create_failed" });
        return;
      }

      const queue = await emitWaitlistUpdated(io, astro.astrologer_user_id, astrologerId);
      await emitQueuePositionUpdates(io, astrologerId);

      socket.emit("waitlist_joined", {
        waitlistId: created.id,
        position: created.position,
        queueLength: queue.length,
        astrologerId,
      });
      io.to(`user:${astro.astrologer_user_id}`).emit("waitlist_request", {
        userId: user.userId,
        userName: astro.user_name,
        waitlistId: created.id,
        position: created.position,
        astrologerId,
      });
    });

    socket.on("waitlist_action", async (payload: unknown) => {
      const parsed = waitlistActionPayload.safeParse(payload);
      if (!parsed.success || user.role !== "astrologer") {
        return;
      }
      const { waitlistId, action } = parsed.data;

      if (action === "already_added") {
        socket.emit("waitlist_action_ack", { waitlistId, action });
        return;
      }

      if (action === "accept") {
        const accepted = await acceptWaitlistEntry(io, user.userId, waitlistId);
        const acceptReason = "reason" in accepted ? accepted.reason : undefined;
        const acceptedSessionId = accepted.ok ? accepted.sessionId : undefined;
        socket.emit("waitlist_action_ack", {
          waitlistId,
          action,
          ok: accepted.ok,
          reason: acceptReason,
          sessionId: acceptedSessionId,
        });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const rowResult = await client.query<{
          id: string;
          astrologer_id: string;
          user_id: string;
          position: number;
          astrologer_user_id: string;
          status: string;
        }>(
          `SELECT w.id,
                  w.astrologer_id,
                  w.user_id,
                  w.position,
                  a.user_id AS astrologer_user_id,
                  w.status
           FROM astrologer_waitlist w
           INNER JOIN astrologers a ON a.id = w.astrologer_id
           WHERE w.id = $1
             AND a.user_id = $2
           FOR UPDATE`,
          [waitlistId, user.userId]
        );
        const row = rowResult.rows[0];
        if (!row || row.status !== "waiting") {
          await client.query("ROLLBACK");
          socket.emit("waitlist_action_ack", {
            waitlistId,
            action,
            ok: false,
            reason: "waitlist_not_available",
          });
          return;
        }

        await client.query(
          `UPDATE astrologer_waitlist
           SET status = 'cancelled',
               updated_at = now()
           WHERE id = $1`,
          [row.id]
        );
        await reorderWaitlistAfterRemoval(client, row.astrologer_id, row.position);
        await client.query("COMMIT");

        io.to(`user:${row.user_id}`).emit("waitlist_declined", {
          waitlistId: row.id,
          astrologerId: row.astrologer_id,
        });
        await emitWaitlistUpdated(io, row.astrologer_user_id, row.astrologer_id);
        await emitQueuePositionUpdates(io, row.astrologer_id);
        socket.emit("waitlist_action_ack", { waitlistId, action, ok: true });
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("waitlist_action decline failed:", err);
      } finally {
        client.release();
      }
    });

    socket.on("accept_from_waitlist", async (payload: unknown) => {
      const parsed = acceptFromWaitlistPayload.safeParse(payload);
      if (!parsed.success || user.role !== "astrologer") {
        return;
      }
      const { waitlistId } = parsed.data;
      const accepted = await acceptWaitlistEntry(io, user.userId, waitlistId);
      const acceptReason = "reason" in accepted ? accepted.reason : undefined;
      const acceptedSessionId = accepted.ok ? accepted.sessionId : undefined;
      socket.emit("waitlist_action_ack", {
        waitlistId,
        action: "accept",
        ok: accepted.ok,
        reason: acceptReason,
        sessionId: acceptedSessionId,
      });
    });

    socket.on("cancel_waitlist", async (payload: unknown) => {
      const parsed = cancelWaitlistPayload.safeParse(payload);
      if (!parsed.success || user.role === "astrologer") {
        return;
      }
      const { waitlistId } = parsed.data;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const rowResult = await client.query<{
          id: string;
          astrologer_id: string;
          position: number;
          status: string;
          astrologer_user_id: string;
        }>(
          `SELECT w.id,
                  w.astrologer_id,
                  w.position,
                  w.status,
                  a.user_id AS astrologer_user_id
           FROM astrologer_waitlist w
           INNER JOIN astrologers a ON a.id = w.astrologer_id
           WHERE w.id = $1
             AND w.user_id = $2
           FOR UPDATE`,
          [waitlistId, user.userId]
        );
        const row = rowResult.rows[0];
        if (!row || row.status !== "waiting") {
          await client.query("ROLLBACK");
          socket.emit("waitlist_cancelled", {
            waitlistId,
            ok: false,
            reason: "waitlist_not_available",
          });
          return;
        }

        await client.query(
          `UPDATE astrologer_waitlist
           SET status = 'cancelled',
               updated_at = now()
           WHERE id = $1`,
          [row.id]
        );
        await reorderWaitlistAfterRemoval(client, row.astrologer_id, row.position);
        await client.query("COMMIT");
        await emitWaitlistUpdated(io, row.astrologer_user_id, row.astrologer_id);
        await emitQueuePositionUpdates(io, row.astrologer_id);
        socket.emit("waitlist_cancelled", {
          waitlistId: row.id,
          astrologerId: row.astrologer_id,
          ok: true,
        });
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("cancel_waitlist failed:", err);
      } finally {
        client.release();
      }
    });

    socket.on("get_waitlist", async () => {
      if (user.role !== "astrologer") {
        return;
      }
      const astroResult = await pool.query<{
        astrologer_id: string;
      }>(
        `SELECT id AS astrologer_id
         FROM astrologers
         WHERE user_id = $1
         LIMIT 1`,
        [user.userId]
      );
      const astro = astroResult.rows[0];
      if (!astro) {
        return;
      }
      const queue = await loadAstrologerQueue(astro.astrologer_id);
      socket.emit("waitlist_data", {
        queue: queue.map((row) => ({
          waitlistId: row.id,
          userId: row.user_id,
          userName: row.user_name,
          position: row.position,
        })),
      });
    });

}
