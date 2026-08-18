import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getVastuHistory, gradeColor } from "../../lib/vastu";

type HistoryItem = {
  id: string;
  createdAt: string;
  overallScore: number;
  propertyType: string;
};

function scoreGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

export default function VastuHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getVastuHistory();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>My Vastu Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySub}>Start your first Vastu scan!</Text>
          <Pressable style={styles.startBtn} onPress={() => router.push("/vastu-scanner")}>
            <Text style={styles.startBtnText}>Start Vastu Scan</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#7C3AED"
            />
          }
        >
          {items.map((item) => {
            const grade = scoreGrade(item.overallScore);
            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/vastu-scanner/result",
                    params: { id: item.id },
                  })
                }
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.cardDate}>
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={styles.cardType}>{item.propertyType}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardScore}>{item.overallScore}</Text>
                  <View style={[styles.gradeBadge, { backgroundColor: gradeColor(grade) }]}>
                    <Text style={styles.gradeText}>{grade}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0A1E" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 17 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  emptySub: { color: "#9CA3AF", marginTop: 6, marginBottom: 20 },
  startBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtnText: { color: "#fff", fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1230",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D2450",
    marginBottom: 10,
  },
  cardLeft: { flex: 1 },
  cardDate: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cardType: { color: "#C4B5FD", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  cardRight: { alignItems: "center", marginRight: 12 },
  cardScore: { color: "#fff", fontSize: 22, fontWeight: "800" },
  gradeBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
});
