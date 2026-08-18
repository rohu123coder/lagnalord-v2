import type Anthropic from "@anthropic-ai/sdk";

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

const VISION_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16000;

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

export const VASTU_RULES: VastuRule[] = [
  {
    id: "entrance_primary",
    object: "main_entrance",
    objectLabel: "Main Entrance / Main Door",
    idealZones: ["N3", "N4", "E3", "E4", "S3", "S4", "W3", "W4"],
    beneficialZones: ["W5", "N5", "E5"],
    remedyZones: ["S1", "S2", "E1", "E2"],
    remedyDescription: "With brass/copper/aluminum tape on floor",
    strictNoZones: ["SW", "SSW", "WNW", "ESE", "S7", "S8"],
    room: "entrance",
    severity: "critical",
    problem: "Main entrance in inauspicious zone blocks prosperity and positive energy flow",
    scientificReason:
      "Entrance direction determines solar energy intake — East/North entrances receive morning sun (positive ions), South/SW entrances receive afternoon heat causing stress and financial instability",
    traditionalReason:
      "Per Vastu Purush Mandala, SW is governed by Nairutya (demon energy), WNW by Roga (disease deity) — main door here invites negative cosmic forces",
    remedy: {
      easy: "Place brass Swastik or Om symbol on door frame. Use brass/copper threshold strip.",
      moderate: "Hang brass bell above door. Place Ashoka tree or Tulsi plant near entrance.",
      color: "Use green, white, or wood color for door. Avoid red, black, grey.",
      element: "wood",
      plants: "Tulsi, Ashoka, or money plant at entrance",
      crystals: "Clear quartz or green aventurine near entrance",
    },
    expectedImprovement: "Improves financial flow, career opportunities, and family harmony",
    confidenceScore: 95,
  },
  {
    id: "master_bedroom_primary",
    object: "master_bedroom",
    objectLabel: "Master Bedroom",
    idealZones: ["SW"],
    beneficialZones: ["South", "W", "NW"],
    remedyZones: [],
    strictNoZones: ["NE", "ESE", "SSW", "WNW"],
    room: "bedroom",
    severity: "critical",
    problem:
      "Master bedroom in wrong zone causes relationship issues, health problems, and financial instability for head of family",
    scientificReason:
      "SW zone has maximum earth element stability — heavy mass in SW keeps the house grounded. NE is water/clarity zone, not suitable for sleep as it causes restlessness",
    traditionalReason:
      "SW is Pitra/Dauvarik zone governed by ancestors — master bedroom here ensures family head has authority and stability",
    remedy: {
      easy: "Paint SW wall in earthy tones (brown, beige, cream). Place heavy furniture in SW corner.",
      moderate: "Move bed to SW corner of room. Head while sleeping should face South or East.",
      color: "Use earthy tones: brown, beige, cream, light yellow. Avoid blue, black in bedroom.",
      element: "earth",
      plants: "Lavender or jasmine (calming) — avoid cactus or thorny plants",
      crystals: "Rose quartz for relationships, amethyst for peaceful sleep",
    },
    expectedImprovement: "Improves relationship harmony, financial stability, and health of head of family",
    confidenceScore: 93,
  },
  {
    id: "kitchen_primary",
    object: "kitchen",
    objectLabel: "Kitchen / Cooking Hob",
    idealZones: ["SE", "SSE"],
    beneficialZones: ["South"],
    remedyZones: ["NW", "W"],
    remedyDescription: "With Yellow stone slab under hob",
    strictNoZones: ["NE", "North", "SW", "SSW"],
    room: "kitchen",
    severity: "critical",
    problem: "Kitchen/hob in wrong direction causes health issues, financial drain, and relationship conflicts",
    scientificReason:
      "SE is the zone of fire element (Agni) — cooking here aligns with natural fire energy direction. Kitchen in NE (water zone) creates fire-water conflict causing digestive issues and financial loss",
    traditionalReason:
      "SE is governed by Anil/Vitatha deities associated with fire and digestion. NE is Shikhi/Parjanya zone — fire here destroys clarity and causes confusion",
    remedy: {
      easy: "Place a red or orange mat under the cooking platform. Keep a copper vessel near stove.",
      moderate: "If shifting not possible, place yellow stone slab under hob. Add red accent near stove.",
      color: "Use yellow, orange, or red accents in kitchen. Avoid blue or black near stove.",
      element: "fire",
      plants: "Avoid plants near stove. Place basil/tulsi away from cooking zone.",
      crystals: "Carnelian or red jasper near cooking area",
    },
    expectedImprovement: "Improves health, digestion, financial stability, and family relationships",
    confidenceScore: 97,
  },
  {
    id: "toilet_primary",
    object: "toilet",
    objectLabel: "Toilet / Bathroom / Commode",
    idealZones: ["SSW", "WNW", "ESE"],
    beneficialZones: [],
    remedyZones: ["NW", "SE", "East"],
    remedyDescription: "With specific color tapes on floor",
    strictNoZones: ["NE", "SW", "North", "West"],
    room: "bathroom",
    severity: "critical",
    problem: "Toilet in NE causes severe mental confusion, health deterioration, and financial blockage",
    scientificReason:
      "NE receives maximum cosmic radiation in morning — toilet here pollutes the most spiritually active zone. SW toilet drains earth energy causing instability",
    traditionalReason:
      "NE is Ishanya zone — the most sacred corner governed by Lord Shiva. Toilet here is the gravest Vastu defect",
    remedy: {
      easy: "Keep NE toilet door always closed. Place sea salt bowl inside. Change tiles to white/light blue.",
      moderate: "Hang a mirror on outer NE wall to reflect energy outward. Place crystal pyramid inside.",
      color: "White, light blue, or cream tiles. Avoid dark colors in bathroom.",
      element: "water",
      plants: "No plants in bathroom",
      crystals: "Black tourmaline to absorb negative energy",
    },
    expectedImprovement: "Reduces health issues, mental clarity improves, financial blockages reduce",
    confidenceScore: 96,
  },
  {
    id: "washing_machine_primary",
    object: "washing_machine",
    objectLabel: "Washing Machine",
    idealZones: ["WNW", "ESE"],
    beneficialZones: ["NW"],
    remedyZones: ["SSW"],
    remedyDescription: "If kept spotlessly clean",
    strictNoZones: ["NE", "SW", "SE", "North"],
    room: "utility",
    severity: "medium",
    problem: "Washing machine in wrong zone creates water-element conflicts and financial turbulence",
    scientificReason:
      "WNW and ESE zones are neutral zones suitable for utility appliances with water and movement",
    traditionalReason:
      "Washing machine represents Vayu (air/movement) + Jal (water) — WNW is governed by Vayu energy making it ideal",
    remedy: {
      easy: "Place a blue mat under washing machine. Keep area clean and dry.",
      moderate: "Move to NW or WNW if possible.",
      color: "White or light blue for utility area walls",
      element: "water",
      plants: "None required",
      crystals: "None specific",
    },
    expectedImprovement: "Reduces financial turbulence and improves water-related luck",
    confidenceScore: 78,
  },
  {
    id: "dustbin_primary",
    object: "dustbin",
    objectLabel: "Dustbin / Waste Bin",
    idealZones: [],
    beneficialZones: [],
    remedyZones: ["NE", "North", "SW", "SE"],
    remedyDescription: "Always keep covered and empty regularly",
    strictNoZones: [],
    room: "any",
    severity: "low",
    problem: "Dustbin in wrong location attracts negative energy and blocks prosperity",
    scientificReason:
      "Waste accumulation creates bacterial growth and negative environmental energy regardless of direction",
    traditionalReason:
      "Dustbin represents decay (Nirrti energy) — keeping it covered and in SSW or WNW zones is preferred",
    remedy: {
      easy: "Always keep dustbin covered with lid. Empty daily. Keep near SSW or WNW ideally.",
      moderate: "Use a closed cabinet for dustbin storage.",
      color: "Use grey or black bin — avoid bright colors for dustbin",
      element: "earth",
      plants: "None",
      crystals: "None",
    },
    expectedImprovement: "Reduces negative energy accumulation in living spaces",
    confidenceScore: 70,
  },
  {
    id: "medicine_primary",
    object: "medicine_box",
    objectLabel: "Medicine Box / First Aid",
    idealZones: ["NNE"],
    beneficialZones: ["North"],
    remedyZones: ["WNW"],
    remedyDescription: "Specific for detoxing chronic disease",
    strictNoZones: ["SSW", "South", "SW"],
    room: "any",
    severity: "medium",
    problem: "Medicine in wrong zone reduces healing efficiency and prolongs illness",
    scientificReason:
      "NNE is governed by Aditi/Diti deities associated with immunity and healing. North zone has optimal magnetic north alignment supporting healing",
    traditionalReason:
      "NNE is the zone of Dhanvantari (Ayurvedic deity) — medicines here receive maximum healing cosmic energy",
    remedy: {
      easy: "Move medicine box to North or NNE wall. Use white or blue colored medicine box.",
      moderate: "Place Dhanvantari image near medicine storage.",
      color: "White, blue, or light green for medicine storage area",
      element: "water",
      plants: "Tulsi plant nearby supports healing",
      crystals: "Lapis lazuli or aquamarine for healing support",
    },
    expectedImprovement: "Faster recovery from illness, improved immunity, better health outcomes",
    confidenceScore: 82,
  },
  {
    id: "temple_primary",
    object: "temple",
    objectLabel: "Temple / Pooja Room / Mandir",
    idealZones: ["NE", "West"],
    beneficialZones: ["East"],
    remedyZones: [],
    strictNoZones: ["SSW", "WNW", "SW", "sharing_toilet_wall"],
    room: "puja_room",
    severity: "critical",
    problem: "Temple in wrong zone reduces spiritual energy, blocks prayers, and creates negative vibrations",
    scientificReason:
      "NE receives maximum morning sun and cosmic radiation — ideal for meditation and prayer. Sharing wall with toilet creates contamination of sacred space",
    traditionalReason:
      "NE is Ishanya zone governed by Lord Shiva/Brahma — the most sacred corner of any property",
    remedy: {
      easy: "Ensure temple faces East or North. Keep area clean, well-lit, and fragrant.",
      moderate: "If temple is on toilet wall, place thick lead sheet between walls.",
      color: "White, cream, or light yellow for puja room. Avoid dark colors.",
      element: "space",
      plants: "Tulsi, flowers, and fragrant plants near temple",
      crystals: "Clear quartz and amethyst for spiritual amplification",
    },
    expectedImprovement: "Enhanced spiritual practice, prayers answered faster, positive divine energy in home",
    confidenceScore: 94,
  },
  {
    id: "safe_primary",
    object: "safe",
    objectLabel: "Safe / Cash Locker / Valuables",
    idealZones: ["North", "West"],
    beneficialZones: ["SE"],
    remedyZones: ["SW"],
    remedyDescription: "For long-term capital retention",
    strictNoZones: [],
    room: "bedroom",
    severity: "high",
    problem: "Safe in wrong direction causes financial loss and wealth drainage",
    scientificReason:
      "North is magnetic north — facing North maximizes positive ionic flow toward valuables. Kuber (wealth deity) faces North",
    traditionalReason:
      "North is Kubera zone — god of wealth. Safe facing North ensures Kubera blesses the wealth stored",
    remedy: {
      easy: "Ensure safe door opens toward North. Place Kuber yantra on or near safe.",
      moderate: "Move safe to North wall of SW room for maximum retention.",
      color: "Green or gold for safe exterior. Place green cloth inside safe.",
      element: "metal",
      plants: "Money plant near safe area",
      crystals: "Citrine (wealth crystal) inside safe",
    },
    expectedImprovement: "Wealth accumulation improves, financial stability increases, unexpected expenses reduce",
    confidenceScore: 88,
  },
  {
    id: "inverter_primary",
    object: "inverter",
    objectLabel: "Inverter / Heater / Electrical Equipment",
    idealZones: ["SE", "SSE"],
    beneficialZones: [],
    remedyZones: [],
    strictNoZones: ["NE", "North", "SW"],
    room: "any",
    severity: "medium",
    problem: "Electrical/fire equipment in water zones causes health issues and electrical problems",
    scientificReason:
      "SE zone is fire element zone — electrical equipment generates heat/fire energy which is amplified positively in SE",
    traditionalReason: "SE is Agni (fire deity) zone — all fire and electrical appliances belong here",
    remedy: {
      easy: "Move inverter/heater to SE corner if possible. Keep area ventilated.",
      moderate: "Place red mat under electrical equipment in non-SE zones.",
      color: "Red or orange accents near electrical zone",
      element: "fire",
      plants: "None near electrical equipment",
      crystals: "None specific",
    },
    expectedImprovement: "Reduces electrical issues, health improvement, energy efficiency",
    confidenceScore: 80,
  },
  {
    id: "study_table_primary",
    object: "study_table",
    objectLabel: "Study Table / Work Desk / Office Desk",
    idealZones: ["WSW", "NE"],
    beneficialZones: ["East", "West"],
    remedyZones: [],
    strictNoZones: [],
    room: "study",
    severity: "medium",
    problem: "Study desk facing wrong direction reduces concentration, memory, and academic performance",
    scientificReason:
      "East-facing study gets morning sun which activates pineal gland improving alertness. North-facing study aligns with magnetic north improving memory and focus",
    traditionalReason:
      "WSW is Vastu zone of knowledge (Vithi/Gandharva). NE is clarity zone — students studying here gain exceptional focus",
    remedy: {
      easy: "Face East or North while studying. Place Saraswati image or green plant on desk.",
      moderate: "Move desk to NE or WSW corner of room.",
      color: "Green or light blue for study room — enhances concentration",
      element: "wood",
      plants: "Money plant or bamboo for growth energy",
      crystals: "Fluorite for concentration, clear quartz for clarity",
    },
    expectedImprovement: "Improved concentration, better academic results, enhanced career growth",
    confidenceScore: 85,
  },
  {
    id: "dining_table_primary",
    object: "dining_table",
    objectLabel: "Dining Table",
    idealZones: ["West", "East"],
    beneficialZones: ["NW", "South"],
    remedyZones: [],
    strictNoZones: ["SE", "SSW", "WNW"],
    room: "dining",
    severity: "low",
    problem: "Dining in wrong zone causes digestive issues and family conflicts during meals",
    scientificReason:
      "West-facing dining aligns with evening energy suitable for family meals. SE (fire zone) causes over-eating or digestive fire imbalance",
    traditionalReason:
      "West is Varuna zone governing water and sustenance. Dining here ensures nourishment and family bonding",
    remedy: {
      easy: "Place dining table in West or East zone. Avoid sitting with back to entrance while eating.",
      moderate: "Add yellow or orange accent lights over dining table.",
      color: "Warm colors (yellow, orange) for dining area enhance appetite and family bonding",
      element: "earth",
      plants: "Fresh flowers on dining table attract abundance",
      crystals: "Citrine or sunstone for positive meal energy",
    },
    expectedImprovement: "Better digestion, family harmony during meals, abundance mindset",
    confidenceScore: 75,
  },
  {
    id: "tv_primary",
    object: "tv",
    objectLabel: "TV / Entertainment Unit / Screen",
    idealZones: ["ENE", "NW"],
    beneficialZones: [],
    remedyZones: [],
    strictNoZones: ["NE", "SSW"],
    room: "living_room",
    severity: "medium",
    problem: "TV in NE zone causes major distraction, reduces clarity, and blocks meditation energy",
    scientificReason:
      "TV emits EMF radiation — NE is most sensitive zone for brain activity. TV here disrupts mental clarity and spiritual development",
    traditionalReason:
      "NE is clarity/mind zone — electronic disturbances here block divine signals and mental peace",
    remedy: {
      easy: "Move TV to ENE or NW wall. Keep TV cabinet closed when not in use.",
      moderate: "Place Tulsi plant near TV to absorb EMF radiation.",
      color: "Neutral colors (grey, brown) for TV unit",
      element: "space",
      plants: "Spider plant or peace lily absorbs EMF near electronics",
      crystals: "Black tourmaline to absorb electronic radiation",
    },
    expectedImprovement: "Better mental clarity, reduced screen addiction, improved family communication",
    confidenceScore: 82,
  },
  {
    id: "guest_bedroom_primary",
    object: "guest_bedroom",
    objectLabel: "Guest Bedroom / Spare Room",
    idealZones: [],
    beneficialZones: [],
    remedyZones: ["SW", "NE"],
    remedyDescription: "SW causes guests to overstay, NE is not ideal",
    strictNoZones: [],
    room: "bedroom",
    severity: "low",
    problem: "Guest bedroom placement affects how long guests stay and the energy they bring",
    scientificReason: "NW is movement zone — guests in NW naturally want to leave after appropriate stay",
    traditionalReason:
      "NW is Vayu zone governing movement and transience — ideal for guests",
    remedy: {
      easy: "Assign NW room for guests. Use light, airy decor.",
      moderate: "Avoid SW bedroom for guests as it gives them authority/dominance energy.",
      color: "Light colors (white, cream, light yellow) for guest room",
      element: "air",
      plants: "Light fragrant plants like lavender",
      crystals: "None specific",
    },
    expectedImprovement: "Guests stay appropriate duration, positive guest experiences",
    confidenceScore: 72,
  },
  {
    id: "mirror_primary",
    object: "mirror",
    objectLabel: "Mirror / Dressing Table / Vanity",
    idealZones: ["North", "East"],
    beneficialZones: ["NNE", "NE"],
    remedyZones: [],
    remedyDescription: "Never place mirror reflecting the bed",
    strictNoZones: ["South", "SE", "SW", "SSW"],
    room: "bedroom",
    severity: "high",
    problem:
      "Mirror in wrong direction or reflecting bed causes sleep disturbances, health issues, and relationship problems",
    scientificReason:
      "Mirrors reflecting beds disturb REM sleep cycles by creating psychological alertness. South-facing mirrors reflect and amplify heat energy",
    traditionalReason:
      "Mirror reflecting bed doubles illness and marital discord per Vastu — it is considered highly inauspicious",
    remedy: {
      easy: "Cover mirror at night if it reflects bed. Move mirror to North or East wall.",
      moderate: "Install sliding panel over mirror in bedroom.",
      color: "Silver or gold frame for mirrors — avoid black frames",
      element: "water",
      plants: "None specific",
      crystals: "None near mirrors",
    },
    expectedImprovement: "Better sleep quality, improved health, relationship harmony",
    confidenceScore: 90,
  },
  {
    id: "plants_primary",
    object: "plants",
    objectLabel: "Plants / Indoor Pots / Garden",
    idealZones: ["East", "ENE", "North"],
    beneficialZones: ["SE"],
    remedyZones: [],
    remedyDescription: "SE only for red flowers",
    strictNoZones: ["SW", "SSW", "WNW", "West"],
    room: "any",
    severity: "low",
    problem: "Plants in SW or West zones drain earth element and reduce stability",
    scientificReason:
      "East-facing plants receive morning photosynthesis energy producing maximum oxygen. SW plants compete with earth element causing instability",
    traditionalReason: "East and North are growth zones per Vastu — plants here amplify prosperity and vitality",
    remedy: {
      easy: "Move plants to East, ENE, or North zones. Remove plants from SW/West.",
      moderate: "Use Tulsi in NE for spiritual purification.",
      color: "Green plants for North (wealth), flowering plants for East (health)",
      element: "wood",
      plants: "Tulsi (NE), Money plant (North), Bamboo (East), Peace lily (ENE)",
      crystals: "Green aventurine near plants for growth",
    },
    expectedImprovement: "Improved air quality, prosperity, health, and positive energy flow",
    confidenceScore: 78,
  },
  {
    id: "heavy_storage_primary",
    object: "heavy_storage",
    objectLabel: "Heavy Storage / Almirah / Junk Room",
    idealZones: ["SW", "West"],
    beneficialZones: [],
    remedyZones: [],
    strictNoZones: ["NE", "North", "East"],
    room: "any",
    severity: "high",
    problem: "Heavy storage in NE or North blocks energy flow, mental clarity, and career opportunities",
    scientificReason:
      "NE and North need to be light and open for energy circulation. Heavy mass here creates stagnation in career and mental zones",
    traditionalReason:
      "SW is earth element zone — heavy objects here strengthen foundation and stability. NE with heavy objects suffocates clarity zone",
    remedy: {
      easy: "Move heavy almirahs, storage boxes to SW or West. Declutter NE immediately.",
      moderate: "Place heavy furniture against SW wall of any room.",
      color: "Earth tones (brown, dark grey) for storage areas",
      element: "earth",
      plants: "None in storage areas",
      crystals: "None specific",
    },
    expectedImprovement: "Mental clarity improves, career opportunities increase, North-East energy activated",
    confidenceScore: 87,
  },
];

