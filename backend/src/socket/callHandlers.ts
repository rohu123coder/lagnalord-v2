import type { Server, Socket } from "socket.io";
import { z } from "zod";

import { pool } from "../db/index.js";
import { generateAgoraToken, generateChannelName } from "../services/agoraService.js";
import {
  ensureLiveSession,
  pendingCalls,
} from "./sessionState.js";

const sessionIdPayload = z.object({
  sessionId: z.string().uuid(),
});

const callTypePayload = z.enum(["voice", "video"]);
const initiateCallPayload = z.object({
  sessionId: z.string().uuid(),
  callType: callTypePayload,
});

type CallSessionRow = {
  id: string;
  status: string;
  user_id: string;
  astrologer_user_id: string;
  user_name: string;
  astrologer_name: string;
  price_per_minute: string | null;
  session_type: string | null;
  call_channel_name: string | null;
};

async function loadCallSessionRow(sessionId: string): Promise<CallSessionRow | null> {
  const r = await pool.query<CallSessionRow>(
    `SELECT cs.id,
            cs.status,
            cs.user_id,
            a.user_id AS astrologer_user_id,
            u.name AS user_name,
            au.name AS astrologer_name,
            a.price_per_minute AS price_per_minute,
            cs.session_type,
            cs.call_channel_name AS call_channel_name
     FROM chat_sessions cs
     INNER JOIN astrologers a ON a.id = cs.astrologer_id
     INNER JOIN users u ON u.id = cs.user_id
     INNER JOIN users au ON au.id = a.user_id
     WHERE cs.id = $1`,
    [sessionId]
  );
  return r.rows[0] ?? null;
}

