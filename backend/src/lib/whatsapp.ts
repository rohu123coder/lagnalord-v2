import NodeGeocoder from "node-geocoder";

import { generateText } from "./aiProvider.js";
import { findBestMatch } from "./knowledgeRetrieval.js";

const WHATSAPP_API_VERSION = "v25.0";

function graphApiUrl(path: string): string {
  return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${path}`;
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    console.error("[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return;
  }

  try {
    const res = await fetch(graphApiUrl(`${phoneNumberId}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body, preview_url: false },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[WhatsApp] Send failed:", res.status, errText);
    }
  } catch (e) {
    console.error("[WhatsApp] Send error:", e);
  }
}

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
  fetch: globalThis.fetch.bind(globalThis),
});

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

export async function geocodePlace(place: string): Promise<GeocodeResult | null> {
  try {
    const raw = await geocoder.geocode(place);
    const first = Array.isArray(raw) ? raw[0] : undefined;
    if (!first || first.latitude == null || first.longitude == null) {
      return null;
    }
    return {
      lat: first.latitude,
      lng: first.longitude,
      formattedAddress: first.formattedAddress ?? place,
    };
  } catch (e) {
    console.error("[WhatsApp] Geocode error:", e);
    return null;
  }
}

export async function generateAstrologyReply(params: {
  systemPrompt: string;
  userMessage: string;
  knowledgeCategory?: string;
}): Promise<string> {
  if (params.knowledgeCategory) {
    try {
      const kbHit = await findBestMatch(params.knowledgeCategory, params.userMessage);
      if (kbHit) {
        return kbHit.answer;
      }
    } catch (e) {
      console.error("[WhatsApp] Knowledge base lookup failed, falling through to Gemini:", e);
    }
  }

  try {
    const text = await generateText({
      systemPrompt: params.systemPrompt,
      userMessage: params.userMessage,
    });
    return text || "Something went wrong generating your reading. Please try again.";
  } catch (e) {
    console.error("[WhatsApp] Gemini generation error:", e);
    if (e instanceof Error && e.message.includes("GEMINI_API_KEY")) {
      console.error("[WhatsApp] GEMINI_API_KEY not set");
      return "I'm having trouble reaching my astrology engine right now. Please try again shortly.";
    }
    return "Something went wrong generating your reading. Please try again.";
  }
}
