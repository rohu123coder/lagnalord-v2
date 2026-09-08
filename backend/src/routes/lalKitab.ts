import express from "express";

import {
  calculateKundaliFromInput,
  type KundaliCalculateInput,
} from "./kundali.js";

const router = express.Router();

const PLANET_ORDER = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;

const KAAL_PURUSH_SIGNS = [
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
] as const;

/** Commonly cited Lal Kitab pakka ghar list. Nodes are not in this table. */
const PAKKA_GHAR: Record<string, number[]> = {
  Sun: [1],
  Moon: [4],
  Mars: [1],
  Mercury: [2, 6],
  Jupiter: [2, 5, 9, 12],
  Venus: [7],
  Saturn: [10, 11],
};

export type LalKitabHouse = {
  houseNumber: number;
  sign: string;
  planets: string[];
};

export type LalKitabPlanetDetail = {
  name: string;
  house: number;
  pakkaGharHouses: number[];
  isInPakkaGhar: boolean;
  isSleeping: boolean;
};

export type LalKitabResult = {
  lagna: string;
  houses: LalKitabHouse[];
  planetDetails: LalKitabPlanetDetail[];
};

function seventhHouse(house: number): number {
  return ((house - 1 + 6) % 12) + 1;
}

function planetByName(
  planets: Array<{ name: string; rashiIndex: number }>,
  name: string
) {
  const planet = planets.find((p) => p.name === name);
  if (!planet) {
    throw new Error(`Missing planet ${name} in Kundli calculation`);
  }
  return planet;
}

export function calculateLalKitabFromInput(
  input: KundaliCalculateInput
): LalKitabResult {
  const chart = calculateKundaliFromInput(input);

  const houses: LalKitabHouse[] = KAAL_PURUSH_SIGNS.map((sign, index) => ({
    houseNumber: index + 1,
    sign,
    planets: [],
  }));

  const houseByPlanet = new Map<string, number>();
  for (const name of PLANET_ORDER) {
    const planet = planetByName(chart.planets, name);
    const house = planet.rashiIndex + 1;
    houseByPlanet.set(name, house);
    houses[house - 1].planets.push(name);
  }

  const planetDetails: LalKitabPlanetDetail[] = PLANET_ORDER.map((name) => {
    const house = houseByPlanet.get(name) ?? 1;
    const pakkaGharHouses = PAKKA_GHAR[name] ?? [];
    const isInPakkaGhar = pakkaGharHouses.includes(house);
    const opposite = seventhHouse(house);
    const oppositeOccupied = houses[opposite - 1].planets.some((other) => other !== name);
    const isSleeping = !isInPakkaGhar && !oppositeOccupied;
    return {
      name,
      house,
      pakkaGharHouses,
      isInPakkaGhar,
      isSleeping,
    };
  });

  return {
    lagna: chart.ascendant.rashi,
    houses,
    planetDetails,
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

    const data = calculateLalKitabFromInput({
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
    console.error("Lal Kitab calculation error:", e);
    const status = msg.includes("Missing required fields") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

export default router;
