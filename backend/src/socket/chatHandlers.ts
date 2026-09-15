import type { Server, Socket } from "socket.io";
import { z } from "zod";

import { pool } from "../db/index.js";
import { notifyNewMessage } from "../services/pushNotifications.js";
import { finalizeChatSession } from "./sessionBilling.js";
import {
  clearWaitingSessionTimeout,
  ensureLiveSession,
  ensureWaitingSessionTimeout,
  liveSessions,
  startSessionTimer,
  stopSessionTimer,
} from "./sessionState.js";

type SessionRow = {
  id: string;
  user_id: string;
  astrologer_id: string;
  astrologer_user_id: string;
  astrologer_name: string;
  status: string;
  started_at: Date | null;
  price_per_minute: string | null;
};

const sessionIdPayload = z.object({
  sessionId: z.string().uuid(),
});

const sendMessagePayload = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(10_000),
});

async function loadSessionRow(sessionId: string): Promise<SessionRow | null> {
  const r = await pool.query<SessionRow>(
    `SELECT cs.id,
            cs.user_id,
            cs.astrologer_id,
            a.user_id AS astrologer_user_id,
            au.name AS astrologer_name,
            cs.status,
            cs.started_at,
            a.price_per_minute
     FROM chat_sessions cs
     INNER JOIN astrologers a ON a.id = cs.astrologer_id
     INNER JOIN users au ON au.id = a.user_id
     WHERE cs.id = $1`,
    [sessionId]
  );
  return r.rows[0] ?? null;
}

