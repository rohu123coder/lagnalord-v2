import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import { connect as connectRedis } from "./lib/redis.js";
import { adminRouter } from "./routes/admin.js";
import { astrologerRouter } from "./routes/astrologer.js";
import { astrologersRouter } from "./routes/astrologers.js";
import { authRouter } from "./routes/auth.js";
import { callsRouter } from "./routes/calls.js";
import { chatRouter } from "./routes/chat.js";
import { handFaceReadingRouter } from "./routes/handFaceReading.js";
import kundaliRouter from "./routes/kundali.js";
import aiAstrologerRouter from "./routes/aiAstrologer.js";
import vastuRouter from "./routes/vastu.js";
import { notificationsRouter } from "./routes/notifications.js";
import { setSocketServer } from "./socket/io.js";
import { registerSocketHandlers } from "./socket/index.js";
import { sessionsRouter } from "./routes/sessions.js";
import { usersRouter } from "./routes/users.js";
import { leadsRouter } from "./routes/leads.js";
import { razorpayWebhookHandler } from "./routes/webhooks.js";
import { walletRouter } from "./routes/wallet.js";
import whatsappRouter from "./routes/whatsapp.js";
import kaalSarpDoshaRouter from "./routes/kaalSarpDosha.js";
import lalKitabRouter from "./routes/lalKitab.js";
import mangalDoshaRouter from "./routes/mangalDosha.js";
import panchangRouter from "./routes/panchang.js";
import publicSettingsRouter from "./routes/publicSettings.js";
import sadeSatiRouter from "./routes/sadeSati.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const app = express();
app.use(cors({ origin: "*" }));

app.post(
  "/api/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhookHandler
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/astrologers", astrologersRouter);
app.use("/api/astrologer", astrologerRouter);
app.use("/api/chat", chatRouter);
app.use("/api/kundali", kundaliRouter);
app.use("/api/mangal-dosha", mangalDoshaRouter);
app.use("/api/panchang", panchangRouter);
app.use("/api/settings", publicSettingsRouter);
app.use("/api/sade-sati", sadeSatiRouter);
app.use("/api/kaal-sarp-dosha", kaalSarpDoshaRouter);
app.use("/api/lal-kitab", lalKitabRouter);
app.use("/api/ai-astrologer", aiAstrologerRouter);
app.use("/api/readings", handFaceReadingRouter);
app.use("/api/vastu", vastuRouter);
app.use("/api/calls", callsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/whatsapp", whatsappRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setSocketServer(io);
registerSocketHandlers(io);

const port = Number(process.env.PORT) || 4000;

httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

connectRedis().catch((err) => {
  console.error("Redis connection failed (non-fatal, server still running):", err.message);
});
