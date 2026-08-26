import { NextResponse } from "next/server";
import NodeGeocoder from "node-geocoder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
  fetch: globalThis.fetch.bind(globalThis),
  osmServer: "https://nominatim.openstreetmap.org",
  headers: {
    "User-Agent": "LagnaLord-Kundli-App/1.0 (contact: support@lagnalords.com)",
  },
} as any);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter q" },
      { status: 400 }
    );
  }

  async function tryGeocode() {
    const raw = await geocoder.geocode(q!);
    return (Array.isArray(raw) ? raw : []).map((r) => ({
      city: r.city ?? r.administrativeLevels?.level2long ?? "",
      country: r.country ?? "",
      lat: r.latitude,
      lng: r.longitude,
      formattedAddress: r.formattedAddress ?? "",
    }));
  }

  try {
    const results = await tryGeocode();
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Geocoding failed";
    const isRateLimited = message.includes("429") || message.toLowerCase().includes("too many requests");
    if (isRateLimited) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const results = await tryGeocode();
        return NextResponse.json({ results });
      } catch (e2) {
        const message2 = e2 instanceof Error ? e2.message : "Geocoding failed";
        return NextResponse.json(
          { error: "Place search is temporarily busy. Please wait a moment and try again." },
          { status: 503 }
        );
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
