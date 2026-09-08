import { DateTime } from "luxon";
import { find as findTimeZone } from "geo-tz";
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolveUtcOffset(lat: number, lng: number, date: string): number {
  try {
    const zones = findTimeZone(lat, lng);
    const zone = zones[0];
    if (!zone) return 5.5;
    const [y, mo, d] = date.split("-").map((x) => parseInt(x, 10));
    const dt = DateTime.fromObject({ year: y, month: mo, day: d, hour: 12 }, { zone });
    if (!dt.isValid) return 5.5;
    return dt.offset / 60;
  } catch {
    return 5.5;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const lat = Number(url.searchParams.get("lat") ?? "28.6139");
  const lng = Number(url.searchParams.get("lng") ?? "77.2090");

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng must be numbers" }, { status: 400 });
  }

  const dateParam = date ?? DateTime.now().toFormat("yyyy-MM-dd");
  const utcOffset = resolveUtcOffset(lat, lng, dateParam);

  try {
    const params = new URLSearchParams({
      date: dateParam,
      lat: String(lat),
      lng: String(lng),
      utcOffset: String(utcOffset),
    });
    const backendRes = await fetch(`${BACKEND_URL}/api/panchang?${params.toString()}`);
    const json = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: json?.error ?? "Panchang service unavailable. Please try again." },
        { status: backendRes.status >= 400 ? backendRes.status : 503 }
      );
    }
    return NextResponse.json(json);
  } catch (e) {
    console.error("Panchang proxy error:", e);
    return NextResponse.json(
      { error: "Could not load Panchang. Please try again." },
      { status: 500 }
    );
  }
}
