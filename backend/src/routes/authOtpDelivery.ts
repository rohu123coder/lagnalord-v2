import { randomBytes } from "node:crypto";

import { query } from "../db/index.js";
import { sendPasswordResetEmail } from "../lib/email.js";

export function frontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [userId, token]
  );

  return token;
}

export async function sendResetLinkEmail(email: string, path: string, userId: string): Promise<void> {
  const token = await createPasswordResetToken(userId);
  const resetLink = `${frontendUrl()}${path}?token=${token}`;
  await sendPasswordResetEmail(email, resetLink);
}

export async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.CLICKFOX_API_KEY;
  const templateName = process.env.CLICKFOX_WHATSAPP_TEMPLATE || 'otp_logins';
  if (!apiKey) {
    return false;
  }
  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const res = await fetch('https://app.clickfox.in/api/v1/whatsapp/send-template', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        template_name: templateName,
        language: 'en_US',
        variables: [otp],
      }),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`WhatsApp OTP sent to ${phone}, message_id: ${data.message_id}`);
      return true;
    } else {
      console.error('ClickFox WhatsApp OTP failed:', data.error);
      return false;
    }
  } catch (e) {
    console.error('ClickFox WhatsApp OTP error:', e);
    return false;
  }
}

export async function sendSmsOTP(phone: string, otp: string): Promise<void> {
  const whatsappSent = await sendWhatsAppOTP(phone, otp);
  if (whatsappSent) {
    return;
  }
  // Fallback to Fast2SMS (existing logic unchanged below)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'dlt',
          sender_id: 'egyans',
          message: '213571',
          variables_values: otp,
          flash: 0,
          numbers: phone,
        }),
      });
      const smsData = await smsRes.json() as { return: boolean; message?: string };
      if (!smsData.return) {
        console.error('Fast2SMS DLT failed:', JSON.stringify(smsData));
      } else {
        console.log(`SMS sent to ${phone} via Fast2SMS DLT`);
      }
    } catch (e) {
      console.error('Fast2SMS error:', e);
    }
  } else {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
  }
}
