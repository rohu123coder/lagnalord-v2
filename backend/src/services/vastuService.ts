import type Anthropic from "@anthropic-ai/sdk";

const VISION_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16000;

let anthropicClient: Anthropic | null = null;

async function getAnthropicClient(): Promise<Anthropic | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[Vastu] ANTHROPIC_API_KEY not set — using fallback analysis");
    return null;
  }
  if (!anthropicClient) {
    const { default: AnthropicSdk } = await import("@anthropic-ai/sdk");
    anthropicClient = new AnthropicSdk({ apiKey });
  }
  return anthropicClient;
}

function extractTextFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export {
  VASTU_DIRECTIONS,
  VASTU_PROPERTY_TYPES,
  isValidPropertyType,
  type AppliedRule,
  type ClaudeIssueRemedy,
  type ClaudeRoomIssue,
  type DetectedObject,
  type DetectedRoom,
  type ElementBalance,
  type Issue,
  type PanchtattvaZone,
  type RemedySet,
  type RoomAnalysis,
  type VastuAnalysis,
  type VastuDirection,
  type VastuPropertyType,
  type VastuReport,
  type VastuRule,
  type VastuScores,
  type VastuSeverity,
  type ZoneActivationInfo,
} from "./vastuTypes.js";

export {
  VASTU_OBJECTS_COVERED,
  VASTU_RULES,
  ZONE_ACTIVATION_GUIDE,
  getVastuRulesCount,
} from "./vastuRules.js";

export {
  degreesToDirection,
  degreesToDirection16,
  degreesToSubZone,
  parseDirectionFromText,
} from "./vastuGeometry.js";

export {
  applyVastuRules,
  buildVastuReport,
  calculateVastuScore,
} from "./vastuScoring.js";

export { analyzeVastuPhotos } from "./vastuVision.js";
