import { GoogleGenerativeAI } from "@google/generative-ai";

import { degreesToDirection } from "./vastuGeometry.js";
import type {
  ClaudeRoomIssue,
  DetectedRoom,
  VastuAnalysis,
} from "./vastuTypes.js";

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Vastu] GEMINI_API_KEY not set — using fallback analysis");
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(imageUrl);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { mimeType: contentType, data: base64 };
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
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
  const model = getGeminiModel();
  if (!model) {
    return [];
  }

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

  const imageParts = await Promise.all(
    batchPhotos.map(async (photo) => {
      const { mimeType, data } = await fetchImageAsBase64(photo.url);
      return { inlineData: { mimeType, data } };
    })
  );

  const captionedParts = batchPhotos.flatMap((photo, i) => [
    {
      text: `--- Photo index ${globalOffset + i}: ${photo.roomLabel} (${photo.vastuDirection}, ${photo.compassDirection}°) — User says: "${photo.userDescription || "no description"}" ---`,
    },
    imageParts[i],
  ]);

  const instructionText = `Analyze these ${batchPhotos.length} photos (part of a larger ${totalPhotos}-photo ${propertyType} property scan) for Vastu compliance.

northDirection: ${northDirection} degrees (user calibrated this with compass)

Photos metadata:
${photoContext}

IMPORTANT: Use the exact "index" values shown above as "photoIndex" in your response for each room — do NOT renumber starting from 0.
Use user descriptions to enhance room identification and object detection.
Be STRICT and THOROUGH — this batch deserves your full depth of analysis since it is only ${batchPhotos.length} photo(s). Find real issues, flag unverified items, write detailed scientificReason and traditionalReason for every issue, and return comprehensive JSON only.`;

  const promptParts = [
    { text: VASTU_SYSTEM_PROMPT + "\n\n" + instructionText },
    ...captionedParts,
  ];

  const result = await model.generateContent(promptParts);
  const text = result.response.text();
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
  if (photos.length === 0) {
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