export const ZONE_ACTIVATION_GUIDE: Record<string, ZoneActivationInfo> = {
  N: {
    fullName: "North",
    deity: "Mukhya, Bhallat, Soma",
    element: "Water",
    color: "Blue, Black",
    purpose: "Money & Opportunities",
    bestFor: ["Kuber brass idol", "Cash counting machine painting", "Blue water painting", "Blue crystals/vase"],
    avoid: ["Fire elements", "Red colors", "Heavy storage"],
    affirmation: "Wealth and opportunities flow freely to me",
  },
  NNE: {
    fullName: "North-North-East",
    deity: "Bhujag, Aditi, Diti",
    element: "Water",
    color: "Blue, White",
    purpose: "Health & Healing",
    bestFor: ["Medicine box", "Dhanvantari brass idol", "White lotus painting", "Healing crystals"],
    avoid: ["Fire elements", "Dark colors", "Clutter"],
    affirmation: "Perfect health and healing energy flows through my home",
  },
  NE: {
    fullName: "North-East",
    deity: "Shikhi, Parjanya",
    element: "Water",
    color: "Light Blue, White",
    purpose: "Clarity & Mind",
    bestFor: ["Temple/puja", "Silver Nandi", "Clear quartz", "Water feature"],
    avoid: ["Toilet", "Kitchen", "Heavy storage", "Bedroom", "TV"],
    affirmation: "Divine clarity and wisdom guide all my decisions",
  },
  ENE: {
    fullName: "East-North-East",
    deity: "Jayanta, Mahendra",
    element: "Air/Wood",
    color: "Light Green, White",
    purpose: "Success & Achievement",
    bestFor: ["TV", "Study area", "Plants", "Achievement symbols"],
    avoid: ["Toilets", "Heavy junk"],
    affirmation: "Success and achievements multiply in my life",
  },
  E: {
    fullName: "East",
    deity: "Surya",
    element: "Air/Wood",
    color: "White, Light Yellow",
    purpose: "Social Connections & Growth",
    bestFor: ["Main entrance if possible", "Study table facing East", "Plants", "Sunrise paintings"],
    avoid: ["Heavy storage", "Dark colors"],
    affirmation: "Positive social connections and growth surround me",
  },
  ESE: {
    fullName: "East-South-East",
    deity: "Aryama, Savita",
    element: "Air/Fire",
    color: "White, Silver",
    purpose: "Education & Skill",
    bestFor: ["Study materials", "Books", "Washing machine (utility)"],
    avoid: ["Bedroom", "Toilet"],
    affirmation: "Knowledge and skills flow effortlessly to me",
  },
  SE: {
    fullName: "South-East",
    deity: "Anil, Vitatha",
    element: "Fire",
    color: "Orange, Red, Pink",
    purpose: "Cash Flow & Energy",
    bestFor: ["Kitchen/hob", "Inverter", "Fire-related items", "Red flower plants"],
    avoid: ["Water features", "Blue colors", "Bedroom"],
    affirmation: "Cash flow and energy are abundant in my life",
  },
  SSE: {
    fullName: "South-South-East",
    deity: "Pusha, Vitatha",
    element: "Fire",
    color: "Orange, Red",
    purpose: "Confidence & Strength",
    bestFor: ["Kitchen", "Fire elements", "Red accents"],
    avoid: ["Water features", "Bedroom"],
    affirmation: "Confidence and strength guide my every action",
  },
  S: {
    fullName: "South",
    deity: "Yama",
    element: "Earth",
    color: "Red, Pink, Orange",
    purpose: "Fame & Recognition",
    bestFor: ["Fame/recognition symbols", "Red paintings", "Awards display"],
    avoid: ["Main entrance", "Water features"],
    affirmation: "Fame and recognition come naturally to me",
  },
  SSW: {
    fullName: "South-South-West",
    deity: "Grihakshat, Gandharva",
    element: "Earth",
    color: "Yellow, Brown",
    purpose: "Disposal & Waste Management",
    bestFor: ["Toilet", "Dustbin (if necessary)", "Waste areas"],
    avoid: ["Temple", "Main entrance", "Bedroom"],
    affirmation: "All negativity and waste naturally leaves my space",
  },
  SW: {
    fullName: "South-West",
    deity: "Nairuti",
    element: "Earth",
    color: "Brown, Beige, Earthy",
    purpose: "Stability & Relationships",
    bestFor: ["Master bedroom", "Heavy storage", "Safe (for retention)"],
    avoid: ["Main entrance", "Temple", "Kitchen"],
    affirmation: "Stability, security, and strong relationships define my life",
  },
  WSW: {
    fullName: "West-South-West",
    deity: "Dauvarik, Sugreeva",
    element: "Earth",
    color: "Yellow, Brown",
    purpose: "Education & Profits",
    bestFor: ["Study table", "Education materials", "Financial records"],
    avoid: ["Toilet", "Kitchen"],
    affirmation: "Education and profits multiply consistently",
  },
  W: {
    fullName: "West",
    deity: "Varuna",
    element: "Metal/Space",
    color: "Blue, White, Silver",
    purpose: "Gains & Profits",
    bestFor: ["Dining table", "Gains-related activities", "Safe", "Children bedroom"],
    avoid: ["Main entrance (generally)"],
    affirmation: "Gains and profits flow steadily into my life",
  },
  WNW: {
    fullName: "West-North-West",
    deity: "Roga, Vayu",
    element: "Air",
    color: "Grey, White",
    purpose: "Movement & Banking",
    bestFor: ["Washing machine", "Movement-related items", "Bank documents"],
    avoid: ["Main entrance", "Temple", "Master bedroom"],
    affirmation: "Positive movement and banking energy support my growth",
  },
  NW: {
    fullName: "North-West",
    deity: "Naga, Mukhya",
    element: "Air",
    color: "White, Silver, Grey",
    purpose: "Support & Networking",
    bestFor: ["Guest bedroom", "Washing machine", "Support from others", "TV (secondary)"],
    avoid: ["Master bedroom", "Main entrance"],
    affirmation: "Powerful support and network connections surround me",
  },
  NNW: {
    fullName: "North-North-West",
    deity: "Mukhya, Bhallat",
    element: "Air/Water",
    color: "White, Blue",
    purpose: "Attraction & Charm",
    bestFor: ["Bedroom for single people", "Attraction symbols", "Social area"],
    avoid: ["Heavy storage", "Waste areas"],
    affirmation: "I attract positive people and opportunities effortlessly",
  },
};

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

