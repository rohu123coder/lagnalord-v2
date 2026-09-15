import {
  VASTU_RULES,
  VASTU_OBJECTS_COVERED,
} from "./vastuRules.js";
import {
  parseDirectionFromText,
  resolveZones,
  zoneMatches,
} from "./vastuGeometry.js";
import {
  VASTU_DIRECTIONS,
  type AppliedRule,
  type DetectedRoom,
  type ElementBalance,
  type Issue,
  type PanchtattvaZone,
  type RemedySet,
  type RoomAnalysis,
  type VastuAnalysis,
  type VastuPropertyType,
  type VastuReport,
  type VastuRule,
  type VastuScores,
  type VastuSeverity,
} from "./vastuTypes.js";

const SEVERITY_DEDUCTION: Record<VastuSeverity, number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
};

const SEVERITY_PRIORITY: Record<VastuSeverity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

const FINANCIAL_OBJECTS = new Set([
  "main_entrance",
  "safe",
  "dining_table",
]);

const HEALTH_OBJECTS = new Set([
  "kitchen",
  "master_bedroom",
  "toilet",
  "dustbin",
  "medicine_box",
]);

const RELATIONSHIP_OBJECTS = new Set([
  "master_bedroom",
  "mirror",
]);

const CAREER_OBJECTS = new Set([
  "study_table",
  "main_entrance",
]);

const ELEMENT_SCORE_KEY: Partial<Record<RemedySet["element"], keyof ElementBalance>> = {
  fire: "fire",
  water: "water",
  earth: "earth",
  metal: "metal",
  wood: "wood",
  space: "metal",
  air: "wood",
};

const DIRECTION_BONUS = 3;
const MAX_DIRECTION_BONUS = 15;
const MIN_VASTU_SCORE = 15;

const PHOTO_COUNT_PENALTY: Record<number, number> = {
  1: 30,
  2: 20,
  3: 10,
  4: 5,
  5: 0,
  6: 0,
};

function getPhotoScoreCap(photoCount: number): number | null {
  if (photoCount === 1) return 70;
  if (photoCount <= 3) return 80;
  if (photoCount <= 5) return 90;
  return null;
}

const OBJECT_ALIASES: Array<{ object: string; aliases: string[] }> = [
  { object: "main_entrance", aliases: ["main door", "main entrance", "front door", "entry door", "entrance"] },
  { object: "master_bedroom", aliases: ["master bedroom", "master bed", "primary bedroom"] },
  { object: "kitchen", aliases: ["kitchen", "gas stove", "stove", "cooktop", "hob", "burner", "cooking"] },
  { object: "toilet", aliases: ["toilet", "bathroom", "commode", "wc", "restroom"] },
  { object: "washing_machine", aliases: ["washing machine", "washer", "laundry machine"] },
  { object: "dustbin", aliases: ["dustbin", "waste bin", "trash", "garbage"] },
  { object: "medicine_box", aliases: ["medicine", "first aid", "medicine box", "medicine cabinet"] },
  { object: "temple", aliases: ["temple", "puja", "mandir", "prayer room", "altar", "pooja"] },
  { object: "safe", aliases: ["safe", "locker", "cash locker", "valuables", "strongbox"] },
  { object: "inverter", aliases: ["inverter", "heater", "electrical equipment", "ups", "geyser"] },
  { object: "study_table", aliases: ["study table", "work desk", "office desk", "desk", "study desk"] },
  { object: "dining_table", aliases: ["dining table", "dining"] },
  { object: "tv", aliases: ["tv", "television", "entertainment unit", "screen", "monitor"] },
  { object: "guest_bedroom", aliases: ["guest bedroom", "guest room", "spare room"] },
  { object: "mirror", aliases: ["mirror", "dressing table", "vanity", "dresser mirror"] },
  { object: "plants", aliases: ["plant", "plants", "indoor pot", "garden", "planter"] },
  { object: "heavy_storage", aliases: ["heavy storage", "almirah", "wardrobe", "junk room", "storage"] },
];