export function registerCallHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user;

    socket.on("initiate_call", async (payload: unknown) => {
      const parsed = initiateCallPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId, callType } = parsed.data;

      // Only accept calls for active sessions.
      const session = await loadCallSessionRow(sessionId);
      if (!session || session.status !== "active") {
        return;
      }

      const callerUserId = user.userId;
      const isUserCaller = callerUserId === session.user_id;
      const isAstrologerCaller = callerUserId === session.astrologer_user_id;
      if (!isUserCaller && !isAstrologerCaller) {
        return;
      }

      const otherUserId = isUserCaller ? session.astrologer_user_id : session.user_id;
      const callerName = isUserCaller ? session.user_name : session.astrologer_name;

      const channelName = generateChannelName(sessionId);
      const appId = process.env.AGORA_APP_ID ?? "";

      if (!appId) {
        return;
      }

      // Generate tokens for both parties (publisher role).
      const userToken = generateAgoraToken(channelName, 1, "publisher");
      const astrologerToken = generateAgoraToken(channelName, 2, "publisher");
      void userToken;
      void astrologerToken;

      await pool.query(
        `UPDATE chat_sessions
         SET session_type = $1,
             call_channel_name = $2
         WHERE id = $3`,
        [callType, channelName, sessionId]
      );

      // Clear any previous pending timers for this session.
      const existing = pendingCalls.get(sessionId);
      if (existing) {
        clearTimeout(existing.timeout);
        pendingCalls.delete(sessionId);
      }

      // Auto-decline if the other party doesn't respond in 30s.
      const timeout = setTimeout(async () => {
        const pending = pendingCalls.get(sessionId);
        if (!pending) {
          return;
        }

        pendingCalls.delete(sessionId);

        await pool.query(
          `UPDATE chat_sessions
           SET session_type = 'chat',
               call_channel_name = NULL
           WHERE id = $1`,
          [sessionId]
        );

        io.to(`user:${pending.callerUserId}`).emit("call_declined", {
          sessionId,
          callType: pending.callType,
          channelName: pending.channelName,
        });
        io.to(`user:${pending.otherUserId}`).emit("call_declined", {
          sessionId,
          callType: pending.callType,
          channelName: pending.channelName,
        });
      }, 30_000);

      pendingCalls.set(sessionId, {
        timeout,
        callerUserId,
        otherUserId,
        callType,
        channelName,
      });

      const callerUid = isUserCaller ? 1 : 2;
      const token = generateAgoraToken(channelName, callerUid, "publisher");

      io.to(`user:${otherUserId}`).emit("incoming_call", {
        sessionId,
        callType,
        channelName,
        callerName,
        appId,
        pricePerMinute: Number(session.price_per_minute ?? 0),
      });
      // Also emit to user's room so mobile receives call_ready
      io.to(`user:${callerUserId}`).emit("call_ready", {
        channelName,
        token,
        uid: callerUid,
        appId,
        callType,
        pricePerMinute: Number(session.price_per_minute ?? 0),
      });
      socket.emit("call_ready", {
        channelName,
        token,
        uid: callerUid,
        appId,
        callType,
        pricePerMinute: Number(session.price_per_minute ?? 0),
      });
    });

    socket.on("accept_call", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }

      const { sessionId } = parsed.data;
      const session = await loadCallSessionRow(sessionId);
      if (!session || session.status !== "active") {
        return;
      }

      const accepterUserId = user.userId;
      const isAccepterUser = accepterUserId === session.user_id;
      const isAccepterAstrologer = accepterUserId === session.astrologer_user_id;
      if (!isAccepterUser && !isAccepterAstrologer) {
        return;
      }

      const callerUserId = isAccepterUser ? session.astrologer_user_id : session.user_id;

      const channelName =
        session.call_channel_name ?? generateChannelName(sessionId);
      const appId = process.env.AGORA_APP_ID ?? "";
      if (!appId) {
        return;
      }

      const accepterUid = isAccepterUser ? 1 : 2;
      const token = generateAgoraToken(channelName, accepterUid, "publisher");

      // Clear pending auto-decline timer.
      const pending = pendingCalls.get(sessionId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(sessionId);
      }

      // Mark both parties as "communicated" so the existing billing logic
      // (which relies on message counts) charges for the call time.
      const liveState = ensureLiveSession(sessionId);
      liveState.userMessageCount = 1;
      liveState.astrologerMessageCount = 1;

      const callType = (session.session_type ?? "voice") as "voice" | "video";

      socket.emit("call_ready", {
        channelName,
        token,
        uid: accepterUid,
        appId,
        callType,
        pricePerMinute: Number(session.price_per_minute ?? 0),
      });
      io.to(`user:${callerUserId}`).emit("call_accepted", {
        channelName,
      });
    });

    socket.on("decline_call", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId } = parsed.data;

      const session = await loadCallSessionRow(sessionId);
      if (!session || session.status !== "active") {
        return;
      }

      const declinerUserId = user.userId;
      const isDeclinerUser = declinerUserId === session.user_id;
      const isDeclinerAstrologer = declinerUserId === session.astrologer_user_id;
      if (!isDeclinerUser && !isDeclinerAstrologer) {
        return;
      }

      const callerUserId = isDeclinerUser ? session.astrologer_user_id : session.user_id;
      const otherUserId = isDeclinerUser ? session.user_id : session.astrologer_user_id;

      const pending = pendingCalls.get(sessionId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(sessionId);
      }

      await pool.query(
        `UPDATE chat_sessions
         SET session_type = 'chat',
             call_channel_name = NULL
         WHERE id = $1`,
        [sessionId]
      );

      io.to(`user:${callerUserId}`).emit("call_declined", { sessionId });
      io.to(`user:${otherUserId}`).emit("call_declined", { sessionId });
    });

    socket.on("end_call", async (payload: unknown) => {
      const parsed = sessionIdPayload.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const { sessionId } = parsed.data;

      const session = await loadCallSessionRow(sessionId);
      if (!session || session.status !== "active") {
        return;
      }

      const uid = user.userId;
      const isParticipant = uid === session.user_id || uid === session.astrologer_user_id;
      if (!isParticipant) {
        return;
      }

      const callerUserId = session.user_id;
      const otherUserId = session.astrologer_user_id;

      const pending = pendingCalls.get(sessionId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(sessionId);
      }

      const channelName = session.call_channel_name ?? generateChannelName(sessionId);

      await pool.query(
        `UPDATE chat_sessions
         SET session_type = 'chat',
             call_channel_name = NULL
         WHERE id = $1`,
        [sessionId]
      );

      io.to(`user:${callerUserId}`).emit("call_ended", { sessionId, channelName });
      io.to(`user:${otherUserId}`).emit("call_ended", { sessionId, channelName });
    });

}
