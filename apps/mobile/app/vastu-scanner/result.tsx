import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getVastuScan,
  gradeColor,
  severityColor,
  type VastuScanResult,
} from "../../lib/vastu";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  bg: "#0F0A1E",
  primary: "#7C3AED",
  secondary: "#C4B5FD",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  card: "#1A1230",
  border: "#2D2450",
  hero: "#312E81",
};

const PANCH_TATVA = [
  { key: "agni", label: "Agni (Fire)", emoji: "🔥", color: "#EF4444", field: "fire" },
  { key: "jal", label: "Jal (Water)", emoji: "💧", color: "#3B82F6", field: "water" },
  { key: "prithvi", label: "Prithvi (Earth)", emoji: "🌍", color: "#A16207", field: "earth" },
  { key: "vayu", label: "Vayu (Air)", emoji: "💨", color: "#14B8A6", field: "wood" },
  { key: "akash", label: "Akash (Space)", emoji: "✨", color: "#8B5CF6", field: "metal" },
] as const;

const COLOR_SWATCHES: Record<string, string> = {
  white: "#FFFFFF",
  yellow: "#EAB308",
  green: "#22C55E",
  pink: "#F472B6",
  cream: "#FEF3C7",
  beige: "#D6D3D1",
  blue: "#3B82F6",
  red: "#EF4444",
  black: "#1F2937",
  orange: "#F97316",
  gold: "#D4AF37",
  grey: "#6B7280",
  gray: "#6B7280",
  saffron: "#F97316",
  peach: "#FDBA74",
};

function swatchColor(name: string): string {
  const key = name.toLowerCase().split(" ")[0] ?? name;
  return COLOR_SWATCHES[key] ?? "#7C3AED";
}

function AnimatedBar({ score, color }: { score: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(100, Math.max(0, score)),
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [score, width]);
  const barWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
    </View>
  );
}

function CountUpScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = 40;
    const timer = setInterval(() => {
      frame += 1;
      setDisplay(Math.round((target * frame) / total));
      if (frame >= total) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [target]);
  return <Text style={styles.heroScore}>{display}</Text>;
}

