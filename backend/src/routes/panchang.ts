import express from "express";

import {
  dateToJD,
  getPlanetLon,
  getSwisseph,
  nakshatraFromLon,
} from "./kundali.js";

const router = express.Router();

const SE_SUN = 0;
const SE_MOON = 1;

const TITHI_BASE_NAMES = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
] as const;

const YOGA_NAMES = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shoola",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyan",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
] as const;

const MOVABLE_KARANAS = [
  "Bava",
  "Balava",
  "Kaulava",
  "Taitila",
  "Garaja",
  "Vanija",
  "Vishti",
] as const;

const VAAR_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const VAAR_HI = ["Ravivar", "Somvar", "Mangalvar", "Budhvar", "Guruvar", "Shukravar", "Shanivar"] as const;

/** 1-based eighth of daylight. Index = JS weekday (0=Sunday). */
const RAHU_KAAL_SEGMENT = [8, 2, 7, 5, 6, 4, 3] as const;
const YAMAGANDA_SEGMENT = [5, 4, 3, 2, 1, 7, 6] as const;
const GULIKA_SEGMENT = [7, 6, 5, 4, 3, 2, 1] as const;

const DAY_CHOGHADIYA = ["Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog"] as const;
/** First day Choghadiya index into DAY_CHOGHADIYA by weekday. */
const DAY_CHOGHADIYA_START = [0, 3, 6, 2, 5, 1, 4] as const;

const NIGHT_CHOGHADIYA = ["Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg"] as const;
/** First night Choghadiya index into NIGHT_CHOGHADIYA by weekday. */
const NIGHT_CHOGHADIYA_START = [0, 1, 2, 3, 4, 5, 6] as const;

const CHOGHADIYA_NATURE: Record<string, "auspicious" | "inauspicious" | "neutral"> = {
  Amrit: "auspicious",
  Shubh: "auspicious",
  Labh: "auspicious",
  Char: "auspicious",
  Udveg: "inauspicious",
  Kaal: "inauspicious",
  Rog: "inauspicious",
};

