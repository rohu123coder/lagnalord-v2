export const VASTU_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "Center"] as const;
export const VASTU_PROPERTY_TYPES = ["residential", "apartment", "office", "shop"] as const;

export type VastuDirection = (typeof VASTU_DIRECTIONS)[number];
export type VastuPropertyType = (typeof VASTU_PROPERTY_TYPES)[number];
export type VastuSeverity = "critical" | "high" | "medium" | "low";

export type RemedySet = {
  easy: string;
  moderate: string;
  color: string;
  element: "fire" | "water" | "earth" | "metal" | "wood" | "space" | "air";
  plants: string;
  crystals: string;
};

export type VastuRule = {
  id: string;
  object: string;
  objectLabel: string;
  idealZones: string[];
  beneficialZones: string[];
  remedyZones: string[];
  remedyDescription?: string;
  strictNoZones: string[];
  room: string;
  severity: VastuSeverity;
  problem: string;
  scientificReason: string;
  traditionalReason: string;
  remedy: RemedySet;
  expectedImprovement: string;
  confidenceScore: number;
  propertyTypes?: VastuPropertyType[];
};

export type ZoneActivationInfo = {
  fullName: string;
  deity: string;
  element: string;
  color: string;
  purpose: string;
  bestFor: string[];
  avoid: string[];
  affirmation: string;
};

export type DetectedObject = {
  name: string;
  position: string;
  vastuNote: string;
};

export type ClaudeIssueRemedy = {
  easy?: string;
  moderate?: string;
  color?: string;
  plants?: string;
  crystals?: string;
};

export type ClaudeRoomIssue = {
  object?: string;
  severity?: string;
  problem?: string;
  scientificReason?: string;
  traditionalReason?: string;
  remedy?: ClaudeIssueRemedy;
  expectedImprovement?: string;
  confidenceScore?: number;
};

export type DetectedRoom = {
  roomType: string;
  photoIndex: number;
  compassDirection: string;
  userDescription?: string;
  detectedObjects: DetectedObject[];
  colors: string[];
  naturalLight: "good" | "moderate" | "poor";
  ventilation: "good" | "moderate" | "poor";
  clutter: "none" | "moderate" | "high";
  structuralIssues: string[];
  aiIssues: ClaudeRoomIssue[];
  aiPositives: string[];
  aiRoomScore?: number;
};

export type VastuAnalysis = {
  detectedRooms: DetectedRoom[];
};

export type AppliedRule = {
  rule: VastuRule;
  room: string;
  direction: string;
  isViolation: boolean;
  detectedObject?: string;
  matchConfidence: number;
};

export type ElementBalance = {
  fire: number;
  water: number;
  earth: number;
  metal: number;
  wood: number;
};

export type VastuScores = {
  overallScore: number;
  financialScore: number;
  healthScore: number;
  relationshipScore: number;
  careerScore: number;
  elementBalance: ElementBalance;
  positiveEnergyZones: string[];
  negativeEnergyZones: string[];
};

export type Issue = {
  id: string;
  object: string;
  room: string;
  direction: string;
  severity: string;
  problem: string;
  scientificReason: string;
  traditionalReason: string;
  remedy: RemedySet;
  expectedImprovement: string;
  priority: number;
  confidenceScore: number;
};

export type RoomAnalysis = {
  roomType: string;
  score: number;
  positives: string[];
  issues: Issue[];
};

export type PanchtattvaZone = {
  score: number;
  zones: string[];
  recommendation: string;
};

export type VastuReport = {
  overallScore: number;
  grade: string;
  summary: string;
  scores: VastuScores;
  roomAnalyses: RoomAnalysis[];
  issues: Issue[];
  topPriorityFixes: string[];
  elementBalance: ElementBalance;
  panchtattvaAnalysis: {
    agni: PanchtattvaZone;
    jal: PanchtattvaZone;
    prithvi: PanchtattvaZone;
    vayu: PanchtattvaZone;
    akash: PanchtattvaZone;
  };
  energyMap: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  remedySummary: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  auspiciousColors: string[];
  avoidColors: string[];
  luckyElements: string[];
  professionalNote: string;
};

export function isValidPropertyType(value: string): value is VastuPropertyType {
  return (VASTU_PROPERTY_TYPES as readonly string[]).includes(value);
}
