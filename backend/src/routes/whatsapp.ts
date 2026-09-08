import { Router, type Request, type Response } from "express";

import { query } from "../db/index.js";
import { sendWhatsAppText, geocodePlace, generateAstrologyReply } from "../lib/whatsapp.js";
import { calculateKundaliFromInput } from "./kundali.js";

const router = Router();

const FREE_QUESTION_LIMIT = 2;

type ConversationRow = {
  id: string;
  phone: string;
  status: string;
  current_step: string;
  collected_data: Record<string, unknown>;
  question_count: number;
  free_questions_used: number;
  chart_data: Record<string, unknown> | null;
};

async function getOrCreateConversation(phone: string): Promise<ConversationRow> {
  const existing = await query<ConversationRow>(
    "SELECT * FROM whatsapp_conversations WHERE phone = $1",
    [phone]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query<ConversationRow>(
    `INSERT INTO whatsapp_conversations (phone) VALUES ($1) RETURNING *`,
    [phone]
  );
  return created.rows[0]!;
}

async function updateConversation(
  id: string,
  patch: Partial<{
    current_step: string;
    collected_data: Record<string, unknown>;
    chart_data: Record<string, unknown>;
    free_questions_used: number;
    question_count: number;
  }>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (patch.current_step !== undefined) {
    sets.push(`current_step = $${i++}`);
    values.push(patch.current_step);
  }
  if (patch.collected_data !== undefined) {
    sets.push(`collected_data = $${i++}::jsonb`);
    values.push(JSON.stringify(patch.collected_data));
  }
  if (patch.chart_data !== undefined) {
    sets.push(`chart_data = $${i++}::jsonb`);
    values.push(JSON.stringify(patch.chart_data));
  }
  if (patch.free_questions_used !== undefined) {
    sets.push(`free_questions_used = $${i++}`);
    values.push(patch.free_questions_used);
  }
  if (patch.question_count !== undefined) {
    sets.push(`question_count = $${i++}`);
    values.push(patch.question_count);
  }
  sets.push(`updated_at = now()`);

  values.push(id);
  await query(`UPDATE whatsapp_conversations SET ${sets.join(", ")} WHERE id = $${i}`, values);
}

function parseFlexibleDate(text: string): string | null {
  const trimmed = text.trim();

  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    const year = parsed.getFullYear();
    const month = parsed.getMonth() + 1;
    const day = parsed.getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

function parseFlexibleTime(text: string): { tob: string | null; approximate: boolean } | null {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === "unknown" || trimmed === "don't know" || trimmed === "dont know") {
    return { tob: null, approximate: true };
  }

  const ampm = trimmed.match(/^(\d{1,2})[:.]?(\d{2})?\s*(am|pm)$/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = ampm[2] ? Number(ampm[2]) : 0;
    const suffix = ampm[3].toLowerCase();
    if (suffix === "pm" && hour !== 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { tob: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, approximate: false };
    }
  }

  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hour = Number(h24[1]);
    const minute = Number(h24[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { tob: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, approximate: false };
    }
  }

  return null;
}

function chartSummaryText(chart: any, name: string): string {
  const lines = [
    `🔮 *${name}'s Birth Chart Summary*`,
    "",
    `☀️ Sun — ${chart.sunSign.rashi}`,
    `🌙 Moon — ${chart.moonSign.rashi}`,
    `🌅 Ascendant — ${chart.ascendant.rashi}`,
    `⭐ Nakshatra — ${chart.nakshatra.name} (Pada ${chart.nakshatra.pada})`,
    "",
  ];
  if (chart.approximate) {
    lines.push("_Note: Birth time was not provided, so Ascendant is approximate._");
  }
  return lines.join("\n");
}

const NARRATION_SYSTEM_PROMPT = `You are Tara, a warm and insightful Vedic astrology guide speaking to a user over WhatsApp.

You will be given a JSON object with a person's REAL, precisely calculated birth chart data: Ascendant, Sun sign, Moon sign, Nakshatra, and planetary positions (each planet's zodiac sign).

CRITICAL RULES:
1. Only reference facts that are present in the JSON you are given. Never invent specific numeric scores, Dasha periods, Yoga names, or Dosha names that are not explicitly provided — doing so would be dishonest since we have not calculated those yet.
2. Write a warm, personalized 2-3 paragraph narrative connecting their Ascendant, Moon sign, and Sun sign into a cohesive picture of their personality, grounded ONLY in classical Vedic significations of those specific signs and nakshatra.
3. Use WhatsApp-friendly formatting: short paragraphs, occasional relevant emoji, *bold* for emphasis using single asterisks.
4. End by warmly inviting them to ask a question about career, love, health, or finances.
5. Keep the total response under 350 words.`;

const QA_SYSTEM_PROMPT_PREFIX = `You are Tara, a warm and insightful Vedic astrology guide speaking to a user over WhatsApp.

You will be given a JSON object with a person's REAL, precisely calculated birth chart: Ascendant, Sun sign, Moon sign, Nakshatra, and planetary positions (sign placement per planet).

CRITICAL RULES:
1. Only reference facts present in the JSON. Never invent specific numeric scores, exact Dasha date ranges, or named Yogas/Doshas that are not in the data — we have not calculated those yet, and inventing them would be dishonest.
2. You CAN speak generally about classical significations of the planets' sign placements relevant to the user's question (career, finance, relationships, health) based on real Vedic astrology principles.
3. Answer the user's specific question warmly and specifically, in 150-250 words, WhatsApp-formatted (short paragraphs, *bold* with single asterisks, light emoji use).
4. If asked something the chart data cannot address (e.g. exact timing without Dasha data), be honest that a deeper reading would need more calculation, rather than guessing.

Birth chart data:
`;

router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      res.sendStatus(200);
      return;
    }

    const from: string = message.from;
    const text: string = message.text?.body ?? "";

    if (!from || !text) {
      res.sendStatus(200);
      return;
    }

    const conversation = await getOrCreateConversation(from);
    await handleStep(conversation, text.trim());

    res.sendStatus(200);
  } catch (e) {
    console.error("[WhatsApp] Webhook error:", e);
    res.sendStatus(200);
  }
});

