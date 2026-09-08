import express from "express";

import { calculateKundaliFromInput, type KundaliCalculateInput } from "./kundali.js";

const router = express.Router();

const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];
/** Aries, Scorpio */
const MARS_OWN_RASHI = [0, 7];
/** Capricorn */
const MARS_EXALT_RASHI = 9;
/** Classical Jupiter aspects: 5th, 7th, 9th (whole sign). */
const JUPITER_ASPECT_HOUSES = [5, 7, 9];

export type MangalDoshaResult = {
  isManglik: boolean;
  moonChartManglik: boolean;
  venusChartManglik: boolean;
  marsHouse: number;
  marsHouseFromMoon: number;
  marsHouseFromVenus: number;
  marsRashi: string;
  marsRashiIndex: number;
  moonRashi: string;
  moonRashiIndex: number;
  venusRashi: string;
  lagnaRashi: string;
  lagnaRashiIndex: number;
  naturalDosha: boolean;
  cancellationFactors: string[];
  explanation: string;
};

function houseFromRashi(planetRashi: number, referenceRashi: number): number {
  return ((planetRashi - referenceRashi + 12) % 12) + 1;
}

function jupiterAspectsTarget(jupRashi: number, targetRashi: number): boolean {
  return JUPITER_ASPECT_HOUSES.includes(houseFromRashi(targetRashi, jupRashi));
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function planetByName(
  planets: Array<{ name: string; rashi: string; rashiIndex: number }>,
  name: string
) {
  const planet = planets.find((p) => p.name === name);
  if (!planet) {
    throw new Error(`Missing planet ${name} in Kundli calculation`);
  }
  return planet;
}

export function calculateMangalDoshaFromInput(
  input: KundaliCalculateInput
): MangalDoshaResult {
  const chart = calculateKundaliFromInput(input);
  const mars = planetByName(chart.planets, "Mars");
  const moon = planetByName(chart.planets, "Moon");
  const venus = planetByName(chart.planets, "Venus");
  const jupiter = planetByName(chart.planets, "Jupiter");

  const lagnaRashiIndex = chart.ascendant.rashiIndex;
  const marsHouse = houseFromRashi(mars.rashiIndex, lagnaRashiIndex);
  const marsHouseFromMoon = houseFromRashi(mars.rashiIndex, moon.rashiIndex);
  const marsHouseFromVenus = houseFromRashi(mars.rashiIndex, venus.rashiIndex);

  const naturalDosha = MANGLIK_HOUSES.includes(marsHouse);
  const moonChartManglik = MANGLIK_HOUSES.includes(marsHouseFromMoon);
  const venusChartManglik = MANGLIK_HOUSES.includes(marsHouseFromVenus);

  const cancellationFactors: string[] = [];
  if (naturalDosha) {
    const jupiterAspectsMars = jupiterAspectsTarget(
      jupiter.rashiIndex,
      mars.rashiIndex
    );
    const marsWithJupiter = mars.rashiIndex === jupiter.rashiIndex;
    const marsOwn = MARS_OWN_RASHI.includes(mars.rashiIndex);
    const marsExalted = mars.rashiIndex === MARS_EXALT_RASHI;

    if (jupiterAspectsMars) {
      cancellationFactors.push("Mars is completely aspected by Jupiter");
    }
    if (marsWithJupiter) {
      cancellationFactors.push("Mars is conjunct Jupiter");
    }
    if (marsOwn) {
      cancellationFactors.push("Mars is in its own sign (Aries/Scorpio)");
    }
    if (marsExalted) {
      cancellationFactors.push("Mars is exalted in Capricorn");
    }
  }

  const isManglik = naturalDosha && cancellationFactors.length === 0;

  let explanation: string;
  if (!naturalDosha) {
    explanation = `Mars is in the ${ordinal(marsHouse)} house from the Ascendant (${chart.ascendant.rashi}), which is not a Mangal Dosha house. Overall status is Non-Manglik.`;
  } else if (cancellationFactors.length > 0) {
    explanation = `Natural Mangal Dosha is present because Mars occupies the ${ordinal(marsHouse)} house from the Ascendant (${chart.ascendant.rashi}). Cancellation applies, so the overall status is Non-Manglik.`;
  } else {
    explanation = `Mangal Dosha is present. Mars occupies the ${ordinal(marsHouse)} house from the Ascendant (${chart.ascendant.rashi}), one of the houses classically linked to this dosha.`;
  }

  if (moonChartManglik) {
    explanation += ` In the Moon chart, Mars is in the ${ordinal(marsHouseFromMoon)} house from the Moon (${moon.rashi}), so Moon-chart Manglik is indicated.`;
  }

  return {
    isManglik,
    moonChartManglik,
    venusChartManglik,
    marsHouse,
    marsHouseFromMoon,
    marsHouseFromVenus,
    marsRashi: mars.rashi,
    marsRashiIndex: mars.rashiIndex,
    moonRashi: moon.rashi,
    moonRashiIndex: moon.rashiIndex,
    venusRashi: venus.rashi,
    lagnaRashi: chart.ascendant.rashi,
    lagnaRashiIndex,
    naturalDosha,
    cancellationFactors,
    explanation,
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

    const data = calculateMangalDoshaFromInput({
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
    console.error("Mangal Dosha calculation error:", e);
    const status = msg.includes("Missing required fields") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
});

export default router;