export function registerChatHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user;

    socket.on("join_session", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId } = parsed.data;

      const session = await loadSessionRow(sessionId);
      if (!session) {
        return;
      }

      const uid = user.userId;
      const isParticipant =
        uid === session.user_id || uid === session.astrologer_user_id;
      if (!isParticipant) {
        return;
      }

      await socket.join(sessionId);

      if (session.status === "waiting") {
        ensureWaitingSessionTimeout(io, sessionId);
      } else {
        clearWaitingSessionTimeout(sessionId);
      }

      if (user.role === "astrologer" && session.status === "waiting") {
        const upd = await pool.query<{ started_at: Date }>(
          `UPDATE chat_sessions
           SET status = 'active', started_at = now()
           WHERE id = $1 AND status = 'waiting'
           RETURNING started_at`,
          [sessionId]
        );
        const started = upd.rows[0];
        if (started) {
          clearWaitingSessionTimeout(sessionId);
          startSessionTimer(io, sessionId, started.started_at.getTime());
          io.to(sessionId).emit("session_started", {
            sessionId,
            startedAt: started.started_at.toISOString(),
          });
          return;
        }
      }

      const latest = await loadSessionRow(sessionId);
      if (latest?.status === "active") {
        const startedAtMs = latest.started_at
          ? new Date(latest.started_at).getTime()
          : Date.now();
        if (!liveSessions.has(sessionId)) {
          console.log("[TIMER] recovered session from DB", sessionId);
        }
        startSessionTimer(io, sessionId, startedAtMs);
        socket.emit("session_tick", {
          elapsedMinutes: Math.max(
            0,
            Math.floor((Date.now() - startedAtMs) / 60_000)
          ),
          elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)),
        });
      }
      socket.emit("joined_session", {
        sessionId,
        status: latest?.status ?? session.status,
      });
    });

    socket.on("send_message", async (payload: unknown) => {
      const parsed = sendMessagePayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId, content } = parsed.data;

      const session = await loadSessionRow(sessionId);
      if (!session || session.status !== "active") {
        return;
      }

      const uid = user.userId;
      const isParticipant =
        uid === session.user_id || uid === session.astrologer_user_id;
      if (!isParticipant) {
        return;
      }

      const senderType =
        user.role === "astrologer" ? "astrologer" : "user";

      const ins = await pool.query<{
        id: string;
        created_at: Date;
      }>(
        `INSERT INTO messages (session_id, sender_id, sender_type, content, is_automated)
         VALUES ($1, $2, $3::message_sender_type, $4, false)
         RETURNING id, created_at`,
        [sessionId, uid, senderType, content]
      );
      const row = ins.rows[0];
      if (!row) {
        return;
      }
      try {
        await pool.query(
          `INSERT INTO session_messages_archive (session_id, sender_role, content, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [sessionId, senderType, content]
        );
      } catch (archiveErr) {
        console.error("message archive insert failed:", archiveErr);
      }
      const state = ensureLiveSession(
        sessionId,
        session.started_at ? new Date(session.started_at).getTime() : Date.now()
      );
      if (uid === session.user_id) {
        state.userMessageCount = (state.userMessageCount ?? 0) + 1;
      } else if (uid === session.astrologer_user_id) {
        state.astrologerMessageCount = (state.astrologerMessageCount ?? 0) + 1;
      }

      io.to(sessionId).emit("new_message", {
        id: row.id,
        sessionId,
        senderId: uid,
        senderType,
        content,
        isAutomated: false,
        createdAt: row.created_at.toISOString(),
      });

      const recipientUserId =
        uid === session.user_id ? session.astrologer_user_id : session.user_id;
      const senderName =
        uid === session.astrologer_user_id
          ? session.astrologer_name
          : (
              await pool.query<{ name: string }>(
                `SELECT name FROM users WHERE id = $1`,
                [uid]
              )
            ).rows[0]?.name ?? "User";

      void notifyNewMessage({
        recipientId: recipientUserId,
        senderName,
        message: content,
        sessionId,
      }).catch((err) => console.error("[Push] Failed to notify new message:", err));
    });

    socket.on("typing", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId } = parsed.data;

      const session = await loadSessionRow(sessionId);
      if (!session) {
        return;
      }
      const uid = user.userId;
      const isParticipant =
        uid === session.user_id || uid === session.astrologer_user_id;
      if (!isParticipant) {
        return;
      }

      socket.to(sessionId).emit("user_typing", {
        userId: uid,
        sessionId,
      });
    });

    socket.on("end_session", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId } = parsed.data;

      const session = await loadSessionRow(sessionId);
      if (!session) {
        return;
      }
      const uid = user.userId;
      const isParticipant =
        uid === session.user_id || uid === session.astrologer_user_id;
      if (!isParticipant) {
        return;
      }

      await finalizeChatSession(io, sessionId);
    });

    socket.on("decline_request", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId } = parsed.data;
      if (user.role !== "astrologer") {
        return;
      }

      const session = await loadSessionRow(sessionId);
      if (!session || session.astrologer_user_id !== user.userId) {
        return;
      }
      if (session.status !== "waiting") {
        return;
      }

      await pool.query(
        `UPDATE chat_sessions
         SET status = 'cancelled',
             ended_at = now(),
             total_minutes = 0,
             total_charged = 0
         WHERE id = $1 AND status = 'waiting'`,
        [sessionId]
      );
      clearWaitingSessionTimeout(sessionId);
      stopSessionTimer(sessionId);
      liveSessions.delete(sessionId);

      io.to(sessionId).emit("session_cancelled", {
        sessionId,
        reason: "astrologer_unavailable",
      });
      io.to(sessionId).emit("session_ended", {
        sessionId,
        duration: 0,
        charge: 0,
        astrologerName: session.astrologer_name,
        totalMinutes: 0,
        totalCharged: 0,
      });
    });

    socket.on("disconnect", () => {
      const uid = user.userId;
      const role = socket.data.role;
      const astrologerId = socket.data.astrologerId;
      setTimeout(async () => {
        try {
          // If the user reconnected in the grace window, do not end sessions.
          const userRoomSockets = await io.in(`user:${uid}`).fetchSockets();
          const stillDisconnected = userRoomSockets.length === 0;
          if (!stillDisconnected) {
            return;
          }

          if (role === "astrologer") {
            const statusResult = await pool.query<{ id: string }>(
              `UPDATE astrologers
               SET is_online = false
               WHERE user_id = $1
               RETURNING id`,
              [uid]
            );
            const nextAstrologerId = astrologerId ?? statusResult.rows[0]?.id;
            if (nextAstrologerId) {
              io.emit("astrologer_status_changed", {
                astrologerId: nextAstrologerId,
                is_online: false,
              });
            }
          }

          const open = await pool.query<{ id: string }>(
            `SELECT cs.id
             FROM chat_sessions cs
             INNER JOIN astrologers a ON a.id = cs.astrologer_id
             WHERE cs.status IN ('waiting', 'active')
               AND (cs.user_id = $1 OR a.user_id = $1)`,
            [uid]
          );
          for (const row of open.rows) {
            await finalizeChatSession(io, row.id);
          }
        } catch (err) {
          console.error("disconnect grace-period handling failed:", err);
        }
      }, 10_000);
    });

}
