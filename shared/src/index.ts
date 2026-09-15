export type ApiErrorShape = {
  code: string;
  message: string;
};

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export {
  computeKundli,
  type KundliInput,
  type SwissEphemerisData,
} from "./kundli/computeKundli";

export {
  NAKSHATRA_LORDS,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
  VIM_ORDER,
  VIM_YEARS,
  chaldeanNumerology,
  debilitationSign,
  degreesToDMS,
  exaltationSign,
  houseFromDeg,
  ownSigns,
  planetInfo,
  rashiFromDegree,
  rashiFromIndex,
  signLordPlanetKey,
  type PlanetKey,
  type VimPlanet,
} from "./kundli/ephemerisUtils";
