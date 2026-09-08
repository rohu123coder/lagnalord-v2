export const FLAMES_LETTERS = ["F", "L", "A", "M", "E", "S"] as const;

export type FlamesLetter = (typeof FLAMES_LETTERS)[number];

export const FLAMES_LABELS: Record<FlamesLetter, string> = {
  F: "Friends",
  L: "Lovers",
  A: "Affectionate",
  M: "Marriage",
  E: "Enemies",
  S: "Siblings",
};

export type FlamesResult = {
  remaining: number;
  letter: FlamesLetter;
  label: string;
  leftoverA: string;
  leftoverB: string;
};

export function lettersOnly(name: string): string[] {
  return name
    .toUpperCase()
    .split("")
    .filter((ch) => ch >= "A" && ch <= "Z");
}

/**
 * Classic schoolyard FLAMES: cancel matching letters one-for-one across the
 * two names, then walk the F-L-A-M-E-S wheel with that leftover count until
 * one letter remains. A total cancel (remaining 0) maps to Siblings.
 */
export function computeFlames(nameA: string, nameB: string): FlamesResult | null {
  const a = lettersOnly(nameA);
  const b = lettersOnly(nameB);
  if (a.length === 0 || b.length === 0) {
    return null;
  }

  const bagB = [...b];
  const leftoverA: string[] = [];
  for (const ch of a) {
    const idx = bagB.indexOf(ch);
    if (idx >= 0) {
      bagB.splice(idx, 1);
    } else {
      leftoverA.push(ch);
    }
  }
  const leftoverB = bagB;
  const remaining = leftoverA.length + leftoverB.length;
  const letter = remaining === 0 ? "S" : strikeFlames(remaining);

  return {
    remaining,
    letter,
    label: FLAMES_LABELS[letter],
    leftoverA: leftoverA.join(""),
    leftoverB: leftoverB.join(""),
  };
}

function strikeFlames(count: number): FlamesLetter {
  const pile: FlamesLetter[] = ["F", "L", "A", "M", "E", "S"];
  let idx = 0;
  while (pile.length > 1) {
    idx = (idx + count - 1) % pile.length;
    pile.splice(idx, 1);
  }
  return pile[0];
}