export default function VastuResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<VastuScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [remedyTab, setRemedyTab] = useState<"immediate" | "shortTerm" | "longTerm">("immediate");
  const [checkedFixes, setCheckedFixes] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setError("Missing scan id");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchScan() {
      try {
        const data = await getVastuScan(id as string);
        if (cancelled) return;

        if (data.status === "pending") {
          setScan(data);
          setLoading(false);
          pollTimer = setTimeout(() => void fetchScan(), 5000);
          return;
        }

        setScan(data);
        setLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (e instanceof Error ? e.message : "Failed to load report");
        setError(msg);
        setLoading(false);
      }
    }

    void fetchScan();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your Vastu report…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scan?.status === "pending") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Our AI Vastu expert is analyzing your property…
          </Text>
          <Text style={[styles.loadingText, { fontSize: 13, marginTop: 8, opacity: 0.7 }]}>
            This usually takes 30–60 seconds. You'll get a notification when it's ready —
            feel free to close the app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scan?.status === "failed") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>
            Analysis failed. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !scan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Report not found"}</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const gradeClr = gradeColor(scan.grade);
  const miniScores = [
    { emoji: "💰", label: "Financial", value: scan.scores.financialScore },
    { emoji: "❤️", label: "Health", value: scan.scores.healthScore },
    { emoji: "💑", label: "Relationship", value: scan.scores.relationshipScore },
    { emoji: "💼", label: "Career", value: scan.scores.careerScore },
  ];

  const remedyList =
    remedyTab === "immediate"
      ? scan.remedySummary.immediate
      : remedyTab === "shortTerm"
        ? scan.remedySummary.shortTerm
        : scan.remedySummary.longTerm;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Vastu Report</Text>
        <Pressable onPress={() => router.push("/vastu-scanner/history")}>
          <Ionicons name="time-outline" size={22} color={COLORS.secondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View style={styles.hero}>
          <CountUpScore target={scan.overallScore} />
          <View style={[styles.gradeBadge, { backgroundColor: gradeClr }]}>
            <Text style={styles.gradeBadgeText}>{scan.grade}</Text>
          </View>
          <Text style={styles.heroSummary}>{scan.summary}</Text>
          <View style={styles.miniRow}>
            {miniScores.map((m) => (
              <View key={m.label} style={styles.miniCard}>
                <Text style={styles.miniEmoji}>{m.emoji}</Text>
                <Text style={styles.miniLabel}>{m.label}</Text>
                <Text style={styles.miniValue}>{m.value}</Text>
                <View style={styles.miniBarTrack}>
                  <View style={[styles.miniBarFill, { width: `${m.value}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* PANCH TATVA */}
        <SectionTitle title="⚡ Panch Tatva Balance" />
        <View style={styles.sectionCard}>
          {PANCH_TATVA.map((t) => {
            const zone = scan.panchtattvaAnalysis[t.key];
            const score =
              zone?.score ??
              scan.elementBalance[t.field] ??
              scan.scores.elementBalance[t.field] ??
              0;
            return (
              <View key={t.key} style={styles.panchRow}>
                <Text style={styles.panchLabel}>
                  {t.emoji} {t.label}
                </Text>
                <Text style={styles.panchScore}>{Math.round(score)}</Text>
                <AnimatedBar score={score} color={t.color} />
              </View>
            );
          })}
        </View>

        {/* ENERGY MAP */}
        <SectionTitle title="🗺️ Energy Zones" />
        <View style={styles.sectionCard}>
          <Text style={styles.chipHeading}>Positive</Text>
          <View style={styles.chipRow}>
            {scan.energyMap.positive.length ? (
              scan.energyMap.positive.map((z) => (
                <View key={z} style={[styles.chip, styles.chipGreen]}>
                  <Text style={styles.chipText}>{z}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>None detected yet</Text>
            )}
          </View>
          <Text style={styles.chipHeading}>Needs Attention</Text>
          <View style={styles.chipRow}>
            {scan.energyMap.negative.map((z) => (
              <View key={z} style={[styles.chip, styles.chipRed]}>
                <Text style={styles.chipText}>{z}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chipHeading}>Neutral</Text>
          <View style={styles.chipRow}>
            {scan.energyMap.neutral.slice(0, 4).map((z) => (
              <View key={z} style={[styles.chip, styles.chipYellow]}>
                <Text style={styles.chipTextDark}>{z}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ISSUES */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>⚠️ Issues Found</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{scan.issues.length}</Text>
          </View>
        </View>
        {scan.issues.map((issue) => {
          const open = expandedIssue === issue.id;
          return (
            <Pressable
              key={issue.id}
              style={styles.issueCard}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedIssue(open ? null : issue.id);
              }}
            >
              <View style={styles.issueHeader}>
                <View style={[styles.severityBadge, { backgroundColor: severityColor(issue.severity) }]}>
                  <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
                </View>
                <Text style={styles.confidence}>{issue.confidenceScore}% match</Text>
              </View>
              <Text style={styles.issueTitle}>
                {issue.object.replace(/_/g, " ")} · {issue.room} · {issue.direction}
              </Text>
              <Text style={styles.issueProblem}>{issue.problem}</Text>
              {open ? (
                <>
                  <Text style={styles.issueSubhead}>Scientific reason</Text>
                  <Text style={styles.issueBody}>{issue.scientificReason}</Text>
                  <Text style={styles.issueSubhead}>Traditional reason</Text>
                  <Text style={styles.issueBody}>{issue.traditionalReason}</Text>
                </>
              ) : (
                <Text style={styles.tapHint}>Tap to expand details</Text>
              )}
              <View style={styles.remedyBox}>
                <Text style={styles.remedyLabel}>Easy fix</Text>
                <Text style={styles.remedyEasy}>{issue.remedy.easy}</Text>
              </View>
              <Text style={styles.improvement}>✨ {issue.expectedImprovement}</Text>
            </Pressable>
          );
        })}

        {/* TOP FIXES */}
        <SectionTitle title="🎯 Top Priority Fixes" />
        <View style={styles.sectionCard}>
          {scan.topPriorityFixes.map((fix, i) => (
            <Pressable
              key={i}
              style={styles.fixRow}
              onPress={() => setCheckedFixes((p) => ({ ...p, [i]: !p[i] }))}
            >
              <View style={[styles.checkbox, checkedFixes[i] && styles.checkboxChecked]}>
                {checkedFixes[i] ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={[styles.fixText, checkedFixes[i] && styles.fixTextDone]}>
                {i + 1}. {fix}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ROOM ANALYSIS */}
        <SectionTitle title="🏠 Room-wise Analysis" />
        {scan.roomAnalyses.map((room) => {
          const open = expandedRoom === room.roomType;
          return (
            <Pressable
              key={room.roomType}
              style={styles.roomCard}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedRoom(open ? null : room.roomType);
              }}
            >
              <View style={styles.roomHeader}>
                <Text style={styles.roomName}>{room.roomType}</Text>
                <View style={styles.roomScoreBadge}>
                  <Text style={styles.roomScoreText}>{room.score}</Text>
                </View>
              </View>
              {open ? (
                <>
                  {room.positives.length > 0 ? (
                    <>
                      <Text style={styles.bulletHead}>Positives</Text>
                      {room.positives.map((p) => (
                        <Text key={p} style={styles.bulletGreen}>
                          • {p}
                        </Text>
                      ))}
                    </>
                  ) : null}
                  {room.issues.length > 0 ? (
                    <>
                      <Text style={styles.bulletHead}>Issues</Text>
                      {room.issues.map((iss, idx) => (
                        <Text key={`${iss.object}-${idx}`} style={styles.bulletRed}>
                          • {iss.problem}
                        </Text>
                      ))}
                    </>
                  ) : null}
                </>
              ) : (
                <Text style={styles.tapHint}>Tap to expand</Text>
              )}
            </Pressable>
          );
        })}

        {/* REMEDIES */}
        <SectionTitle title="💊 Remedy Plan" />
        <View style={styles.tabRow}>
          {(["immediate", "shortTerm", "longTerm"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, remedyTab === tab && styles.tabActive]}
              onPress={() => setRemedyTab(tab)}
            >
              <Text style={[styles.tabText, remedyTab === tab && styles.tabTextActive]}>
                {tab === "immediate" ? "Immediate" : tab === "shortTerm" ? "Short Term" : "Long Term"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sectionCard}>
          {remedyList.length ? (
            remedyList.map((r, i) => (
              <View key={i} style={styles.remedyCard}>
                <Text style={styles.remedyCardText}>{r}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No remedies in this category</Text>
          )}
        </View>

        {/* COLORS */}
        <SectionTitle title="🎨 Auspicious Colors" />
        <View style={styles.sectionCard}>
          <View style={styles.swatchRow}>
            {scan.auspiciousColors.map((c) => (
              <View key={c} style={styles.swatchWrap}>
                <View style={[styles.swatch, { backgroundColor: swatchColor(c) }]} />
                <Text style={styles.swatchLabel}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <SectionTitle title="🌿 Lucky Elements" />
        <View style={styles.chipRow}>
          {scan.luckyElements.map((el) => (
            <View key={el} style={[styles.chip, styles.chipGreen]}>
              <Text style={styles.chipText}>{el}</Text>
            </View>
          ))}
        </View>

        <SectionTitle title="❌ Avoid Colors" />
        <View style={styles.sectionCard}>
          <View style={styles.swatchRow}>
            {scan.avoidColors.map((c) => (
              <View key={c} style={styles.swatchWrap}>
                <View style={[styles.swatch, styles.swatchAvoid, { backgroundColor: swatchColor(c) }]} />
                <Text style={styles.swatchLabel}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* PRO NOTE */}
        <View style={styles.proCard}>
          <Text style={styles.proQuote}>"</Text>
          <Text style={styles.proText}>{scan.professionalNote}</Text>
          <Text style={styles.proAttr}>— DivineMarg Vastu Expert</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: COLORS.secondary, marginTop: 12 },
  errorText: { color: "#EF4444", textAlign: "center" },
  backLink: { marginTop: 16 },
  backLinkText: { color: COLORS.primary, fontWeight: "700" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topTitle: { color: COLORS.text, fontWeight: "700", fontSize: 17 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  hero: {
    backgroundColor: COLORS.hero,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroScore: {
    fontSize: 72,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 80,
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 12,
  },
  gradeBadgeText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  heroSummary: {
    color: COLORS.secondary,
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 16,
  },
  miniRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  miniCard: {
    width: "47%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  miniEmoji: { fontSize: 18 },
  miniLabel: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
  miniValue: { color: "#fff", fontWeight: "800", fontSize: 16 },
  miniBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  miniBarFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 2 },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  panchRow: { marginBottom: 14 },
  panchLabel: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  panchScore: {
    position: "absolute",
    right: 0,
    top: 0,
    color: COLORS.secondary,
    fontWeight: "700",
    fontSize: 12,
  },
  barTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  chipHeading: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginBottom: 6, marginTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipGreen: { backgroundColor: "rgba(16, 185, 129, 0.25)" },
  chipRed: { backgroundColor: "rgba(239, 68, 68, 0.25)" },
  chipYellow: { backgroundColor: "rgba(234, 179, 8, 0.25)" },
  chipText: { color: "#A7F3D0", fontSize: 11, fontWeight: "600" },
  chipTextDark: { color: "#FDE68A", fontSize: 11, fontWeight: "600" },
  muted: { color: COLORS.muted, fontSize: 13 },
  issueCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  issueHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { color: "#fff", fontWeight: "800", fontSize: 10 },
  confidence: { color: COLORS.muted, fontSize: 11 },
  issueTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14, marginBottom: 6 },
  issueProblem: { color: COLORS.secondary, fontSize: 13, lineHeight: 19 },
  issueSubhead: { color: COLORS.muted, fontWeight: "700", fontSize: 11, marginTop: 10 },
  issueBody: { color: COLORS.secondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  tapHint: { color: COLORS.muted, fontSize: 11, marginTop: 8, fontStyle: "italic" },
  remedyBox: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  remedyLabel: { color: "#10B981", fontWeight: "800", fontSize: 11 },
  remedyEasy: { color: "#D1FAE5", fontSize: 12, marginTop: 4, lineHeight: 18 },
  improvement: { color: COLORS.secondary, fontSize: 12, marginTop: 8 },
  fixRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkMark: { color: "#fff", fontWeight: "800", fontSize: 12 },
  fixText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 19 },
  fixTextDone: { textDecorationLine: "line-through", color: COLORS.muted },
  roomCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  roomScoreBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomScoreText: { color: "#fff", fontWeight: "800" },
  bulletHead: { color: COLORS.muted, fontWeight: "700", fontSize: 11, marginTop: 10 },
  bulletGreen: { color: "#A7F3D0", fontSize: 12, marginTop: 4, lineHeight: 18 },
  bulletRed: { color: "#FCA5A5", fontSize: 12, marginTop: 4, lineHeight: 18 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontWeight: "700", fontSize: 11 },
  tabTextActive: { color: "#fff" },
  remedyCard: {
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  remedyCardText: { color: COLORS.secondary, fontSize: 13, lineHeight: 19 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  swatchWrap: { alignItems: "center" },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "#fff" },
  swatchAvoid: { opacity: 0.5 },
  swatchLabel: { color: COLORS.muted, fontSize: 10, marginTop: 4, maxWidth: 60, textAlign: "center" },
  proCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  proQuote: { fontSize: 40, color: COLORS.primary, lineHeight: 40, marginBottom: -8 },
  proText: { color: COLORS.secondary, fontSize: 14, lineHeight: 22, fontStyle: "italic" },
  proAttr: { color: COLORS.muted, fontSize: 12, marginTop: 12, fontWeight: "600" },
});
