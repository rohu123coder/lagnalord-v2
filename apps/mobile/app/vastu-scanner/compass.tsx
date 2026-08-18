import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  bg: "#0F0A1E",
  primary: "#7C3AED",
  accent: "#C4B5FD",
  gold: "#F5C451",
  lock: "#3B82F6",
  north: "#EF4444",
  facing: "#FFFFFF",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  card: "#1A1230",
};

const SMOOTHING_ALPHA = 0.15;
const DIAL_SIZE = 264;
const RADIUS = DIAL_SIZE / 2;
const LOCK_THRESHOLD = 3;

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function isHeadingLowAccuracy(accuracy: number | undefined): boolean {
  if (accuracy == null) return false;
  if (Platform.OS === "android") {
    return accuracy <= 1;
  }
  return accuracy < 0;
}

function degreesToShortCardinal(deg: number): string {
  const d = normalize360(deg);
  if (d >= 337.5 || d < 22.5) return "N";
  if (d >= 22.5 && d < 67.5) return "NE";
  if (d >= 67.5 && d < 112.5) return "E";
  if (d >= 112.5 && d < 157.5) return "SE";
  if (d >= 157.5 && d < 202.5) return "S";
  if (d >= 202.5 && d < 247.5) return "SW";
  if (d >= 247.5 && d < 292.5) return "W";
  return "NW";
}

type Tick = { angle: number; major: boolean; cardinal: boolean };

function buildTicks(): Tick[] {
  const ticks: Tick[] = [];
  for (let a = 0; a < 360; a += 10) {
    ticks.push({ angle: a, major: a % 30 === 0, cardinal: a % 90 === 0 });
  }
  return ticks;
}
const TICKS = buildTicks();

function DialContents() {
  return (
    <>
      {TICKS.map((tick) => {
        const len = tick.cardinal ? 16 : tick.major ? 11 : 6;
        const thickness = tick.cardinal ? 2.5 : 1.2;
        return (
          <View
            key={tick.angle}
            style={[
              styles.tickPivot,
              {
                transform: [{ rotate: `${tick.angle}deg` }, { translateY: -(RADIUS - 14) }],
              },
            ]}
          >
            <View
              style={{
                width: thickness,
                height: len,
                backgroundColor: tick.cardinal ? COLORS.gold : "rgba(255,255,255,0.4)",
                borderRadius: 2,
              }}
            />
          </View>
        );
      })}

      <View style={styles.northTriangle} />
      <Text style={[styles.dirLabel, styles.dirN, styles.dirNRed]}>N</Text>
      <Text style={[styles.dirLabel, styles.dirE]}>E</Text>
      <Text style={[styles.dirLabel, styles.dirS]}>S</Text>
      <Text style={[styles.dirLabel, styles.dirW]}>W</Text>
    </>
  );
}

type CompassDialProps = {
  ringSpin: Animated.AnimatedInterpolation<string>;
  locked: boolean;
  glowScale: Animated.Value;
  glowOpacity: Animated.Value;
};