function zoneMatches(detectedZones: string[], ruleZone: string): boolean {
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

function resolveZones(
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

export const VASTU_OBJECTS_COVERED = [
  ...new Set(VASTU_RULES.map((r) => r.object)),
];

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

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function extractTextFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
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

const FALLBACK_ANALYSIS: VastuAnalysis = {
  detectedRooms: [],
};

type ClaudeDetectedObject = {
  name?: string;
  position?: string;
  vastuNote?: string;
  vastuCompliance?: string;
  note?: string;
};

type ClaudeDetectedRoom = {
  photoIndex?: number;
  roomType?: string;
  userProvidedDescription?: string;
  compassDirection?: string;
  degrees?: number;
  roomScore?: number;
  detectedObjects?: ClaudeDetectedObject[];
  wallColors?: string[];
  floorColor?: string;
  colors?: string[];
  naturalLight?: "good" | "moderate" | "poor";
  ventilation?: "good" | "moderate" | "poor";
  clutter?: "none" | "moderate" | "high";
  structuralIssues?: string[];
  positives?: string[];
  issues?: ClaudeRoomIssue[];
};

function normalizeClaudeRoom(
  room: ClaudeDetectedRoom,
  index: number,
  photos: Array<{ roomLabel: string; compassDirection: number; userDescription?: string }>,
  northDirection: number
): DetectedRoom {
  const photo = photos[room.photoIndex ?? index];
  const compassDegrees = room.degrees ?? photo?.compassDirection ?? northDirection;
  const compassDirection =
    typeof room.compassDirection === "string"
      ? room.compassDirection
      : degreesToDirection(compassDegrees, northDirection);

  const colors = [
    ...(room.wallColors ?? []),
    ...(room.floorColor ? [room.floorColor] : []),
    ...(room.colors ?? []),
  ];

  return {
    roomType: room.roomType ?? photo?.roomLabel ?? `Room ${index + 1}`,
    photoIndex: room.photoIndex ?? index,
    compassDirection,
    userDescription: room.userProvidedDescription ?? photo?.userDescription ?? "",
    detectedObjects: (room.detectedObjects ?? []).map((obj) => ({
      name: obj.name ?? "unknown object",
      position: obj.position ?? compassDirection,
      vastuNote: obj.note ?? obj.vastuNote ?? obj.vastuCompliance ?? "",
    })),
    colors,
    naturalLight: room.naturalLight ?? "moderate",
    ventilation: room.ventilation ?? "moderate",
    clutter: room.clutter ?? "none",
    structuralIssues: room.structuralIssues ?? [],
    aiIssues: Array.isArray(room.issues) ? (room.issues as ClaudeRoomIssue[]) : [],
    aiPositives: room.positives ?? [],
    aiRoomScore: room.roomScore,
  };
}

function parseVastuAnalysisJson(
  text: string,
  photos: Array<{ roomLabel: string; compassDirection: number; userDescription?: string }>,
  northDirection: number
): VastuAnalysis {
  try {
    const parsed = JSON.parse(stripJsonFences(text)) as { detectedRooms?: ClaudeDetectedRoom[] };
    if (parsed?.detectedRooms && Array.isArray(parsed.detectedRooms)) {
      return {
        detectedRooms: parsed.detectedRooms.map((room, index) =>
          normalizeClaudeRoom(room, index, photos, northDirection)
        ),
      };
    }
  } catch (e) {
    console.error(
      "[Vastu] Failed to parse Claude JSON response. Text length:",
      text.length,
      "First 300 chars:",
      text.slice(0, 300),
      "Error:",
      e
    );
  }
  return { ...FALLBACK_ANALYSIS };
}

const VASTU_SYSTEM_PROMPT = `You are a certified Vastu Shastra expert with 30+ years of experience.
You are STRICT, CRITICAL, and THOROUGH. Your job is to find REAL problems
in the property, not to flatter the user.

CRITICAL RULES:
1. NEVER give a perfect score unless the property is genuinely flawless
2. ALWAYS find at least 2-3 issues even in well-maintained properties
3. If you cannot clearly see an object, say so and flag it as "unverified"
4. Be specific about what you see — mention exact objects, colors, positions
5. Direction data from compass is provided — use it precisely
6. User descriptions are provided — use them to enhance analysis
7. Score deductions must be REAL and JUSTIFIED:
   - Critical issue: -15 points
   - High issue: -10 points
   - Medium issue: -5 points
   - Low issue: -2 points
8. A score of 70-85 is "good", 85-95 is "excellent", 95+ requires exceptional compliance
9. Most residential properties score between 45-75 — be realistic
10. If kitchen is in wrong direction, it is ALWAYS a critical issue
11. If toilet/bathroom is in NE, it is ALWAYS a critical issue
12. If main entrance is in wrong direction, it is HIGH severity
13. Check colors carefully — wrong colors in rooms cause issues
14. Clutter = negative energy = deduct points
15. Missing natural light = deduct points

DEPTH AND LIFE-IMPACT REQUIREMENTS (critical for report quality):
16. For EVERY issue you report, the "expectedImprovement" field must be SPECIFIC and LIFE-AREA-FOCUSED, not generic. Explicitly connect the fix to real outcomes the user cares about — financial stability, career growth, health, relationships, or family harmony. Bad: "Improves energy flow." Good: "Correcting this SW-zone clutter typically restores financial stability and reduces unexpected expenses within 30-45 days, and improves harmony between spouses since SW governs relationship stability."
17. Write "scientificReason" and "traditionalReason" as if explaining to a paying client who wants to understand WHY, not just WHAT — reference the specific zone's governing life-area (from the 16-zone reference below), the specific object/color/material involved, and the mechanism (magnetic field, psychological effect, traditional Vastu Purush Mandala position, etc).
18. In the "remedy" object, make "easy", "moderate", "color", "plants", and "crystals" each genuinely distinct and actionable — not filler. If a remedy field doesn't meaningfully apply to this specific issue, give the single best alternative recommendation for that field rather than a generic placeholder.
19. Every room's "positives" array should include at least one specific observation praising something the room does well (e.g. "East-facing window brings ideal morning sunlight for the Social Connections zone"), grounded in what you actually see in the photo — not generic flattery.
20. Think like a paid professional consultant charging a premium fee — the client is trusting you with financial decisions about their home. Every sentence should feel earned by what you observed in the photo, specific to THIS property, not a template that could apply to any home.

16-ZONE REFERENCE (use exact zone names in your analysis):
- N (North): Money/Opportunities zone
- NNE: Health/Healing zone
- NE: Clarity/Mind zone — MOST SACRED, toilet here is gravest defect
- ENE: Success/Achievement zone
- E (East): Social Connections zone
- ESE: Education/Skill zone
- SE: Cash Flow/Fire zone — ideal for kitchen/hob
- SSE: Confidence/Strength zone
- S (South): Fame/Recognition zone
- SSW: Disposal zone — acceptable for toilet
- SW: Stability/Relationships zone — ideal for master bedroom
- WSW: Education/Profits zone
- W (West): Gains/Profits zone
- WNW: Movement/Banking zone
- NW: Support/Networking zone — ideal for guest room
- NNW: Attraction/Charm zone

When analyzing each photo, identify which zone the objects are in using
compass data provided, and match against this 16-zone system for precise
evaluation.

ANALYSIS APPROACH:
For each photo:
a) Identify the room type (use user description if provided)
b) Note compass direction (provided)
c) List EVERY visible object with its position relative to compass
d) Check each object against Vastu rules
e) Note colors of walls, floor, ceiling, furniture
f) Check natural light, ventilation, clutter level
g) Identify structural elements (beams, pillars, slopes)
h) Be specific: "red sofa in SW corner" not just "sofa present"

COMMON ISSUES TO ACTIVELY LOOK FOR:
- Toilet/bathroom in NE zone (very bad)
- Kitchen fire in N or NE (bad)
- Mirror opposite bed (bad)
- Bed under beam (bad)
- Main door facing S or SW (bad)
- Staircase in NE (bad)
- Heavy furniture in NE (bad)
- Clutter in any zone
- Wrong colors for zones (red in bedroom, black in kitchen etc)
- Poor ventilation/natural light
- Plants in bedroom (not recommended)
- Aquarium in wrong zone
- Broken items, cracks
- Sharp corners pointing at seating areas

Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "detectedRooms": [
    {
      "photoIndex": 0,
      "roomType": "kitchen",
      "userProvidedDescription": "...",
      "compassDirection": "SE",
      "degrees": 142,
      "roomScore": 65,
      "detectedObjects": [
        {
          "name": "gas stove",
          "position": "N wall",
          "vastuCompliance": "violation",
          "note": "Fire element in North (water zone) — conflicts with water energy"
        }
      ],
      "wallColors": ["yellow", "white"],
      "floorColor": "grey tiles",
      "naturalLight": "moderate",
      "ventilation": "poor",
      "clutter": "high",
      "structuralIssues": ["beam over cooking area"],
      "positives": ["clean counter", "organized utensils"],
      "issues": [
        {
          "object": "gas stove",
          "severity": "critical",
          "problem": "Gas stove placed in North direction",
          "scientificReason": "North represents water element and magnetic field alignment. Fire in North disrupts magnetic north flow causing health issues",
          "traditionalReason": "Agni (fire) in Varun (water) zone per Vastu Purush Mandala",
          "remedy": {
            "easy": "Place a copper plate or red crystal near stove",
            "moderate": "Shift cooking platform to SE corner",
            "color": "Add red or orange accent near cooking zone",
            "plants": "Avoid plants near stove",
            "crystals": "Red jasper or carnelian"
          },
          "expectedImprovement": "Improves health and reduces financial stress",
          "confidenceScore": 87
        }
      ]
    }
  ]
}`;

const BATCH_SIZE = 3;

async function analyzeVastuPhotoBatch(
  client: Anthropic,
  batchPhotos: Array<{
    url: string;
    roomLabel: string;
    compassDirection: number;
    userDescription: string;
    vastuDirection: string;
  }>,
  globalOffset: number,
  propertyType: string,
  northDirection: number,
  totalPhotos: number
): Promise<ClaudeDetectedRoom[]> {
  const photoContext = batchPhotos
    .map((p, i) =>
      JSON.stringify({
        index: globalOffset + i,
        roomLabel: p.roomLabel,
        userDescription: p.userDescription || "(none provided)",
        compassDirection: p.vastuDirection,
        degrees: p.compassDirection,
      })
    )
    .join("\n");

  const imageBlocks: Anthropic.ContentBlockParam[] = batchPhotos.flatMap((photo, i) => [
    {
      type: "text" as const,
      text: `--- Photo index ${globalOffset + i}: ${photo.roomLabel} (${photo.vastuDirection}, ${photo.compassDirection}°) — User says: "${photo.userDescription || "no description"}" ---`,
    },
    {
      type: "image" as const,
      source: { type: "url" as const, url: photo.url },
    },
  ]);

  const message = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: MAX_TOKENS,
    system: VASTU_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `Analyze these ${batchPhotos.length} photos (part of a larger ${totalPhotos}-photo ${propertyType} property scan) for Vastu compliance.

northDirection: ${northDirection} degrees (user calibrated this with compass)

Photos metadata:
${photoContext}

IMPORTANT: Use the exact "index" values shown above as "photoIndex" in your response for each room — do NOT renumber starting from 0.
Use user descriptions to enhance room identification and object detection.
Be STRICT and THOROUGH — this batch deserves your full depth of analysis since it is only ${batchPhotos.length} photo(s). Find real issues, flag unverified items, write detailed scientificReason and traditionalReason for every issue, and return comprehensive JSON only.`,
          },
        ],
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    console.error(
      "[Vastu] Batch response truncated at max_tokens. batchSize:",
      batchPhotos.length,
      "globalOffset:",
      globalOffset
    );
  }

  const text = extractTextFromMessage(message);
  try {
    const parsed = JSON.parse(stripJsonFences(text)) as { detectedRooms?: ClaudeDetectedRoom[] };
    if (parsed?.detectedRooms && Array.isArray(parsed.detectedRooms)) {
      return parsed.detectedRooms;
    }
  } catch (e) {
    console.error(
      "[Vastu] Failed to parse batch JSON. Text length:",
      text.length,
      "First 300 chars:",
      text.slice(0, 300),
      "Error:",
      e
    );
  }
  return [];
}

