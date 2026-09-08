import express from "express";

import {
  calculateKundaliFromInput,
  type KundaliCalculateInput,
} from "./kundali.js";

const router = express.Router();

const CLASSICAL_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
] as const;

const KAAL_SARP_TYPES: Record<number, string> = {
  1: "Anant",
  2: "Kulik",
  3: "Vasuki",
  4: "Shankhpal",
  5: "Padma",
  6: "Mahapadma",
  7: "Takshak",
  8: "Karkotak",
  9: "Shankhchud",
  10: "Ghatak",
  11: "Vishdhar",
  12: "Sheshnag",
};

const NODE_CONJUNCT_ORB_DEG = 2;

export type AxisSide = "rahu_to_ketu" | "ketu_to_rahu";

export type KaalSarpPlanetPosition = {
  name: string;
  longitude: number;
  relativeToRahu: number;
  sideOfAxis: AxisSide;
  conjunctNode: boolean;
};

export type KaalSarpDoshaResult = {
  isPresent: boolean;
  type: string | null;
  rahuHouse: number;
  ketuHouse: number;
  rahuLongitude: number;
  ketuLongitude: number;
  planetPositions: KaalSarpPlanetPosition[];
  anyPlanetConjunctNode: boolean;
};

function normalizeLon(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

function angularSep(a: number, b: number): number {
  const d = Math.abs(normalizeLon(a) - normalizeLon(b));
  return Math.min(d, 360 - d);
}

function houseFromRashi(planetRashi: number, referenceRashi: number): number {
  return ((planetRashi - referenceRashi + 12) % 12) + 1;
}

function planetByName(
  planets: Array<{ name: string; longitude: number; rashiIndex: number }>,
  name: string
) {
  const planet = planets.find((p) => p.name === name);
  if (!planet) {
    throw new Error(`Missing planet ${name} in Kundli calculation`);
  }
  return planet;
}

export function calculateKaalSarpDoshaFromInput(
  input: KundaliCalculateInput
): KaalSarpDoshaResult {
  const chart = calculateKundaliFromInput(input);
  const rahu = planetByName(chart.planets, "Rahu");
  const ketu = planetByName(chart.planets, "Ketu");
  const rahuLon = normalizeLon(rahu.longitude);
  const ketuLon = normalizeLon(ketu.longitude);

  const planetPositions: KaalSarpPlanetPosition[] = CLASSICAL_PLANETS.map((name) => {
    const planet = planetByName(chart.planets, name);
    const lon = normalizeLon(planet.longitude);
    const relativeToRahu = normalizeLon(lon - rahuLon);
    const sideOfAxis: AxisSide =
      relativeToRahu <= 180 ? "rahu_to_ketu" : "ketu_to_rahu";
    const conjunctNode =
      angularSep(lon, rahuLon) <= NODE_CONJUNCT_ORB_DEG ||
      angularSep(lon, ketuLon) <= NODE_CONJUNCT_ORB_DEG;
    return {
      name,
      longitude: lon,
      relativeToRahu,
      sideOfAxis,
      conjunctNode,
    };
  });

  const allRahuToKetu = planetPositions.every((p) => p.sideOfAxis === "rahu_to_ketu");
  const allKetuToRahu = planetPositions.every((p) => p.sideOfAxis === "ketu_to_rahu");
  const isPresent = allRahuToKetu || allKetuToRahu;

  const rahuHouse = houseFromRashi(rahu.rashiIndex, chart.ascendant.rashiIndex);
  const ketuHouse = houseFromRashi(ketu.rashiIndex, chart.ascendant.rashiIndex);
  const anyPlanetConjunctNode = planetPositions.some((p) => p.conjunctNode);

  return {
    isPresent,
    type: isPresent ? (KAAL_SARP_TYPES[rahuHouse] ?? null) : null,
    rahuHouse,
    ketuHouse,
    rahuLongitude: rahuLon,
    ketuLongitude: ketuLon,
    planetPositions,
    anyPlanetConjunctNode,
  };
}

router.post("/calculate", async (req, res) => {
  try {
    const { dob, tob, lat, lng, utcOffset = 5.5 } = req.body;

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

    const data = calculateKaalSarpDoshaFromInput({
      dob,
      tob: tob.trim().slice(0, 5),
      lat: latN,
      lng: lngN,
      utcOffset: Number.isFinite(utcN) ? utcN : 5.5,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Calculation failed";
    console.error("Kaal Sarp Dosha calculation error:", e);
    const status = msg.includes("Missing required fields") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

export default router;