const CompassDial = memo(function CompassDial({
  ringSpin,
  locked,
  glowScale,
  glowOpacity,
}: CompassDialProps) {
  return (
    <Animated.View style={[styles.compassWrap, { transform: [{ scale: glowScale }] }]}>
      <Animated.View pointerEvents="none" style={[styles.lockGlow, { opacity: glowOpacity }]} />

      <View style={styles.fixedPointer} />

      <LinearGradient
        colors={[COLORS.gold, COLORS.primary, COLORS.accent, COLORS.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientRing}
      >
        <View style={styles.dialInset}>
          {Platform.OS === "android" ? (
            <View style={[styles.blurFill, styles.androidFallbackBg]}>
              <Animated.View style={[styles.rotatingDial, { transform: [{ rotate: ringSpin }] }]}>
                <DialContents />
              </Animated.View>
            </View>
          ) : (
            <BlurView intensity={45} tint="dark" style={styles.blurFill}>
              <Animated.View style={[styles.rotatingDial, { transform: [{ rotate: ringSpin }] }]}>
                <DialContents />
              </Animated.View>
            </BlurView>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.compassCenter, locked && styles.compassCenterLocked]} />
    </Animated.View>
  );
});

export default function VastuCompassScreen() {
  const router = useRouter();
  const { propertyType } = useLocalSearchParams<{ propertyType?: string }>();
  const [heading, setHeading] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lowAccuracy, setLowAccuracy] = useState(false);

  const smoothedRef = useRef(0);
  const accumulatedRotation = useRef(0);
  const prevRawRef = useRef<number | null>(null);
  const wasLockedRef = useRef(false);
  const ringRotate = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setPermissionDenied(true);
        return;
      }

      subscription = await Location.watchHeadingAsync((data) => {
        const raw = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
        if (raw == null || Number.isNaN(raw)) return;

        if (prevRawRef.current === null) {
          smoothedRef.current = raw;
          accumulatedRotation.current = raw;
        } else {
          const delta = shortestAngleDelta(smoothedRef.current, raw);
          smoothedRef.current = normalize360(smoothedRef.current + SMOOTHING_ALPHA * delta);
          accumulatedRotation.current += shortestAngleDelta(prevRawRef.current, smoothedRef.current);
        }
        const smoothed = smoothedRef.current;
        prevRawRef.current = smoothed;

        setLowAccuracy(isHeadingLowAccuracy(data.accuracy));

        const isLocked = Math.abs(shortestAngleDelta(smoothed, 0)) <= LOCK_THRESHOLD;

        setHeading(Math.round(smoothed));
        setLocked(isLocked);

        if (isLocked && !wasLockedRef.current) {
          try {
            Vibration.vibrate(15);
          } catch {
            /* optional haptic */
          }
          Animated.sequence([
            Animated.timing(glowScale, {
              toValue: 1.08,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
              toValue: 1,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        }
        wasLockedRef.current = isLocked;

        Animated.timing(glowOpacity, {
          toValue: isLocked ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();

        ringRotate.setValue(-accumulatedRotation.current);
      });
    }

    void start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [ringRotate, glowOpacity, glowScale]);

  const ringSpin = useMemo(
    () =>
      ringRotate.interpolate({
        inputRange: [-360, 360],
        outputRange: ["-360deg", "360deg"],
        extrapolate: "extend",
      }),
    [ringRotate]
  );

  function confirmNorth() {
    router.push({
      pathname: "/vastu-scanner/photos",
      params: {
        northDirection: String(heading),
        propertyType: propertyType ?? "residential",
      },
    });
  }

  function skipNorth() {
    Alert.alert(
      "Skip calibration?",
      "Using 0° as default may reduce direction accuracy in your Vastu report.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use 0°",
          onPress: () =>
            router.push({
              pathname: "/vastu-scanner/photos",
              params: {
                northDirection: "0",
                propertyType: propertyType ?? "residential",
              },
            }),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Step 1 of 2 — Find North</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.instructions}>
          {permissionDenied
            ? "Location permission is needed for accurate compass readings."
            : locked
            ? "Perfect — you're facing True North"
            : "Turn until the red North marker reaches the top"}
        </Text>

        {lowAccuracy && !permissionDenied ? (
          <View style={styles.calibrateBanner}>
            <Text style={styles.calibrateText}>
              ⚠️ Compass needs calibration — move your phone in a figure-8 motion
            </Text>
          </View>
        ) : null}

        <CompassDial
          ringSpin={ringSpin}
          locked={locked}
          glowScale={glowScale}
          glowOpacity={glowOpacity}
        />

        <View style={styles.degreeRow}>
          <Text style={[styles.degree, locked && styles.degreeLocked]}>
            {locked ? 0 : heading}°
          </Text>
          <Text style={[styles.cardinalBig, locked && styles.degreeLocked]}>
            {locked ? "N" : degreesToShortCardinal(heading)}
          </Text>
        </View>
        <Text style={styles.degreeHint}>
          {permissionDenied ? "Compass unavailable" : locked ? "North locked" : "Your facing direction"}
        </Text>

        <Pressable
          style={[styles.confirmBtn, permissionDenied && styles.confirmDisabled]}
          onPress={confirmNorth}
          disabled={permissionDenied}
        >
          <Text style={styles.confirmText}>Confirm North Direction</Text>
        </Pressable>

        <Pressable onPress={skipNorth} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip (uses 0° — less accurate)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: COLORS.text, fontWeight: "700", fontSize: 16 },
  body: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 20 },
  instructions: {
    color: COLORS.accent,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    minHeight: 44,
  },
  compassWrap: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    width: DIAL_SIZE + 20,
    height: DIAL_SIZE + 20,
  },
  lockGlow: {
    position: "absolute",
    width: DIAL_SIZE + 40,
    height: DIAL_SIZE + 40,
    borderRadius: (DIAL_SIZE + 40) / 2,
    backgroundColor: "#3B82F644",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.9,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  fixedPointer: {
    position: "absolute",
    top: 0,
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.facing,
    zIndex: 5,
    opacity: 0.9,
  },
  gradientRing: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  dialInset: {
    width: DIAL_SIZE - 5,
    height: DIAL_SIZE - 5,
    borderRadius: (DIAL_SIZE - 5) / 2,
    overflow: "hidden",
  },
  blurFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  androidFallbackBg: {
    backgroundColor: "rgba(26, 18, 48, 0.85)",
  },
  rotatingDial: {
    width: DIAL_SIZE - 5,
    height: DIAL_SIZE - 5,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  tickPivot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  northTriangle: {
    position: "absolute",
    top: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.north,
  },
  dirLabel: {
    position: "absolute",
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
  },
  dirN: { top: 30 },
  dirNRed: { color: COLORS.north, fontWeight: "800" },
  dirS: { bottom: 30 },
  dirE: { right: 34 },
  dirW: { left: 34 },
  compassCenter: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 6,
  },
  compassCenterLocked: {
    backgroundColor: COLORS.lock,
  },
  degreeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2,
  },
  degree: {
    fontSize: 52,
    fontWeight: "300",
    color: COLORS.text,
    letterSpacing: -1,
  },
  cardinalBig: {
    fontSize: 34,
    fontWeight: "300",
    color: COLORS.text,
    marginLeft: 10,
    marginBottom: 8,
  },
  degreeLocked: { color: COLORS.lock },
  degreeHint: { color: COLORS.muted, fontSize: 13, marginBottom: 32, fontWeight: "600" },
  calibrateBanner: {
    backgroundColor: "rgba(245, 196, 81, 0.15)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: -20,
    marginBottom: 20,
  },
  calibrateText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  confirmBtn: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: COLORS.muted, fontSize: 13, textAlign: "center" },
});