export async function analyzeVastuPhotos(
  photos: Array<{
    url: string;
    roomLabel: string;
    compassDirection: number;
    userDescription?: string;
  }>,
  propertyType: string,
  northDirection: number
): Promise<VastuAnalysis> {
  const client = await getAnthropicClient();
  if (!client || photos.length === 0) {
    return { ...FALLBACK_ANALYSIS };
  }

  const enrichedPhotos = photos.map((photo) => ({
    ...photo,
    userDescription: photo.userDescription ?? "",
    vastuDirection: degreesToDirection(photo.compassDirection, northDirection),
  }));

  const batches: Array<typeof enrichedPhotos> = [];
  for (let i = 0; i < enrichedPhotos.length; i += BATCH_SIZE) {
    batches.push(enrichedPhotos.slice(i, i + BATCH_SIZE));
  }

  const allDetectedRooms: ClaudeDetectedRoom[] = [];

  for (let b = 0; b < batches.length; b++) {
    const globalOffset = b * BATCH_SIZE;
    try {
      const rooms = await analyzeVastuPhotoBatch(
        client,
        batches[b],
        globalOffset,
        propertyType,
        northDirection,
        photos.length
      );
      allDetectedRooms.push(...rooms);
    } catch (e) {
      console.error(`[Vastu] Batch ${b} (offset ${globalOffset}) failed:`, e);
    }
  }

  if (allDetectedRooms.length === 0) {
    return { ...FALLBACK_ANALYSIS };
  }

  return {
    detectedRooms: allDetectedRooms.map((room, index) =>
      normalizeClaudeRoom(room, room.photoIndex ?? index, enrichedPhotos, northDirection)
    ),
  };
}

export function getVastuRulesCount(): number {
  return VASTU_RULES.length;
}

export function isValidPropertyType(value: string): value is VastuPropertyType {
  return (VASTU_PROPERTY_TYPES as readonly string[]).includes(value);
}
