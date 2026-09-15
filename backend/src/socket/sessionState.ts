import type { Server } from "socket.io";

import { pool } from "../db/index.js";

export type LiveSessionState = {
  startTime: number;
  timerInterval: ReturnType<typeof setInterval> | null;
  billed: boolean;
  userMessageCount: number;
  astrologerMessageCount: number;
};

export const liveSessions = new Map<string, LiveSessionState>();
export const waitingSessionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
export type PendingCall = {
  timeout: ReturnType<typeof setTimeout>;
  callerUserId: string;
  otherUserId: string;
  callType: "voice" | "video";
  channelName: string;
};
export const pendingCalls = new Map<string, PendingCall>();

export function ensureLiveSession(
  sessionId: string,
  startTime?: number
): LiveSessionState {
  const existing = liveSessions.get(sessionId);
  if (existing) {
    if (typeof startTime === "number" && Number.isFinite(startTime)) {
      existing.startTime = Math.min(existing.startTime, startTime);
    }
    return existing;
  }
  const next: LiveSessionState = {
    startTime:
      typeof startTime === "number" && Number.isFinite(startTime)
        ? startTime
        : Date.now(),
    timerInterval: null,
    billed: false,
    userMessageCount: 0,
    astrologerMessageCount: 0,
  };
  liveSessions.set(sessionId, next);
  return next;
}

/** Counts automated user intro toward session billing participation. */
export function noteAutomatedUserIntro(sessionId: string): void {
  const state = ensureLiveSession(sessionId);
  state.userMessageCount = (state.userMessageCount ?? 0) + 1;
}

export function clearWaitingSessionTimeout(sessionId: string): void {
  const t = waitingSessionTimeouts.get(sessionId);
  if (!t) {
    return;
  }
  clearTimeout(t);
  waitingSessionTimeouts.delete(sessionId);
}

async function autoCancelWaitingSession(
  io: Server,
  sessionId: string
): Promise<void> {
  clearWaitingSessionTimeout(sessionId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lockResult = await client.query<{
      id: string;
      user_id: string;
      astrologer_user_id: string;
      astrologer_name: string;
      status: string;
    }>(
      `SELECT cs.id,
              cs.user_id,
              a.user_id AS astrologer_user_id,
              au.name AS astrologer_name,
              cs.status
       FROM chat_sessions cs
       INNER JOIN astrologers a ON a.id = cs.astrologer_id
       INNER JOIN users au ON au.id = a.user_id
       WHERE cs.id = $1
       FOR UPDATE`,
      [sessionId]
    );
    const row = lockResult.rows[0];
    if (!row || row.status !== "waiting") {
      await client.query("ROLLBACK");
      return;
    }

    await client.query(
      `UPDATE chat_sessions
       SET status = 'ended',
           ended_at = now(),
           total_minutes = 0,
           total_charged = 0
       WHERE id = $1 AND status = 'waiting'`,
      [sessionId]
    );
    await client.query("COMMIT");

    stopSessionTimer(sessionId);
    liveSessions.delete(sessionId);

    const payload = {
      sessionId,
      reason: "astrologer_unavailable" as const,
    };
    io.to(sessionId).emit("session_cancelled", payload);
    io.to(`user:${row.user_id}`).emit("session_cancelled", payload);
    io.to(`user:${row.astrologer_user_id}`).emit("session_cancelled", payload);

    io.to(sessionId).emit("session_ended", {
      sessionId,
      duration: 0,
      charge: 0,
      astrologerName: row.astrologer_name,
      totalMinutes: 0,
      totalCharged: 0,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("autoCancelWaitingSession failed:", err);
  } finally {
    client.release();
  }
}

export function ensureWaitingSessionTimeout(io: Server, sessionId: string): void {
  if (waitingSessionTimeouts.has(sessionId)) {
    return;
  }
  const timeout = setTimeout(() => {
    void autoCancelWaitingSession(io, sessionId);
  }, 60_000);
  waitingSessionTimeouts.set(sessionId, timeout);
}

function emitSessionTick(io: Server, sessionId: string): void {
  const state = liveSessions.get(sessionId);
  if (!state) {
    return;
  }
  const elapsedMs = Date.now() - state.startTime;
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000));
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  io.to(sessionId).emit("session_tick", { elapsedMinutes, elapsedSeconds });
}

export function startSessionTimer(
  io: Server,
  sessionId: string,
  startTime?: number
): void {
  const state = ensureLiveSession(sessionId, startTime);
  if (state.timerInterval) {
    return;
  }
  state.timerInterval = setInterval(() => {
    if (!liveSessions.has(sessionId)) {
      return;
    }
    emitSessionTick(io, sessionId);
  }, 1000);
  emitSessionTick(io, sessionId);
  console.log("[TIMER] session started", sessionId, new Date().toISOString());
}

export function stopSessionTimer(sessionId: string): LiveSessionState | null {
  const state = liveSessions.get(sessionId);
  if (!state) {
    return null;
  }
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  state.timerInterval = null;
  return state;
}