async function handleStep(conversation: ConversationRow, text: string): Promise<void> {
  const { id, phone, current_step, collected_data, chart_data, free_questions_used } = conversation;

  switch (current_step) {
    case "language_select": {
      await sendWhatsAppText(
        phone,
        "🙏 Namaste! I'm Tara — your personal Vedic Astrology guide.\n\nLet's create your personalized birth chart. What is your name?"
      );
      await updateConversation(id, { current_step: "name" });
      return;
    }

    case "name": {
      if (text.length < 2) {
        await sendWhatsAppText(phone, "Please share your full name to continue.");
        return;
      }
      await sendWhatsAppText(
        phone,
        `Nice to meet you, ${text}! 🙏\n\nWhat is your date of birth?\n\nYou can write it like:\n• 15/08/1990\n• 15 August 1990`
      );
      await updateConversation(id, {
        current_step: "dob",
        collected_data: { ...collected_data, name: text },
      });
      return;
    }

    case "dob": {
      const dob = parseFlexibleDate(text);
      if (!dob) {
        await sendWhatsAppText(phone, "Hmm, that doesn't look like a valid date. Try again like 25/02/1988");
        return;
      }
      await sendWhatsAppText(
        phone,
        "⏰ What time were you born?\n\nExamples:\n• 10:30 AM\n• 22:15\n\nIf you don't know, type 'unknown'"
      );
      await updateConversation(id, {
        current_step: "time",
        collected_data: { ...collected_data, dob },
      });
      return;
    }

    case "time": {
      const parsedTime = parseFlexibleTime(text);
      if (!parsedTime) {
        await sendWhatsAppText(phone, "I couldn't understand that time. Try like 10:30 AM, 22:15, or type 'unknown'");
        return;
      }
      await sendWhatsAppText(phone, "📍 Where were you born?\n\nExample: Gwalior, MP");
      await updateConversation(id, {
        current_step: "place",
        collected_data: { ...collected_data, tob: parsedTime.tob, timeApproximate: parsedTime.approximate },
      });
      return;
    }

    case "place": {
      const geo = await geocodePlace(text);
      if (!geo) {
        await sendWhatsAppText(phone, "I couldn't find that place. Try a nearby major city, e.g. 'Gwalior, India'");
        return;
      }
      const newData: Record<string, unknown> = { ...collected_data, place: text, lat: geo.lat, lng: geo.lng };
      const priorData = collected_data as { name?: string; dob?: string; tob?: string | null };
      await sendWhatsAppText(
        phone,
        `📋 Please confirm your details:\n\n👤 Name: ${priorData.name}\n📅 DOB: ${priorData.dob}\n⏰ Time: ${priorData.tob ?? "Unknown"}\n📍 Place: ${geo.formattedAddress}\n\nReply *YES* to confirm and generate your chart ✨`
      );
      await updateConversation(id, { current_step: "confirm", collected_data: newData });
      return;
    }

    case "confirm": {
      const normalized = text.toLowerCase();
      if (!normalized.includes("yes") && !normalized.includes("confirm")) {
        await sendWhatsAppText(phone, "Reply *YES* to confirm your details, or send your date of birth again to restart.");
        return;
      }

      await sendWhatsAppText(phone, "✨ Calculating your birth chart, please wait ~20 seconds...");

      const data = collected_data as { name: string; dob: string; tob: string | null; lat: number; lng: number };

      let chart;
      try {
        chart = calculateKundaliFromInput({
          dob: data.dob,
          tob: data.tob,
          lat: data.lat,
          lng: data.lng,
          utcOffset: 5.5,
        });
      } catch (e) {
        console.error("[WhatsApp] Kundali calculation failed:", e);
        await sendWhatsAppText(phone, "Something went wrong calculating your chart. Please try again in a bit.");
        return;
      }

      await sendWhatsAppText(phone, chartSummaryText(chart, data.name));

      const narration = await generateAstrologyReply({
        systemPrompt: NARRATION_SYSTEM_PROMPT,
        userMessage: JSON.stringify(chart),
      });
      await sendWhatsAppText(phone, narration);

      await sendWhatsAppText(
        phone,
        `💬 What's on your mind — career, relationships, health, or finances?\n\n✨ You have ${FREE_QUESTION_LIMIT} free questions — ask away!`
      );

      await updateConversation(id, {
        current_step: "qa",
        chart_data: chart,
        free_questions_used: 0,
      });
      return;
    }

    case "qa": {
      if (free_questions_used >= FREE_QUESTION_LIMIT) {
        await sendWhatsAppText(
          phone,
          "You've used your free questions for this reading. 🙏\n\nTo continue getting personalized guidance, please visit lagnalords.com to recharge your wallet and consult with our AI astrologer or a live expert."
        );
        return;
      }

      const answer = await generateAstrologyReply({
        systemPrompt: QA_SYSTEM_PROMPT_PREFIX + JSON.stringify(chart_data),
        userMessage: text,
        knowledgeCategory: "astrology",
      });
      await sendWhatsAppText(phone, answer);

      const nowUsed = free_questions_used + 1;
      await updateConversation(id, {
        free_questions_used: nowUsed,
        question_count: conversation.question_count + 1,
      });

      if (nowUsed >= FREE_QUESTION_LIMIT) {
        await sendWhatsAppText(
          phone,
          "That was your last free question for now. 🙏 Visit lagnalords.com anytime to continue your consultation."
        );
      }
      return;
    }

    default: {
      await updateConversation(id, { current_step: "language_select" });
      await handleStep({ ...conversation, current_step: "language_select" }, text);
    }
  }
}

export default router;
