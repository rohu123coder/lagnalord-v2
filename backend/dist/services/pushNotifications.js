import { Expo, } from "expo-server-sdk";
import { pool } from "../db/index.js";
const expo = new Expo();
const SEND_MAX_ATTEMPTS = 3;
const SEND_BACKOFF_MS = [400, 1200, 2800];
async function sleep(ms) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
async function sendChunkWithRetry(chunk) {
    let lastErr;
    for (let attempt = 0; attempt < SEND_MAX_ATTEMPTS; attempt++) {
        try {
            return await expo.sendPushNotificationsAsync(chunk);
        }
        catch (err) {
            lastErr = err;
            if (attempt < SEND_MAX_ATTEMPTS - 1) {
                await sleep(SEND_BACKOFF_MS[attempt] ?? 1000);
            }
        }
    }
    console.error("[Push] sendPushNotificationsAsync failed after retries:", lastErr);
    return [];
}
function stringifyData(type, data) {
    const out = { type };
    if (!data) {
        return out;
    }
    for (const [k, v] of Object.entries(data)) {
        if (v === undefined || v === null) {
            continue;
        }
        out[k] = typeof v === "string" ? v : String(v);
    }
    return out;
}
export async function sendPushNotification(payload) {
    try {
        const result = await pool.query(`SELECT expo_push_token
       FROM users
       WHERE id = $1::uuid
         AND expo_push_token IS NOT NULL
         AND push_enabled = true`, [payload.userId]);
        if (result.rowCount === 0) {
            console.log(`[Push] No token for user ${payload.userId} (or disabled)`);
            return false;
        }
        const token = result.rows[0]?.expo_push_token;
        if (!token) {
            return false;
        }
        if (!Expo.isExpoPushToken(token)) {
            console.error(`[Push] Invalid Expo token for user ${payload.userId}`);
            await pool.query(`UPDATE users SET expo_push_token = NULL WHERE id = $1::uuid`, [
                payload.userId,
            ]);
            return false;
        }
        const message = {
            to: token,
            title: payload.title,
            body: payload.body,
            data: stringifyData(payload.type, payload.data),
            sound: payload.sound === null ? null : "default",
            priority: payload.priority ?? "high",
            channelId: payload.channelId ?? "default",
            badge: payload.badge,
        };
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];
        for (const chunk of chunks) {
            const ticketChunk = await sendChunkWithRetry(chunk);
            tickets.push(...ticketChunk);
        }
        for (const ticket of tickets) {
            if (ticket.status === "error") {
                console.error(`[Push] Ticket error for user ${payload.userId}:`, ticket.message, ticket.details);
                if (ticket.details?.error === "DeviceNotRegistered") {
                    await pool.query(`UPDATE users SET expo_push_token = NULL WHERE id = $1::uuid`, [
                        payload.userId,
                    ]);
                    console.log(`[Push] Cleared invalid token for user ${payload.userId}`);
                }
                return false;
            }
        }
        const receiptIds = tickets
            .filter((t) => t.status === "ok")
            .map((t) => t.id);
        if (receiptIds.length > 0) {
            setTimeout(() => {
                void checkReceiptsAndCleanupUsers(receiptIds, [payload.userId]);
            }, 15 * 60 * 1000);
        }
        console.log(`[Push] Sent to user ${payload.userId}: ${payload.title}`);
        return true;
    }
    catch (err) {
        console.error("[Push] Send notification error:", err);
        return false;
    }
}
export async function sendBulkPushNotifications(userIds, payload) {
    if (userIds.length === 0) {
        return { sent: 0, failed: 0 };
    }
    try {
        const result = await pool.query(`SELECT id, expo_push_token
       FROM users
       WHERE id = ANY($1::uuid[])
         AND expo_push_token IS NOT NULL
         AND push_enabled = true`, [userIds]);
        const queued = [];
        const invalidUserIds = [];
        for (const row of result.rows) {
            if (!Expo.isExpoPushToken(row.expo_push_token)) {
                invalidUserIds.push(row.id);
                continue;
            }
            queued.push({
                userId: row.id,
                message: {
                    to: row.expo_push_token,
                    title: payload.title,
                    body: payload.body,
                    data: stringifyData(payload.type, payload.data),
                    sound: payload.sound === null ? null : "default",
                    priority: payload.priority ?? "default",
                    channelId: payload.channelId ?? "default",
                },
            });
        }
        if (invalidUserIds.length > 0) {
            await pool.query(`UPDATE users SET expo_push_token = NULL WHERE id = ANY($1::uuid[])`, [invalidUserIds]);
        }
        if (queued.length === 0) {
            return { sent: 0, failed: 0 };
        }
        const messages = queued.map((q) => q.message);
        const chunks = expo.chunkPushNotifications(messages);
        let sent = 0;
        let failed = 0;
        const receiptIdToUserId = new Map();
        let offset = 0;
        for (const chunk of chunks) {
            const chunkLen = chunk.length;
            const metaSlice = queued.slice(offset, offset + chunkLen);
            offset += chunkLen;
            const tickets = await sendChunkWithRetry(chunk);
            for (let i = 0; i < tickets.length; i++) {
                const ticket = tickets[i];
                const userId = metaSlice[i]?.userId;
                if (!ticket || !userId) {
                    continue;
                }
                if (ticket.status === "ok") {
                    sent++;
                    receiptIdToUserId.set(ticket.id, userId);
                }
                else {
                    failed++;
                    console.error("[Push] Bulk ticket error:", ticket.message);
                    if (ticket.details?.error === "DeviceNotRegistered") {
                        await pool.query(`UPDATE users SET expo_push_token = NULL WHERE id = $1::uuid`, [
                            userId,
                        ]);
                    }
                }
            }
        }
        console.log(`[Push] Bulk send complete: ${sent} sent, ${failed} failed`);
        const receiptIds = [...receiptIdToUserId.keys()];
        if (receiptIds.length > 0) {
            setTimeout(() => {
                void checkReceiptsAndCleanupUsers(receiptIds, receiptIds.map((id) => receiptIdToUserId.get(id)).filter(Boolean));
            }, 15 * 60 * 1000);
        }
        return { sent, failed };
    }
    catch (err) {
        console.error("[Push] Bulk send error:", err);
        return { sent: 0, failed: userIds.length };
    }
}
async function checkReceiptsAndCleanupUsers(ticketIds, userIdsHint) {
    try {
        const receiptChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
        for (const chunk of receiptChunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
            for (const [receiptId, receipt] of Object.entries(receipts)) {
                const typed = receipt;
                if (typed.status === "error") {
                    console.error(`[Push] Receipt error for ${receiptId}:`, typed.message);
                    if (typed.details?.error === "DeviceNotRegistered") {
                        const token = typed.details?.expoPushToken;
                        if (typeof token === "string" && token.length > 0) {
                            await pool.query(`UPDATE users SET expo_push_token = NULL WHERE expo_push_token = $1`, [token]);
                        }
                        else if (userIdsHint.length === 1) {
                            await pool.query(`UPDATE users SET expo_push_token = NULL WHERE id = $1::uuid`, [
                                userIdsHint[0],
                            ]);
                        }
                        console.log("[Push] DeviceNotRegistered — token cleared from receipts");
                    }
                }
            }
        }
    }
    catch (err) {
        console.error("[Push] Check receipts error:", err);
    }
}
export async function notifyIncomingChat(params) {
    return sendPushNotification({
        userId: params.astrologerUserId,
        title: "🔔 New Chat Request",
        body: `${params.userName} wants to consult you`,
        type: "incoming_chat",
        channelId: "chat-messages",
        priority: "high",
        data: { sessionId: params.sessionId },
    });
}
export async function notifyIncomingCall(params) {
    return sendPushNotification({
        userId: params.astrologerUserId,
        title: "📞 Incoming Call",
        body: `${params.userName} is calling you`,
        type: "incoming_call",
        channelId: "incoming-call",
        priority: "high",
        data: { sessionId: params.sessionId },
    });
}
export async function notifyNewMessage(params) {
    const preview = params.message.length > 100 ? `${params.message.substring(0, 97)}...` : params.message;
    return sendPushNotification({
        userId: params.recipientId,
        title: params.senderName,
        body: preview,
        type: "new_message",
        channelId: "chat-messages",
        priority: "high",
        data: { sessionId: params.sessionId },
    });
}
export async function notifyWalletCredited(params) {
    return sendPushNotification({
        userId: params.userId,
        title: "💰 Wallet Recharged",
        body: `₹${params.amount} added. New balance: ₹${params.newBalance}`,
        type: "wallet_credited",
        channelId: "wallet",
        priority: "high",
        data: { amount: params.amount, balance: params.newBalance },
    });
}
export async function notifySessionEnded(params) {
    return sendPushNotification({
        userId: params.userId,
        title: "Consultation Ended",
        body: `Session with ${params.astrologerName} • ${params.duration} min • ₹${params.cost}`,
        type: "session_ended",
        channelId: "default",
        priority: "normal",
        data: { duration: params.duration, cost: params.cost },
    });
}