function evaluateRulePlacement(
  rule: VastuRule,
  detectedZones: string[]
): { isViolation: boolean; isIdeal: boolean; isBeneficial: boolean; zoneLabel: string } {
  const zoneLabel = detectedZones[0] ?? "unknown";
  const isStrictViolation = rule.strictNoZones.some((z) => zoneMatches(detectedZones, z));
  const isRemedyViolation =
    !isStrictViolation && rule.remedyZones.some((z) => zoneMatches(detectedZones, z));
  const isIdeal = rule.idealZones.some((z) => zoneMatches(detectedZones, z));
  const isBeneficial =
    !isIdeal && rule.beneficialZones.some((z) => zoneMatches(detectedZones, z));

  return {
    isViolation: isStrictViolation || isRemedyViolation,
    isIdeal,
    isBeneficial,
    zoneLabel,
  };
}

function normalizeObjectName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function matchObjectToRuleObject(detectedName: string): string | null {
  const normalized = detectedName.toLowerCase();
  for (const entry of OBJECT_ALIASES) {
    if (entry.aliases.some((alias) => normalized.includes(alias.toLowerCase()))) {
      return entry.object;
    }
    if (normalized.includes(entry.object.replace(/_/g, " "))) {
      return entry.object;
    }
  }
  const norm = normalizeObjectName(detectedName);
  if (VASTU_OBJECTS_COVERED.includes(norm)) return norm;
  return null;
}

function ruleAppliesToProperty(rule: VastuRule, propertyType: string): boolean {
  if (!rule.propertyTypes || rule.propertyTypes.length === 0) return true;
  return rule.propertyTypes.includes(propertyType as VastuPropertyType);
}

