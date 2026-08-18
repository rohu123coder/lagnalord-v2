import NodeGeocoder from "node-geocoder";

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

let anthropicClient: import("@anthropic-ai/sdk").default | null = null;

async function getWhatsAppAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!anthropicClient) {
    const { default: AnthropicSdk } = await import("@anthropic-ai/sdk");
    anthropicClient = new AnthropicSdk({ apiKey });
  }
  return anthropicClient;
}

export async function generateAstrologyReply(params: {
  systemPrompt: string;
  userMessage: string;
}): Promise<string> {
  const client = await getWhatsAppAnthropicClient();
  if (!client) {
    return "I'm having trouble reaching my astrology engine right now. Please try again shortly.";
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userMessage }],
    });

    return message.content
      .filter((block): block is import("@anthropic-ai/sdk").default.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  } catch (e) {
    console.error("[WhatsApp] Claude generation error:", e);
    return "Something went wrong generating your reading. Please try again.";
  }
}
