import { NextResponse } from "next/server";
import { z } from "zod";
import { find as findTimeZone } from "geo-tz";
import { DateTime } from "luxon";
import {
  computeKundli,
  type SwissEphemerisData,
} from "divinemarg-shared";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Resolves the real UTC offset (in hours) for a birth using lat/lng + date,
 * correctly accounting for DST. Falls back to 5.5 (IST) only if timezone
 * lookup fails for any reason (should be extremely rare).
 */
function resolveUtcOffsetFromCoords(
  lat: number,
  lng: number,
  dob: string,
  tob: string | null
): number {
  try {
    const zones = findTimeZone(lat, lng);
    const zone = zones[0];
    if (!zone) return 5.5;

    const [y, mo, d] = dob.split("-").map((x) => parseInt(x, 10));
    const [hh, mm] = tob ? tob.split(":").map((x) => parseInt(x, 10)) : [12, 0];

    const dt = DateTime.fromObject(
      { year: y, month: mo, day: d, hour: hh, minute: mm ?? 0 },
      { zone }
    );

    if (!dt.isValid) return 5.5;

    return dt.offset / 60;
  } catch (e) {
    console.error("Timezone resolution failed, defaulting to IST:", e);
    return 5.5;
  }
}

const bodySchema = z.object({
  name: z.string().min(1, "name is required"),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dob must be YYYY-MM-DD"),
  tob: z
    .union([
      z.string().regex(/^\d{1,2}:\d{2}$/, "tob must be HH:MM (24h)"),
      z.null(),
    ])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  pob: z.string().min(1, "pob is required"),
  lat: z.number().gte(-90, "lat must be >= -90").lte(90, "lat must be <= 90"),
  lng: z
    .number()
    .gte(-180, "lng must be >= -180")
    .lte(180, "lng must be <= 180"),
  gender: z.enum(["male", "female"]),
  utcOffset: z.number().finite().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join("; ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const body = parsed.data;

  const resolvedUtcOffset =
    typeof body.utcOffset === "number"
      ? body.utcOffset
      : resolveUtcOffsetFromCoords(body.lat, body.lng, body.dob, body.tob ?? null);

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/kundali/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dob: body.dob,
        tob: body.tob ?? null,
        lat: body.lat,
        lng: body.lng,
        utcOffset: resolvedUtcOffset,
      }),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text().catch(() => "");
      console.error(
        "Backend kundali error:",
        backendRes.status,
        errText.slice(0, 500)
      );
      return NextResponse.json(
        { error: "Kundli calculation service unavailable. Please try again." },
        { status: 503 }
      );
    }

    const backendJson = (await backendRes.json()) as {
      success?: boolean;
      data?: SwissEphemerisData;
      error?: string;
    };

    if (!backendJson.success || !backendJson.data) {
      return NextResponse.json(
        {
          error:
            backendJson.error ??
            "Kundli calculation failed. Please verify birth details.",
        },
        { status: 502 }
      );
    }

    const result = computeKundli(
      {
        name: body.name,
        dob: body.dob,
        tob: body.tob ?? null,
        pob: body.pob,
        lat: body.lat,
        lng: body.lng,
        gender: body.gender,
        utcOffset: resolvedUtcOffset,
      },
      backendJson.data
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("Kundli calculate route error:", e);
    const message = e instanceof Error ? e.message : "Calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
