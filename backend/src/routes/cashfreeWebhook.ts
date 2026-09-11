import type { Request, Response } from "express";

import {
  creditCashfreeRechargeIfPending,
  getCashfreeWebhookVerifier,
} from "./wallet.js";

type CashfreeWebhookBody = {
  type?: string;
  data?: {
    order?: { order_id?: string };
    payment?: {
      cf_payment_id?: string;
      payment_status?: string;
    };
  };
};

export async function cashfreeWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const rawBody = req.body as Buffer;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ success: false, error: "Invalid body" });
    return;
  }

  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];
  if (typeof signature !== "string" || typeof timestamp !== "string") {
    res.status(400).json({ success: false, error: "Invalid signature" });
    return;
  }

  const rawBodyUtf8 = rawBody.toString("utf8");

  let verified: { object?: CashfreeWebhookBody };
  try {
    const cf = getCashfreeWebhookVerifier();
    verified = cf.PGVerifyWebhookSignature(signature, rawBodyUtf8, timestamp);
  } catch (err) {
    console.error("[Webhook] Cashfree signature failed:", err);
    res.status(400).json({ success: false, error: "Invalid signature" });
    return;
  }

  let body: CashfreeWebhookBody;
  try {
    body = (verified.object ?? JSON.parse(rawBodyUtf8)) as CashfreeWebhookBody;
  } catch {
    res.status(400).json({ success: false, error: "Invalid JSON" });
    return;
  }

  const paymentStatus = body.data?.payment?.payment_status;
  const isSuccess =
    body.type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS";

  if (!isSuccess) {
    res.json({ success: true, received: true });
    return;
  }

  const orderId = body.data?.order?.order_id;
  if (!orderId) {
    res.json({ success: true, received: true });
    return;
  }

  try {
    const result = await creditCashfreeRechargeIfPending({
      cashfreeOrderId: orderId,
      cashfreePaymentId: body.data?.payment?.cf_payment_id ?? null,
    });
    if (!result.ok) {
      console.warn("[Webhook] Cashfree order not found:", orderId);
    }
    res.json({ success: true, received: true });
  } catch (err) {
    console.error("[Webhook] Cashfree handler error:", err);
    res.status(500).json({ success: false, error: "Webhook processing failed" });
  }
}
