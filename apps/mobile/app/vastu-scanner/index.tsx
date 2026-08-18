import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  bg: "#0F0A1E",
  primary: "#7C3AED",
  secondary: "#C4B5FD",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  card: "#1A1230",
  border: "#2D2450",
};

const PROPERTY_TYPES = [
  { key: "residential", label: "Residential" },
  { key: "apartment", label: "Apartment" },
  { key: "office", label: "Office" },
  { key: "shop", label: "Shop" },
] as const;

const FEATURES = [
  { icon: "📜", title: "267+ Vastu Rules", sub: "Comprehensive Shastra database" },
  { icon: "👁️", title: "AI Vision Analysis", sub: "Claude scans every detail" },
  { icon: "⚡", title: "Instant Report", sub: "Full score in 30 seconds" },
];

export default function VastuScannerIntroScreen() {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState<string>("residential");
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const rotateAnim = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    pulseAnim.start();
    rotateAnim.start();
    return () => {
      pulseAnim.stop();
      rotateAnim.stop();
    };
  }, [pulse, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>

        <Text style={styles.title}>🏠 AI Vastu Scanner</Text>
        <Text style={styles.subtitle}>World&apos;s most advanced Vastu analysis</Text>

        <View style={styles.mandalaWrap}>
          <Animated.View
            style={[
              styles.mandalaOuter,
              { transform: [{ scale: pulse }, { rotate: spin }] },
            ]}
          >
            <View style={styles.mandalaRing} />
            <View style={styles.mandalaInner} />
          </Animated.View>
          <Text style={styles.mandalaCenter}>☸</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Property Type</Text>
        <View style={styles.pillRow}>
          {PROPERTY_TYPES.map((p) => {
            const selected = propertyType === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPropertyType(p.key)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.cta}
          onPress={() =>
            router.push({
              pathname: "/vastu-scanner/compass",
              params: { propertyType },
            })
          }
        >
          <Text style={styles.ctaText}>Start Vastu Scan</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>

        <Pressable onPress={() => router.push("/vastu-scanner/history")} style={styles.historyLink}>
          <Text style={styles.historyText}>My Vastu Reports ›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 8, alignSelf: "flex-start" },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
  },
  mandalaWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    marginBottom: 28,
  },
  mandalaOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  mandalaRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderStyle: "dashed",
  },
  mandalaInner: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
  },
  mandalaCenter: {
    position: "absolute",
    fontSize: 36,
    color: COLORS.secondary,
  },
  features: { gap: 12, marginBottom: 28 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: { fontSize: 28, marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  featureSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 28 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  pillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: { color: COLORS.muted, fontWeight: "600", fontSize: 13 },
  pillTextSelected: { color: "#fff" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    marginBottom: 16,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  historyLink: { alignItems: "center", paddingVertical: 8 },
  historyText: { color: COLORS.secondary, fontWeight: "700", fontSize: 15 },
});