/** Chaldean hora cycle starting at Sun. */
const HORA_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"] as const;
/** First hora lord index into HORA_ORDER by weekday (Sun=0 … Sat=6). */
const HORA_START = [0, 3, 6, 2, 5, 1, 4] as const;

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;
const DEFAULT_UTC_OFFSET = 5.5;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayYmd(utcOffset: number): string {
  const ms = Date.now() + utcOffset * 3600 * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function weekdayIndex(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function jdUtToLocalDate(jdUt: number, utcOffset: number): Date {
  return new Date((jdUt - 2440587.5) * 86400000 + utcOffset * 3600 * 1000);
}

function formatLocalTime(jdUt: number, utcOffset: number): string {
  const d = jdUtToLocalDate(jdUt, utcOffset);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${pad2(h)}:${pad2(m)} ${ampm}`;
}

function formatPeriod(startJd: number, endJd: number, utcOffset: number): string {
  return `${formatLocalTime(startJd, utcOffset)} - ${formatLocalTime(endJd, utcOffset)}`;
}

function normalizeDeg(value: number): number {
  const n = value % 360;
  return n < 0 ? n + 360 : n;
}

function tithiFromElongation(elong: number): {
  number: number;
  name: string;
  paksha: "Shukla" | "Krishna";
} {
  const number = Math.floor(elong / 12) % 30 + 1;
  const paksha: "Shukla" | "Krishna" = number <= 15 ? "Shukla" : "Krishna";
  let name: string;
  if (number === 15) name = "Purnima";
  else if (number === 30) name = "Amavasya";
  else name = TITHI_BASE_NAMES[(number - 1) % 15];
  return { number, name, paksha };
}

function karanaFromElongation(elong: number): string {
  const idx = Math.floor(elong / 6) % 60;
  if (idx === 0) return "Kimstughna";
  if (idx >= 57) return (["Shakuni", "Chatushpada", "Naga"] as const)[idx - 57];
  return MOVABLE_KARANAS[(idx - 1) % 7];
}

function yogaFromLongitudes(sunLon: number, moonLon: number): string {
  const sum = normalizeDeg(sunLon + moonLon);
  const idx = Math.floor(sum / (360 / 27)) % 27;
  return YOGA_NAMES[idx];
}

function splitEqual(startJd: number, endJd: number, parts: number): { start: number; end: number }[] {
  const span = endJd - startJd;
  const step = span / parts;
  return Array.from({ length: parts }, (_, i) => ({
    start: startJd + i * step,
    end: startJd + (i + 1) * step,
  }));
}

function riseTrans(
  swe: ReturnType<typeof getSwisseph>,
  tjdUt: number,
  rsmi: number,
  lat: number,
  lng: number
): number {
  const flags = swe.SEFLG_SPEED | swe.SEFLG_MOSEPH;
  const result = swe.swe_rise_trans(
    tjdUt,
    swe.SE_SUN,
    "",
    flags,
    rsmi,
    lng,
    lat,
    0,
    1013.25,
    15
  );
  if (result.error) {
    throw new Error(result.error);
  }
  if (typeof result.transitTime !== "number" || result.transitTime < 0) {
    throw new Error("Could not compute sunrise/sunset for this location and date");
  }
  return result.transitTime;
}

function calculatePanchang(opts: {
  date: string;
  lat: number;
  lng: number;
  utcOffset: number;
}) {
  const swe = getSwisseph();
  if (!swe) {
    throw new Error("Swiss Ephemeris not available");
  }

  const { date, lat, lng, utcOffset } = opts;
  const parts = date.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error("date must be YYYY-MM-DD");
  }
  const [year, month, day] = parts;
  const weekday = weekdayIndex(year, month, day);

  const jdMidnightLocal = dateToJD(year, month, day, 0, 0, utcOffset);
  const sunriseJd = riseTrans(swe, jdMidnightLocal, swe.SE_CALC_RISE | swe.SE_BIT_DISC_CENTER, lat, lng);
  const sunsetJd = riseTrans(swe, sunriseJd + 1 / 1440, swe.SE_CALC_SET | swe.SE_BIT_DISC_CENTER, lat, lng);
  const nextSunriseJd = riseTrans(
    swe,
    sunsetJd + 1 / 1440,
    swe.SE_CALC_RISE | swe.SE_BIT_DISC_CENTER,
    lat,
    lng
  );

  const sunLon = getPlanetLon(sunriseJd, SE_SUN);
  const moonLon = getPlanetLon(sunriseJd, SE_MOON);
  const elong = normalizeDeg(moonLon - sunLon);

  const tithi = tithiFromElongation(elong);
  const nakshatra = nakshatraFromLon(moonLon);
  const yoga = { name: yogaFromLongitudes(sunLon, moonLon) };
  const karana = { name: karanaFromElongation(elong) };
  const vaar = { english: VAAR_EN[weekday], hindi: VAAR_HI[weekday] };

  const dayEighths = splitEqual(sunriseJd, sunsetJd, 8);
  const nightEighths = splitEqual(sunsetJd, nextSunriseJd, 8);
  const muhurats = splitEqual(sunriseJd, sunsetJd, 15);
  const horas = splitEqual(sunriseJd, nextSunriseJd, 24);

  const rahuSeg = dayEighths[RAHU_KAAL_SEGMENT[weekday] - 1];
  const yamaSeg = dayEighths[YAMAGANDA_SEGMENT[weekday] - 1];
  const gulikaSeg = dayEighths[GULIKA_SEGMENT[weekday] - 1];

  const dayStart = DAY_CHOGHADIYA_START[weekday];
  const nightStart = NIGHT_CHOGHADIYA_START[weekday];
  const horaStart = HORA_START[weekday];

  return {
    date,
    lat,
    lng,
    utcOffset,
    tithi,
    nakshatra,
    yoga,
    karana,
    vaar,
    sunrise: formatLocalTime(sunriseJd, utcOffset),
    sunset: formatLocalTime(sunsetJd, utcOffset),
    rahuKaal: {
      start: formatLocalTime(rahuSeg.start, utcOffset),
      end: formatLocalTime(rahuSeg.end, utcOffset),
    },
    yamaganda: {
      start: formatLocalTime(yamaSeg.start, utcOffset),
      end: formatLocalTime(yamaSeg.end, utcOffset),
    },
    gulikaKaal: {
      start: formatLocalTime(gulikaSeg.start, utcOffset),
      end: formatLocalTime(gulikaSeg.end, utcOffset),
    },
    choghadiya: {
      day: dayEighths.map((seg, i) => {
        const name = DAY_CHOGHADIYA[(dayStart + i) % 7];
        return {
          period: formatPeriod(seg.start, seg.end, utcOffset),
          name,
          nature: CHOGHADIYA_NATURE[name],
        };
      }),
      night: nightEighths.map((seg, i) => {
        const name = NIGHT_CHOGHADIYA[(nightStart + i) % 7];
        return {
          period: formatPeriod(seg.start, seg.end, utcOffset),
          name,
          nature: CHOGHADIYA_NATURE[name],
        };
      }),
    },
    hora: horas.map((seg, i) => ({
      start: formatLocalTime(seg.start, utcOffset),
      end: formatLocalTime(seg.end, utcOffset),
      planet: HORA_ORDER[(horaStart + i) % 7],
    })),
    abhijitMuhurat: {
      start: formatLocalTime(muhurats[7].start, utcOffset),
      end: formatLocalTime(muhurats[7].end, utcOffset),
    },
  };
}

router.get("/", (req, res) => {
  try {
    const utcOffsetRaw = req.query.utcOffset ?? req.query.timezone ?? DEFAULT_UTC_OFFSET;
    const utcOffset = Number(utcOffsetRaw);
    if (!Number.isFinite(utcOffset)) {
      return res.status(400).json({ error: "utcOffset must be a number of hours (e.g. 5.5)" });
    }

    const dateParam = typeof req.query.date === "string" ? req.query.date : todayYmd(utcOffset);
    const lat = req.query.lat === undefined ? DEFAULT_LAT : Number(req.query.lat);
    const lng = req.query.lng === undefined ? DEFAULT_LNG : Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng must be numbers" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    const data = calculatePanchang({ date: dateParam, lat, lng, utcOffset });
    return res.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Panchang calculation failed";
    console.error("Panchang calculation error:", e);
    const status = msg.includes("must be") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

router.post("/", (req, res) => {
  try {
    const utcOffsetRaw = req.body?.utcOffset ?? req.body?.timezone ?? DEFAULT_UTC_OFFSET;
    const utcOffset = Number(utcOffsetRaw);
    if (!Number.isFinite(utcOffset)) {
      return res.status(400).json({ error: "utcOffset must be a number of hours (e.g. 5.5)" });
    }

    const dateParam =
      typeof req.body?.date === "string" ? req.body.date : todayYmd(utcOffset);
    const lat = req.body?.lat === undefined ? DEFAULT_LAT : Number(req.body.lat);
    const lng = req.body?.lng === undefined ? DEFAULT_LNG : Number(req.body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng must be numbers" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    const data = calculatePanchang({ date: dateParam, lat, lng, utcOffset });
    return res.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Panchang calculation failed";
    console.error("Panchang calculation error:", e);
    const status = msg.includes("must be") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

export default router;
export { calculatePanchang };
