const ZONE_NAME_ALIASES: Record<string, string> = {
  NORTH: "N",
  SOUTH: "S",
  EAST: "E",
  WEST: "W",
  CENTER: "Center",
};

const SIXTEEN_ZONE_LABELS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

function normalizeZoneLabel(zone: string): string {
  const trimmed = zone.trim();
  const upper = trimmed.toUpperCase();
  if (ZONE_NAME_ALIASES[upper]) return ZONE_NAME_ALIASES[upper];
  if (upper === "SHARING_TOILET_WALL") return "sharing_toilet_wall";
  const subMatch = trimmed.match(/^([NSEW]{1,3})(\d+)$/i);
  if (subMatch) return `${subMatch[1].toUpperCase()}${subMatch[2]}`;
  return trimmed.length <= 3 ? upper : trimmed;
}

function getZoneParent(zone: string): string | null {
  const normalized = normalizeZoneLabel(zone);
  const subMatch = normalized.match(/^([NSEW]{1,3})(\d+)$/);
  if (subMatch) return subMatch[1];
  return normalized.length <= 3 ? normalized : null;
}

export function zoneMatches(detectedZones: string[], ruleZone: string): boolean {
  const ruleNormalized = normalizeZoneLabel(ruleZone);
  if (ruleNormalized === "sharing_toilet_wall") return false;

  for (const detected of detectedZones) {
    const dn = normalizeZoneLabel(detected);
    if (dn === ruleNormalized) return true;

    const detectedParent = getZoneParent(dn);
    const ruleParent = getZoneParent(ruleNormalized);
    if (detectedParent && ruleParent && detectedParent === ruleParent) return true;
    if (detectedParent === ruleNormalized || dn === ruleParent) return true;

    if (ruleNormalized === "N" && (dn === "N" || dn.startsWith("N"))) return true;
    if (ruleNormalized === "S" && (dn === "S" || dn.startsWith("S"))) return true;
    if (ruleNormalized === "E" && (dn === "E" || dn.startsWith("E"))) return true;
    if (ruleNormalized === "W" && (dn === "W" || dn.startsWith("W"))) return true;
  }
  return false;
}

export function degreesToDirection16(degrees: number, northDirection: number): string {
  const adjusted = ((degrees - northDirection) % 360 + 360) % 360;
  const index = Math.round(adjusted / 22.5) % 16;
  return SIXTEEN_ZONE_LABELS[index] ?? "N";
}

export function degreesToSubZone(degrees: number, northDirection: number): string {
  const adjusted = ((degrees - northDirection) % 360 + 360) % 360;
  const octantLabels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const octantIndex = Math.floor(((adjusted + 22.5) % 360) / 45);
  const sectorStart = octantIndex * 45;
  const offsetInSector = (adjusted - sectorStart + 360) % 360;
  const subIndex = Math.min(8, Math.max(1, Math.floor(offsetInSector / (45 / 8)) + 1));
  return `${octantLabels[octantIndex]}${subIndex}`;
}

export function resolveZones(
  direction: string,
  degrees?: number,
  northDirection?: number
): string[] {
  const zones = new Set<string>();
  zones.add(normalizeZoneLabel(direction));

  if (degrees !== undefined && northDirection !== undefined) {
    zones.add(degreesToDirection16(degrees, northDirection));
    zones.add(degreesToSubZone(degrees, northDirection));
    const adjusted = ((degrees - northDirection) % 360 + 360) % 360;
    const octantLabels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    zones.add(octantLabels[Math.round(adjusted / 45) % 8] ?? "N");
  }

  const parsed = parseZoneFromText(direction);
  if (parsed) zones.add(parsed);

  return [...zones];
}

function parseZoneFromText(text: string): string | null {
  const upper = text.toUpperCase();
  for (const zone of [...SIXTEEN_ZONE_LABELS, "N", "NE", "E", "SE", "S", "SW", "W", "NW"]) {
    if (upper.includes(zone)) return zone;
  }
  const subMatch = text.match(/\b([NSEW]{1,2})([1-8])\b/i);
  if (subMatch) return `${subMatch[1].toUpperCase()}${subMatch[2]}`;
  return null;
}

export function degreesToDirection(degrees: number, northDirection: number): string {
  const adjusted = ((degrees - northDirection) % 360 + 360) % 360;
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(adjusted / 45) % 8;
  return labels[index] ?? "N";
}

export function parseDirectionFromText(text: string): string | null {
  const normalized = text.toUpperCase();
  const order = ["NE", "NW", "SE", "SW", "N", "E", "S", "W", "CENTER"];
  for (const dir of order) {
    if (normalized.includes(dir)) return dir === "CENTER" ? "Center" : dir;
  }
  return null;
}
