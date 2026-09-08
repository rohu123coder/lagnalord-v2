import express from "express";

import {
  calculateKundaliFromInput,
  dateToJD,
  getPlanetLon,
  getSwisseph,
  type KundaliCalculateInput,
} from "./kundali.js";

const router = express.Router();

const SE_SATURN = 6;

const RASHI_NAMES = [
  "Mesh (Aries)",
  "Vrishabh (Taurus)",
  "Mithun (Gemini)",
  "Kark (Cancer)",
  "Singh (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrishchik (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makar (Capricorn)",
  "Kumbh (Aquarius)",
  "Meen (Pisces)",
];

export type SadeSatiPhase = "rising" | "peak" | "setting" | "none";

export type SadeSatiResult = {
  moonRashi: string;
  saturnTransitRashi: string;
  sadeSatiActive: boolean;
  phase: SadeSatiPhase;
  dhaiyaActive: boolean;
  dhaiyaKind: "fourth" | "eighth" | null;
  approxPhaseStart: string | null;
  approxPhaseEnd: string | null;
  asOf: string;
  houseFromMoon: number;
};

function rashiFromLon(lon: number): number {
  return Math.floor((((lon % 360) + 360) % 360) / 30);
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function utcTodayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function ymdToUtcMs(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  return Date.UTC(y, m - 1, d);
}

function utcMsToYmd(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function addUtcDays(ymd: string, days: number): string {
  return utcMsToYmd(ymdToUtcMs(ymd) + days * 86400000);
}

function saturnSiderealLonAtNoonUtc(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  return getPlanetLon(dateToJD(y, m, d, 12, 0, 0), SE_SATURN);
}

function saturnRashiAtNoonUtc(ymd: string): number {
  return rashiFromLon(saturnSiderealLonAtNoonUtc(ymd));
}

/** First UTC date in [afterExclusive, highInclusive] whose Saturn rashi matches. */
function firstDayWithRashi(
  afterExclusive: string,
  highInclusive: string,
  rashi: number
): string {
  let lo = ymdToUtcMs(afterExclusive);
  let hi = ymdToUtcMs(highInclusive);
  while (hi - lo > 86400000) {
    const mid = lo + Math.floor((hi - lo) / 2 / 86400000) * 86400000;
    if (saturnRashiAtNoonUtc(utcMsToYmd(mid)) === rashi) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return utcMsToYmd(hi);
}

/** Last UTC date in [lowInclusive, beforeExclusive) whose Saturn rashi matches. */
function lastDayWithRashi(
  lowInclusive: string,
  beforeExclusive: string,
  rashi: number
): string {
  let lo = ymdToUtcMs(lowInclusive);
  let hi = ymdToUtcMs(beforeExclusive);
  while (hi - lo > 86400000) {
    const mid = lo + Math.floor((hi - lo) / 2 / 86400000) * 86400000;
    if (saturnRashiAtNoonUtc(utcMsToYmd(mid)) === rashi) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return utcMsToYmd(lo);
}

/**
 * Current continuous stay of Saturn in `currentRashi` around `asOf`.
 * Walks in short steps so a retrograde dip into the neighbouring sign is not skipped.
 */
function currentSignStay(asOf: string, currentRashi: number): {
  start: string;
  end: string;
} {
  const stepDays = 4;
  const maxSteps = 400;

  let probe = asOf;
  let changed = addUtcDays(asOf, -stepDays);
  for (let i = 0; i < maxSteps; i++) {
    if (saturnRashiAtNoonUtc(changed) !== currentRashi) break;
    probe = changed;
    changed = addUtcDays(changed, -stepDays);
  }
  const start =
    saturnRashiAtNoonUtc(changed) === currentRashi
      ? probe
      : firstDayWithRashi(changed, probe, currentRashi);

  probe = asOf;
  changed = addUtcDays(asOf, stepDays);
  for (let i = 0; i < maxSteps; i++) {
    if (saturnRashiAtNoonUtc(changed) !== currentRashi) break;
    probe = changed;
    changed = addUtcDays(changed, stepDays);
  }
  const end =
    saturnRashiAtNoonUtc(changed) === currentRashi
      ? probe
      : lastDayWithRashi(probe, changed, currentRashi);

  return { start, end };
}

function phaseFromHouse(houseFromMoon: number): SadeSatiPhase {
  if (houseFromMoon === 12) return "rising";
  if (houseFromMoon === 1) return "peak";
  if (houseFromMoon === 2) return "setting";
  return "none";
}

export function calculateSadeSatiFromInput(
  input: KundaliCalculateInput & { asOf?: string }
): SadeSatiResult {
  if (!getSwisseph()) {
    throw new Error("Swiss Ephemeris not available");
  }

  const asOf = input.asOf && isYmd(input.asOf) ? input.asOf : utcTodayYmd();
  const chart = calculateKundaliFromInput(input);
  const moon = chart.planets.find((p) => p.name === "Moon");
  if (!moon) {
    throw new Error("Missing natal Moon in Kundli calculation");
  }

  const saturnLon = saturnSiderealLonAtNoonUtc(asOf);
  const saturnRashiIndex = rashiFromLon(saturnLon);
  const houseFromMoon = ((saturnRashiIndex - moon.rashiIndex + 12) % 12) + 1;
  const phase = phaseFromHouse(houseFromMoon);
  const sadeSatiActive = phase !== "none";
  const dhaiyaActive = houseFromMoon === 4 || houseFromMoon === 8;
  const dhaiyaKind = houseFromMoon === 4 ? "fourth" : houseFromMoon === 8 ? "eighth" : null;

  let approxPhaseStart: string | null = null;
  let approxPhaseEnd: string | null = null;
  if (sadeSatiActive || dhaiyaActive) {
    const stay = currentSignStay(asOf, saturnRashiIndex);
    approxPhaseStart = stay.start;
    approxPhaseEnd = stay.end;
  }

  return {
    moonRashi: moon.rashi,
    saturnTransitRashi: RASHI_NAMES[saturnRashiIndex] ?? "",
    sadeSatiActive,
    phase,
    dhaiyaActive,
    dhaiyaKind,
    approxPhaseStart,
    approxPhaseEnd,
    asOf,
    houseFromMoon,
  };
}

router.post("/calculate", async (req, res) => {
  try {
    const { dob, tob, lat, lng, utcOffset = 5.5, asOf, asOfDate } = req.body;

    if (!dob || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Missing required fields: dob, lat, lng" });
    }

    const latN = Number(lat);
    const lngN = Number(lng);
    const utcN = Number(utcOffset);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      return res.status(400).json({ error: "lat and lng must be numbers" });
    }
    if (typeof tob !== "string" || !/^\d{1,2}:\d{2}$/.test(tob.trim().slice(0, 5))) {
      return res.status(400).json({ error: "tob is required in HH:MM format" });
    }
    const asOfRaw = asOfDate ?? asOf;
    if (asOfRaw != null && (typeof asOfRaw !== "string" || !isYmd(asOfRaw))) {
      return res.status(400).json({ error: "asOf must be YYYY-MM-DD" });
    }

    const data = calculateSadeSatiFromInput({
      dob,
      tob: tob.trim().slice(0, 5),
      lat: latN,
      lng: lngN,
      utcOffset: Number.isFinite(utcN) ? utcN : 5.5,
      asOf: typeof asOfRaw === "string" ? asOfRaw : undefined,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Calculation failed";
    console.error("Sade Sati calculation error:", e);
    const status = msg.includes("Missing required fields") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

export default router;
