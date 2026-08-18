import api from "./api";

export interface VastuPhoto {
  uri: string;
  roomLabel: string;
  direction: string;
  degrees: number;
  description: string;
}

export interface VastuScanResult {
  id: string;
  status?: "pending" | "completed" | "failed";
  overallScore: number;
  grade: string;
  summary: string;
  scores: {
    financialScore: number;
    healthScore: number;
    relationshipScore: number;
    careerScore: number;
    elementBalance: Record<string, number>;
  };
  roomAnalyses: Array<{
    roomType: string;
    score: number;
    positives: string[];
    issues: Array<{
      object: string;
      severity: string;
      problem: string;
      remedy: { easy: string; color: string; plants: string };
    }>;
  }>;
  issues: Array<{
    id: string;
    object: string;
    room: string;
    direction: string;
    severity: string;
    problem: string;
    scientificReason: string;
    traditionalReason: string;
    remedy: {
      easy: string;
      moderate: string;
      color: string;
      plants: string;
    };
    expectedImprovement: string;
    priority: number;
    confidenceScore: number;
  }>;
  topPriorityFixes: string[];
  elementBalance: Record<string, number>;
  panchtattvaAnalysis: Record<
    string,
    {
      score: number;
      zones: string[];
      recommendation: string;
    }
  >;
  energyMap: { positive: string[]; negative: string[]; neutral: string[] };
  remedySummary: { immediate: string[]; shortTerm: string[]; longTerm: string[] };
  auspiciousColors: string[];
  avoidColors: string[];
  luckyElements: string[];
  professionalNote: string;
  createdAt: string;
}

type VastuScanApiPayload = Partial<VastuScanResult> & {
  id: string;
  status?: "pending" | "completed" | "failed";
  createdAt?: string;
  report?: Partial<VastuScanResult>;
};

function fileMetaFromUri(uri: string): { name: string; type: string } {
  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (ext === "png") {
    return { name: "photo.png", type: "image/png" };
  }
  if (ext === "webp") {
    return { name: "photo.webp", type: "image/webp" };
  }
  return { name: "photo.jpg", type: "image/jpeg" };
}

function mapScanPayload(data: VastuScanApiPayload): VastuScanResult {
  const source = data.report && typeof data.report === "object" ? data.report : data;
  return {
    id: data.id,
    status: data.status,
    overallScore: source.overallScore ?? 0,
    grade: source.grade ?? "C",
    summary: source.summary ?? "",
    scores: source.scores ?? {
      financialScore: 0,
      healthScore: 0,
      relationshipScore: 0,
      careerScore: 0,
      elementBalance: {},
    },
    roomAnalyses: source.roomAnalyses ?? [],
    issues: source.issues ?? [],
    topPriorityFixes: source.topPriorityFixes ?? [],
    elementBalance: source.elementBalance ?? source.scores?.elementBalance ?? {},
    panchtattvaAnalysis: source.panchtattvaAnalysis ?? {},
    energyMap: source.energyMap ?? { positive: [], negative: [], neutral: [] },
    remedySummary: source.remedySummary ?? { immediate: [], shortTerm: [], longTerm: [] },
    auspiciousColors: source.auspiciousColors ?? [],
    avoidColors: source.avoidColors ?? [],
    luckyElements: source.luckyElements ?? [],
    professionalNote: source.professionalNote ?? "",
    createdAt: data.createdAt ?? source.createdAt ?? new Date().toISOString(),
  };
}

export async function submitVastuScan(params: {
  photos: VastuPhoto[];
  northDirection: number;
  propertyType?: string;
}): Promise<VastuScanResult> {
  const form = new FormData();
  form.append("northDirection", String(params.northDirection));
  form.append("propertyType", params.propertyType ?? "residential");
  form.append("roomLabels", JSON.stringify(params.photos.map((p) => p.roomLabel)));
  form.append(
    "userDescriptions",
    JSON.stringify(
      params.photos.map((p) => ({ roomLabel: p.roomLabel, description: p.description }))
    )
  );
  form.append(
    "directions",
    JSON.stringify(
      params.photos.map((p) => ({
        roomLabel: p.roomLabel,
        direction: p.direction,
        degrees: p.degrees,
      }))
    )
  );

  form.append(
    "compassDirections",
    JSON.stringify(params.photos.map((p) => p.degrees))
  );

  params.photos.forEach((photo) => {
    const { name, type } = fileMetaFromUri(photo.uri);
    form.append("photos", { uri: photo.uri, name, type } as unknown as Blob);
  });

  const res = await api.post<{ success: boolean; data: VastuScanApiPayload }>(
    "/api/vastu/analyze",
    form
  );
  return mapScanPayload(res.data.data);
}

export async function getVastuHistory(): Promise<
  Array<{
    id: string;
    createdAt: string;
    overallScore: number;
    propertyType: string;
  }>
> {
  const res = await api.get<{
    success: boolean;
    data: Array<{
      id: string;
      createdAt: string;
      overallScore: number;
      propertyType: string;
    }>;
  }>("/api/vastu/history");
  return res.data.data;
}

export async function getVastuScan(id: string): Promise<VastuScanResult> {
  const res = await api.get<{ success: boolean; data: VastuScanApiPayload }>(
    `/api/vastu/scan/${id}`
  );
  return mapScanPayload(res.data.data);
}

export function gradeColor(grade: string): string {
  if (grade === "A+") return "#D4AF37";
  if (grade === "A") return "#10B981";
  if (grade === "B+") return "#14B8A6";
  if (grade === "B") return "#3B82F6";
  if (grade === "C") return "#F97316";
  return "#EF4444";
}

export function severityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "critical") return "#EF4444";
  if (s === "high") return "#F97316";
  if (s === "medium") return "#EAB308";
  return "#6B7280";
}
