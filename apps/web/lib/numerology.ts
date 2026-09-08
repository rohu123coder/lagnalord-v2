/** Chaldean letter values. There is no 9 in the letter chart. */
export const CHALDEAN_MAP: Record<string, number> = {
  A: 1,
  I: 1,
  J: 1,
  Q: 1,
  Y: 1,
  B: 2,
  K: 2,
  R: 2,
  C: 3,
  G: 3,
  L: 3,
  S: 3,
  D: 4,
  M: 4,
  T: 4,
  E: 5,
  H: 5,
  N: 5,
  X: 5,
  U: 6,
  V: 6,
  W: 6,
  O: 7,
  Z: 7,
  F: 8,
  P: 8,
};

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export function chaldeanLetterValue(ch: string): number {
  const key = ch.toUpperCase();
  return CHALDEAN_MAP[key] ?? 0;
}

/** Reduce any positive integer to a single digit 1–9. */
export function reduceToSingleDigit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  let n = Math.abs(Math.floor(value));
  while (n > 9) {
    n = n
      .toString()
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return n;
}

export function sumDigitsInString(input: string): number {
  return input.split("").reduce((sum, ch) => {
    const d = Number(ch);
    return Number.isInteger(d) ? sum + d : sum;
  }, 0);
}

/**
 * Mulank (birth number) from the calendar day of birth.
 * 15 May → 1+5 = 6. Full YYYY-MM-DD is accepted; only the day is used.
 */
export function mulankFromDob(dob: string): number {
  const parts = dob.trim().split("-");
  const day = Number(parts[2] ?? dob.replace(/\D/g, "").slice(-2));
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return 0;
  }
  return reduceToSingleDigit(day);
}

export type NameNumbers = {
  destiny: number;
  personality: number;
  soulUrge: number;
  destinyRaw: number;
  personalityRaw: number;
  soulUrgeRaw: number;
};

function sumNameLetters(name: string, mode: "all" | "vowels" | "consonants"): number {
  return name.split("").reduce((sum, ch) => {
    const upper = ch.toUpperCase();
    const val = chaldeanLetterValue(upper);
    if (!val) {
      return sum;
    }
    const isVowel = VOWELS.has(upper);
    if (mode === "vowels" && !isVowel) {
      return sum;
    }
    if (mode === "consonants" && isVowel) {
      return sum;
    }
    return sum + val;
  }, 0);
}

export function computeNameNumbers(name: string): NameNumbers {
  const destinyRaw = sumNameLetters(name, "all");
  const personalityRaw = sumNameLetters(name, "consonants");
  const soulUrgeRaw = sumNameLetters(name, "vowels");
  return {
    destinyRaw,
    personalityRaw,
    soulUrgeRaw,
    destiny: reduceToSingleDigit(destinyRaw),
    personality: reduceToSingleDigit(personalityRaw),
    soulUrge: reduceToSingleDigit(soulUrgeRaw),
  };
}

export type Compatibility = "favorable" | "neutral" | "avoid";

const FRIENDLY_GROUPS: number[][] = [
  [1, 5, 7],
  [2, 4, 8],
  [3, 6, 9],
];

const CLASH_PAIRS = new Set(["1-8", "8-1", "2-9", "9-2", "4-5", "5-4", "5-8", "8-5"]);

function sameFriendlyGroup(a: number, b: number): boolean {
  return FRIENDLY_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

/**
 * Simple name-vs-Mulank check used by the lucky-name calculator.
 * Same friendly triad → favorable; well-known clashes → avoid; otherwise neutral.
 */
export function compareNameToMulank(nameNumber: number, mulank: number): Compatibility {
  if (!nameNumber || !mulank) {
    return "neutral";
  }
  if (nameNumber === mulank || sameFriendlyGroup(nameNumber, mulank)) {
    return "favorable";
  }
  if (CLASH_PAIRS.has(`${nameNumber}-${mulank}`)) {
    return "avoid";
  }
  return "neutral";
}

export const compareDestinyNumbers = compareNameToMulank;

/**
 * Love % from two Destiny digits (1–9).
 * 100 minus 9 per step of gap, plus small bonuses for a match, a 9/10 sum,
 * or a friendly triad; a clash pair knocks 12 off. Clamped to 18–99.
 */
export function lovePercentageFromDestiny(a: number, b: number): number {
  if (!a || !b) {
    return 0;
  }
  const gap = Math.abs(a - b);
  let score = 100 - gap * 9;
  if (a === b) {
    score += 8;
  }
  if (a + b === 9 || a + b === 10) {
    score += 10;
  }
  const pair = compareDestinyNumbers(a, b);
  if (pair === "favorable" && a !== b) {
    score += 6;
  }
  if (pair === "avoid") {
    score -= 12;
  }
  return Math.min(99, Math.max(18, score));
}

/** Unique-letter overlap (Jaccard) scaled into 35–95. Used only by friendship. */
export function friendshipPercentageFromNames(nameA: string, nameB: string): number {
  const setA = new Set(
    nameA
      .toUpperCase()
      .split("")
      .filter((ch) => ch >= "A" && ch <= "Z")
  );
  const setB = new Set(
    nameB
      .toUpperCase()
      .split("")
      .filter((ch) => ch >= "A" && ch <= "Z")
  );
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let shared = 0;
  Array.from(setA).forEach((ch) => {
    if (setB.has(ch)) {
      shared += 1;
    }
  });
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size
  const jaccard = shared / union;
  return Math.round(35 + 60 * jaccard);
}

export const MULANK_PLANETS: Record<number, string> = {
  1: "Sun",
  2: "Moon",
  3: "Jupiter",
  4: "Rahu",
  5: "Mercury",
  6: "Venus",
  7: "Ketu",
  8: "Saturn",
  9: "Mars",
};
