import jwt from "jsonwebtoken";
import type { Server } from "socket.io";

import { pool } from "../db/index.js";
import { registerCallHandlers } from "./callHandlers.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { billingTick } from "./sessionBilling.js";
import { registerWaitlistHandlers } from "./waitlistHandlers.js";

export { noteAutomatedUserIntro } from "./sessionState.js";

declare module "socket.io" {
  interface SocketData {
    user: {
      userId: string;
      role?: string;
    };
    userId?: string;
    role?: string;
    astrologerId?: string;
  }
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error("JWT_SECRET is required");
  }
  return s;
}

export function registerSocketHandlers(io: Server): void {
  const secret = getSecret();

  io.use((socket, next) => {
    const raw = socket.handshake.auth;
    const token =
      raw && typeof raw === "object" && "token" in raw ? raw.token : undefined;
    if (typeof token !== "string" || !token.trim()) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const decoded = jwt.verify(token, secret) as {
        userId?: string;
        role?: string;
      };
      if (!decoded?.userId) {
        next(new Error("Unauthorized"));
        return;
      }
      socket.data.user = {
        userId: decoded.userId,
        role: decoded.role,
      };
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  setInterval(() => {
    void billingTick(io).catch((err) =>
      console.error("billingTick failed:", err)
    );
  }, 60_000);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.userId}`);
    if (socket.data.role === "astrologer") {
      void (async () => {
        const astroResult = await pool.query<{ id: string }>(
          `SELECT id FROM astrologers WHERE user_id = $1 LIMIT 1`,
          [user.userId]
        );
        const astrologerId = astroResult.rows[0]?.id;
        if (astrologerId) {
          socket.data.astrologerId = astrologerId;
        }
      })().catch((err) => {
        console.error("failed to load astrologer socket context:", err);
      });
    }

    socket.on("join_user_room", () => {
      socket.join(`user:${user.userId}`);
    });

    registerWaitlistHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);
  });
}