export function applyVastuRules(
  analysis: VastuAnalysis,
  propertyType: string
): AppliedRule[] {
  const applied: AppliedRule[] = [];
  const seen = new Set<string>();

  for (const room of analysis.detectedRooms) {
    const roomDirection = room.compassDirection || "Center";
    const roomType = room.roomType.toLowerCase();

    for (const obj of room.detectedObjects) {
      const ruleObject = matchObjectToRuleObject(obj.name);
      const objDirection = parseDirectionFromText(obj.position) ?? roomDirection;
      const detectedZones = resolveZones(objDirection);

      if (ruleObject) {
        const relevantRules = VASTU_RULES.filter(
          (r) =>
            r.object === ruleObject &&
            ruleAppliesToProperty(r, propertyType) &&
            (r.room === "any" || roomType.includes(r.room) || r.room.includes(roomType.split(" ")[0] ?? ""))
        );

        for (const rule of relevantRules) {
          const placement = evaluateRulePlacement(rule, detectedZones);
          if (!placement.isViolation && !placement.isIdeal && !placement.isBeneficial) continue;

          const zoneLabel = detectedZones.find((z) => z !== objDirection) ?? objDirection;
          const key = `${rule.id}:${room.roomType}:${zoneLabel}:${obj.name}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const isRemedyOnly =
            placement.isViolation &&
            rule.remedyZones.some((z) => zoneMatches(detectedZones, z)) &&
            !rule.strictNoZones.some((z) => zoneMatches(detectedZones, z));

          applied.push({
            rule,
            room: room.roomType,
            direction: zoneLabel,
            isViolation: placement.isViolation,
            detectedObject: obj.name,
            matchConfidence: placement.isViolation
              ? isRemedyOnly
                ? rule.confidenceScore - 10
                : rule.confidenceScore
              : placement.isBeneficial
                ? rule.confidenceScore - 8
                : rule.confidenceScore - 5,
          });
        }
      }
    }

    if (room.clutter === "high") {
      applied.push({
        rule: {
          id: "clutter_high",
          object: "clutter",
          objectLabel: "Clutter",
          idealZones: [],
          beneficialZones: [],
          remedyZones: [],
          strictNoZones: [roomDirection],
          room: room.roomType,
          severity: "medium",
          problem: "High clutter blocks prana circulation",
          scientificReason: "Clutter increases cortisol and reduces functional space efficiency.",
          traditionalReason: "Blocked spaces trap stale energy and prevent Lakshmi circulation.",
          remedy: {
            easy: "Declutter one zone today; donate unused items",
            moderate: "Organize storage; implement daily 10-minute tidy routine",
            color: "Light colors to visually expand space",
            element: "earth",
            plants: "One healthy plant after decluttering",
            crystals: "Clear quartz in cleared corner",
          },
          expectedImprovement: "Improves mental clarity and energy flow",
          confidenceScore: 75,
        },
        room: room.roomType,
        direction: roomDirection,
        isViolation: true,
        detectedObject: "clutter",
        matchConfidence: 75,
      });
    }
  }

  return applied;
}

function clampScore(score: number): number {
  return Math.max(MIN_VASTU_SCORE, Math.min(100, Math.round(score)));
}

function applyPhotoCountAdjustments(rawScore: number, photoCount: number): number {
  const penaltyKey = Math.min(photoCount, 6);
  const penalty = PHOTO_COUNT_PENALTY[penaltyKey] ?? 0;
  let score = Math.max(MIN_VASTU_SCORE, rawScore - penalty);

  const cap = getPhotoScoreCap(photoCount);
  if (cap !== null) {
    score = Math.min(score, cap);
  }

  return score;
}

export function calculateVastuScore(
  analysis: VastuAnalysis,
  appliedRules: AppliedRule[],
  photoCount?: number
): VastuScores {
  const effectivePhotoCount = photoCount ?? analysis.detectedRooms.length;
  let overallScore = 100;
  let financialScore = 100;
  let healthScore = 100;
  let relationshipScore = 100;
  let careerScore = 100;
  let directionBonusTotal = 0;

  const elementBalance: ElementBalance = {
    fire: 70,
    water: 70,
    earth: 70,
    metal: 70,
    wood: 70,
  };

  const positiveEnergyZones: string[] = [];
  const negativeEnergyZones: string[] = [];
  const violations = appliedRules.filter((a) => a.isViolation);
  const hasUserDescriptions = analysis.detectedRooms.some(
    (r) => r.userDescription && r.userDescription.trim().length > 0
  );

  for (const applied of appliedRules) {
    const { rule, direction, isViolation, room } = applied;
    const elementKey = ELEMENT_SCORE_KEY[rule.remedy.element];

    if (isViolation) {
      const deduction = SEVERITY_DEDUCTION[rule.severity];
      overallScore -= deduction;
      if (elementKey && elementBalance[elementKey] !== undefined) {
        elementBalance[elementKey] -= Math.min(12, deduction);
      }

      if (FINANCIAL_OBJECTS.has(rule.object)) financialScore -= deduction;
      if (HEALTH_OBJECTS.has(rule.object)) healthScore -= deduction;
      if (RELATIONSHIP_OBJECTS.has(rule.object)) relationshipScore -= deduction;
      if (CAREER_OBJECTS.has(rule.object)) careerScore -= deduction;

      negativeEnergyZones.push(`${room} (${direction}): ${rule.object.replace(/_/g, " ")}`);
    } else if (directionBonusTotal < MAX_DIRECTION_BONUS) {
      const bonus = Math.min(DIRECTION_BONUS, MAX_DIRECTION_BONUS - directionBonusTotal);
      directionBonusTotal += bonus;
      overallScore += bonus;
      if (elementKey && elementBalance[elementKey] !== undefined) {
        elementBalance[elementKey] += 2;
      }

      if (FINANCIAL_OBJECTS.has(rule.object)) financialScore += bonus;
      if (HEALTH_OBJECTS.has(rule.object)) healthScore += bonus;
      if (RELATIONSHIP_OBJECTS.has(rule.object)) relationshipScore += bonus;
      if (CAREER_OBJECTS.has(rule.object)) careerScore += bonus;

      positiveEnergyZones.push(`${room} (${direction}): ${rule.object.replace(/_/g, " ")}`);
    }
  }

  for (const room of analysis.detectedRooms) {
    if (room.naturalLight === "good") overallScore += 1;
    if (room.naturalLight === "poor") overallScore -= 2;
    if (room.ventilation === "good") overallScore += 1;
    if (room.ventilation === "poor") healthScore -= 3;
  }

  if (violations.length === 0 && !hasUserDescriptions) {
    overallScore = 60;
  }

  overallScore = applyPhotoCountAdjustments(overallScore, effectivePhotoCount);
  financialScore = applyPhotoCountAdjustments(financialScore, effectivePhotoCount);
  healthScore = applyPhotoCountAdjustments(healthScore, effectivePhotoCount);
  relationshipScore = applyPhotoCountAdjustments(relationshipScore, effectivePhotoCount);
  careerScore = applyPhotoCountAdjustments(careerScore, effectivePhotoCount);

  for (const key of Object.keys(elementBalance) as (keyof ElementBalance)[]) {
    elementBalance[key] = clampScore(elementBalance[key]);
  }

  return {
    overallScore: clampScore(overallScore),
    financialScore: clampScore(financialScore),
    healthScore: clampScore(healthScore),
    relationshipScore: clampScore(relationshipScore),
    careerScore: clampScore(careerScore),
    elementBalance,
    positiveEnergyZones: [...new Set(positiveEnergyZones)],
    negativeEnergyZones: [...new Set(negativeEnergyZones)],
  };
}

function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function severityToPriority(severity: string): number {
  const s = severity.toLowerCase();
  if (s === "critical") return SEVERITY_PRIORITY.critical;
  if (s === "high") return SEVERITY_PRIORITY.high;
  if (s === "medium") return SEVERITY_PRIORITY.medium;
  return SEVERITY_PRIORITY.low;
}

function buildIssuesFromAI(detectedRooms: DetectedRoom[]): Issue[] {
  const issues: Issue[] = [];
  let counter = 0;

  for (const room of detectedRooms) {
    for (const aiIssue of room.aiIssues) {
      if (!aiIssue.problem || !aiIssue.object) continue;
      counter += 1;
      const severity = (aiIssue.severity ?? "medium").toLowerCase();
      issues.push({
        id: `ai_${room.photoIndex}_${counter}`,
        object: aiIssue.object,
        room: room.roomType,
        direction: room.compassDirection,
        severity,
        problem: aiIssue.problem,
        scientificReason: aiIssue.scientificReason ?? "Detailed analysis based on spatial energy principles.",
        traditionalReason: aiIssue.traditionalReason ?? "Traditional Vastu Shastra guidance applies here.",
        remedy: {
          easy: aiIssue.remedy?.easy ?? "Consult a Vastu expert for a tailored easy remedy.",
          moderate: aiIssue.remedy?.moderate ?? "Consider repositioning or structural adjustment.",
          color: aiIssue.remedy?.color ?? "Use auspicious colors recommended for this zone.",
          element: "earth",
          plants: aiIssue.remedy?.plants ?? "Add appropriate greenery per zone guidance.",
          crystals: aiIssue.remedy?.crystals ?? "Use zone-appropriate crystals for energy balance.",
        },
        expectedImprovement: aiIssue.expectedImprovement ?? "Improves overall harmony and energy flow in this zone.",
        priority: severityToPriority(severity),
        confidenceScore: aiIssue.confidenceScore ?? 75,
      });
    }
  }

  return issues.sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore);
}

function buildIssuesFromRules(appliedRules: AppliedRule[]): Issue[] {
  return appliedRules
    .filter((a) => a.isViolation && a.rule.problem)
    .map((a) => ({
      id: a.rule.id,
      object: a.rule.object,
      room: a.room,
      direction: a.direction,
      severity: a.rule.severity,
      problem: a.rule.problem,
      scientificReason: a.rule.scientificReason,
      traditionalReason: a.rule.traditionalReason,
      remedy: a.rule.remedy,
      expectedImprovement: a.rule.expectedImprovement,
      priority: SEVERITY_PRIORITY[a.rule.severity],
      confidenceScore: a.matchConfidence,
    }))
    .sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore);
}

function buildIssues(analysis: VastuAnalysis, appliedRules: AppliedRule[]): Issue[] {
  const aiIssues = buildIssuesFromAI(analysis.detectedRooms);
  const ruleIssues = buildIssuesFromRules(appliedRules);

  const seen = new Set<string>();
  const combined: Issue[] = [];

  for (const issue of [...aiIssues, ...ruleIssues]) {
    const key = `${issue.room}:${issue.object.toLowerCase()}:${issue.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(issue);
  }

  return combined.sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore);
}

function buildRoomAnalyses(
  analysis: VastuAnalysis,
  appliedRules: AppliedRule[]
): RoomAnalysis[] {
  return analysis.detectedRooms.map((room) => {
    const roomApplied = appliedRules.filter((a) => a.room === room.roomType);
    let score = 100;
    const positives: string[] = [];

    for (const a of roomApplied) {
      if (a.isViolation) {
        score -= SEVERITY_DEDUCTION[a.rule.severity];
      } else {
        score += DIRECTION_BONUS;
        positives.push(
          `${a.detectedObject ?? a.rule.object.replace(/_/g, " ")} well placed in ${a.direction}`
        );
      }
    }

    if (room.naturalLight === "good") {
      score += 2;
      positives.push("Good natural light supports positive energy");
    }
    if (room.ventilation === "good") positives.push("Adequate ventilation maintains fresh prana");

    const roomAiIssues = buildIssuesFromAI([room]);
    const roomRuleIssues = buildIssuesFromRules(roomApplied);
    const seenKeys = new Set<string>();
    const combinedRoomIssues: Issue[] = [];
    for (const issue of [...roomAiIssues, ...roomRuleIssues]) {
      const key = `${issue.object.toLowerCase()}:${issue.direction}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      combinedRoomIssues.push(issue);
    }

    return {
      roomType: room.roomType,
      score: room.aiRoomScore ?? clampScore(score),
      positives: [...room.aiPositives, ...positives],
      issues: combinedRoomIssues.sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore),
    };
  });
}

function buildPanchtattvaAnalysis(
  scores: VastuScores,
  appliedRules: AppliedRule[]
): VastuReport["panchtattvaAnalysis"] {
  const mapElement = (element: keyof ElementBalance, name: string, zones: string[]): PanchtattvaZone => ({
    score: scores.elementBalance[element],
    zones,
    recommendation:
      scores.elementBalance[element] >= 75
        ? `${name} element is balanced — maintain current arrangement`
        : `Strengthen ${name} element using ${element}-aligned remedies from the report`,
  });

  const fireZones = appliedRules
    .filter((a) => a.rule.remedy.element === "fire")
    .map((a) => `${a.room} (${a.direction})`);
  const waterZones = appliedRules
    .filter((a) => a.rule.remedy.element === "water")
    .map((a) => `${a.room} (${a.direction})`);

  return {
    agni: mapElement("fire", "Agni", fireZones),
    jal: mapElement("water", "Jal", waterZones),
    prithvi: mapElement("earth", "Prithvi", scores.positiveEnergyZones.slice(0, 3)),
    vayu: {
      score: clampScore((scores.elementBalance.wood + scores.overallScore) / 2),
      zones: analysisVentilationZones(appliedRules),
      recommendation: "Ensure cross-ventilation and avoid blocking NE windows for Vayu flow",
    },
    akash: {
      score: clampScore(scores.overallScore - (appliedRules.filter((a) => a.rule.object === "beams").length * 5)),
      zones: ["Center", "NE open sky/light zones"],
      recommendation: "Keep Brahmasthan (center) light and open; avoid heavy objects in core",
    },
  };
}

function analysisVentilationZones(appliedRules: AppliedRule[]): string[] {
  return appliedRules
    .filter((a) => a.rule.object === "windows" || a.rule.object === "balcony")
    .map((a) => `${a.room} (${a.direction})`);
}

function buildRemedySummary(issues: Issue[]): VastuReport["remedySummary"] {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  for (const issue of issues.slice(0, 10)) {
    immediate.push(issue.remedy.easy);
    shortTerm.push(issue.remedy.moderate);
    if (issue.severity === "critical" || issue.severity === "high") {
      longTerm.push(
        `Plan structural correction for ${issue.object.replace(/_/g, " ")} in ${issue.room} (${issue.direction})`
      );
    }
  }

  return {
    immediate: [...new Set(immediate)].slice(0, 5),
    shortTerm: [...new Set(shortTerm)].slice(0, 5),
    longTerm: [...new Set(longTerm)].slice(0, 5),
  };
}

const PROPERTY_COLOR_GUIDANCE: Record<string, { auspicious: string[]; avoid: string[]; elements: string[] }> = {
  residential: {
    auspicious: ["white", "light yellow", "green", "pink", "cream"],
    avoid: ["all black rooms", "excessive dark red in NE"],
    elements: ["earth", "water", "wood"],
  },
  apartment: {
    auspicious: ["white", "beige", "light blue", "soft green"],
    avoid: ["black walls", "dark grey in small rooms"],
    elements: ["earth", "metal", "wood"],
  },
  office: {
    auspicious: ["white", "green", "light grey", "blue accents"],
    avoid: ["all red office", " cluttered dark spaces"],
    elements: ["wood", "metal", "earth"],
  },
  shop: {
    auspicious: ["yellow", "green", "white", "gold accents"],
    avoid: ["dull brown storefront", "dark closed feeling"],
    elements: ["earth", "fire", "metal"],
  },
};

export function buildVastuReport(
  scores: VastuScores,
  appliedRules: AppliedRule[],
  analysis: VastuAnalysis,
  propertyType: string
): VastuReport {
  const issues = buildIssues(analysis, appliedRules);
  const roomAnalyses = buildRoomAnalyses(analysis, appliedRules);
  const colorGuide = PROPERTY_COLOR_GUIDANCE[propertyType] ?? PROPERTY_COLOR_GUIDANCE.residential;

  const topPriorityFixes = issues
    .slice(0, 5)
    .map(
      (i) =>
        `[${i.severity.toUpperCase()}] ${i.object.replace(/_/g, " ")} in ${i.room} (${i.direction}): ${i.remedy.easy}`
    );

  const summaryLines = [
    `Your ${propertyType} property scores ${scores.overallScore}/100 (${scoreToGrade(scores.overallScore)}) on Vastu compliance.`,
    `${issues.length} placement concern${issues.length === 1 ? "" : "s"} identified across ${analysis.detectedRooms.length} analyzed room${analysis.detectedRooms.length === 1 ? "" : "s"}.`,
    `Strongest area: ${scores.positiveEnergyZones[0] ?? "general layout"}. Priority attention: ${scores.negativeEnergyZones[0] ?? "entrance and NE zone"}.`,
    "Implementing top remedies can improve harmony within 21–40 days per traditional Vastu cycles.",
  ];

  const neutralZones = VASTU_DIRECTIONS.filter(
    (d) =>
      !scores.positiveEnergyZones.some((z) => z.includes(`(${d})`)) &&
      !scores.negativeEnergyZones.some((z) => z.includes(`(${d})`))
  ).map((d) => `${d} zone — neutral, maintain cleanliness`);

  return {
    overallScore: scores.overallScore,
    grade: scoreToGrade(scores.overallScore),
    summary: summaryLines.join(" "),
    scores,
    roomAnalyses,
    issues,
    topPriorityFixes,
    elementBalance: scores.elementBalance,
    panchtattvaAnalysis: buildPanchtattvaAnalysis(scores, appliedRules),
    energyMap: {
      positive: scores.positiveEnergyZones,
      negative: scores.negativeEnergyZones,
      neutral: neutralZones,
    },
    remedySummary: buildRemedySummary(issues),
    auspiciousColors: colorGuide.auspicious,
    avoidColors: colorGuide.avoid,
    luckyElements: colorGuide.elements,
    professionalNote:
      "This AI Vastu analysis combines traditional Vastu Shastra principles with spatial science observations from your photos. " +
      "For structural changes (toilet in NE, central pillar, underground tank in SW), consult a certified Vastu expert before demolition. " +
      "Remedies marked 'easy' are safe to implement immediately. Wishing you harmony, prosperity, and positive energy. — DivineMarg Vastu Expert Team",
  };
}
