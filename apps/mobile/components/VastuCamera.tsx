import { CameraView, useCameraPermissions } from "expo-camera";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  primary: "#7C3AED",
  background: "#0F0A1E",
  text: "#FFFFFF",
  secondary: "#C4B5FD",
  gold: "#F5C451",
  lock: "#3B82F6",
  north: "#EF4444",
  facing: "#FFFFFF",
};

export type VastuCameraProps = {
  roomLabel: string;
  onCapture: (result: { uri: string; direction: string; degrees: number }) => void;
  onCancel: () => void;
};

export function headingToDirection(degrees: number): string {
  const d = ((degrees % 360) + 360) % 360;
  if (d >= 337.5 || d < 22.5) return "North";
  if (d >= 22.5 && d < 67.5) return "North-East";
  if (d >= 67.5 && d < 112.5) return "East";
  if (d >= 112.5 && d < 157.5) return "South-East";
  if (d >= 157.5 && d < 202.5) return "South";
  if (d >= 202.5 && d < 247.5) return "South-West";
  if (d >= 247.5 && d < 292.5) return "West";
  return "North-West";
}

export function headingToShort(degrees: number): string {
  const d = ((degrees % 360) + 360) % 360;
  if (d >= 337.5 || d < 22.5) return "N";
  if (d >= 22.5 && d < 67.5) return "NE";
  if (d >= 67.5 && d < 112.5) return "E";
  if (d >= 112.5 && d < 157.5) return "SE";
  if (d >= 157.5 && d < 202.5) return "S";
  if (d >= 202.5 && d < 247.5) return "SW";
  if (d >= 247.5 && d < 292.5) return "W";
  return "NW";
}

export function directionColor(short: string): string {
  switch (short) {
    case "N":
      return "#3B82F6";
    case "NE":
      return "#14B8A6";
    case "E":
      return "#22C55E";
    case "SE":
      return "#EAB308";
    case "S":
      return "#EF4444";
    case "SW":
      return "#F59E0B";
    case "W":
      return "#F97316";
    case "NW":
      return "#8B5CF6";
    default:
      return COLORS.primary;
  }
}

function directionArrow(short: string): string {
  switch (short) {
    case "N":
      return "↑";
    case "NE":
      return "↗";
    case "E":
      return "→";
    case "SE":
      return "↘";
    case "S":
      return "↓";
    case "SW":
      return "↙";
    case "W":
      return "←";
    case "NW":
      return "↖";
    default:
      return "•";
  }
}

const SMOOTHING_ALPHA = 0.2;
const DIAL_SIZE = 160;
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

type Tick = { angle: number; major: boolean; cardinal: boolean };

function buildTicks(): Tick[] {
  const ticks: Tick[] = [];
  for (let a = 0; a < 360; a += 15) {
    ticks.push({ angle: a, major: a % 45 === 0, cardinal: a % 90 === 0 });
  }
  return ticks;
}
const TICKS = buildTicks();

function DialContents() {
  return (
    <>
      {TICKS.map((tick) => {
        const len = tick.cardinal ? 11 : tick.major ? 7 : 4;
        const thickness = tick.cardinal ? 2 : 1;
        return (
          <View
            key={tick.angle}
            style={[
              styles.tickPivot,
              {
                transform: [{ rotate: `${tick.angle}deg` }, { translateY: -(RADIUS - 10) }],
              },
            ]}
          >
            <View
              style={{
                width: thickness,
                height: len,
                backgroundColor: tick.cardinal ? COLORS.gold : "rgba(255,255,255,0.4)",
                borderRadius: 1.5,
              }}
            />
          </View>
        );
      })}

      <View style={styles.northTriangle} />
      <Text style={[styles.cardinal, styles.cardinalN, styles.cardinalNRed]}>N</Text>
      <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
      <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
      <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>
    </>
  );
}

type CompassOverlayProps = {
  ringSpin: Animated.AnimatedInterpolation<string>;
  locked: boolean;
  glowScale: Animated.Value;
  glowOpacity: Animated.Value;
  roundedHeading: number;
  compassReady: boolean;
  fullDir: string;
  dirClr: string;
};

const CompassOverlay = memo(function CompassOverlay({
  ringSpin,
  locked,
  glowScale,
  glowOpacity,
  roundedHeading,
  compassReady,
  fullDir,
  dirClr,
}: CompassOverlayProps) {
  return (
    <View style={styles.compassWrap}>
      <Animated.View style={[styles.compassInner, { transform: [{ scale: glowScale }] }]}>
        <Animated.View pointerEvents="none" style={[styles.lockGlow, { opacity: glowOpacity }]} />

        <View style={styles.fixedPointer} />

        <LinearGradient
          colors={[COLORS.gold, COLORS.primary, COLORS.secondary, COLORS.gold]}
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
              <BlurView intensity={40} tint="dark" style={styles.blurFill}>
                <Animated.View style={[styles.rotatingDial, { transform: [{ rotate: ringSpin }] }]}>
                  <DialContents />
                </Animated.View>
              </BlurView>
            )}
          </View>
        </LinearGradient>

        <View style={[styles.compassDot, locked && styles.compassDotLocked]} />
      </Animated.View>

      <Text style={[styles.degreeText, locked && styles.degreeTextLocked]}>
        {compassReady ? `${locked ? 0 : roundedHeading}°` : "…"}
      </Text>
      <Text style={[styles.directionFull, { color: locked ? COLORS.lock : dirClr }]}>
        {fullDir}
      </Text>
    </View>
  );
});

export function VastuCamera({ roomLabel, onCapture, onCancel }: VastuCameraProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [heading, setHeading] = useState(0);
  const [compassReady, setCompassReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lowAccuracy, setLowAccuracy] = useState(false);

  const headingRef = useRef(0);
  const smoothedRef = useRef(0);
  const accumulatedRotation = useRef(0);
  const prevRawRef = useRef<number | null>(null);
  const wasLockedRef = useRef(false);
  const ringRotate = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const captureScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

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

        if (!cancelled) {
          setLowAccuracy(isHeadingLowAccuracy(data.accuracy));
        }

        const isLocked = Math.abs(shortestAngleDelta(smoothed, 0)) <= LOCK_THRESHOLD;

        headingRef.current = smoothed;
        if (!cancelled) {
          setHeading(smoothed);
          setCompassReady(true);
          setLocked(isLocked);
        }

        if (isLocked && !wasLockedRef.current) {
          try {
            Vibration.vibrate(12);
          } catch {
            /* optional haptic */
          }
          Animated.sequence([
            Animated.timing(glowScale, {
              toValue: 1.1,
              duration: 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        }
        wasLockedRef.current = isLocked;

        Animated.timing(glowOpacity, {
          toValue: isLocked ? 1 : 0,
          duration: 180,
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

  const shortDir = headingToShort(heading);
  const fullDir = headingToDirection(heading);
  const dirClr = directionColor(shortDir);
  const roundedHeading = Math.round(heading);

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady || capturing) return;

    const captureHeading = headingRef.current;
    const direction = headingToShort(captureHeading);

    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(captureScale, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(captureScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      Vibration.vibrate(10);
    } catch {
      /* optional haptic */
    }

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        onCapture({
          uri: photo.uri,
          direction,
          degrees: Math.round(captureHeading),
        });
      }
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { padding: 24 }]}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Allow camera access to capture Vastu photos with live compass direction.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.topBtn} onPress={onCancel}>
          <Text style={styles.topBtnText}>←</Text>
        </Pressable>
        <View style={styles.roomPill}>
          <Text style={styles.roomPillText}>📍 {roomLabel}</Text>
        </View>
        <View style={styles.topSpacer} />
      </View>

      {lowAccuracy ? (
        <View style={[styles.calibrateBanner, { top: insets.top + 60 }]}>
          <Text style={styles.calibrateText}>⚠️ Move phone in figure-8 to calibrate compass</Text>
        </View>
      ) : null}

      <CompassOverlay
        ringSpin={ringSpin}
        locked={locked}
        glowScale={glowScale}
        glowOpacity={glowOpacity}
        roundedHeading={roundedHeading}
        compassReady={compassReady}
        fullDir={fullDir}
        dirClr={dirClr}
      />

      <View style={[styles.directionBanner, { backgroundColor: `${dirClr}CC` }]}>
        <Text style={styles.directionBannerText}>
          {directionArrow(shortDir)} {shortDir} • {roundedHeading}°
        </Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={styles.sideBtn} onPress={() => setTorchOn((v) => !v)}>
          <Text style={styles.sideBtnText}>{torchOn ? "🔦" : "💡"}</Text>
        </Pressable>

        <Animated.View style={{ transform: [{ scale: captureScale }] }}>
          <Pressable
            style={[styles.captureOuter, (!cameraReady || capturing) && styles.captureDisabled]}
            onPress={() => void handleCapture()}
            disabled={!cameraReady || capturing}
          >
            {capturing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={styles.captureInner} />
            )}
          </Pressable>
        </Animated.View>

        <View style={[styles.lockPill, { borderColor: locked ? COLORS.lock : dirClr }]}>
          <Text style={[styles.lockText, { color: locked ? COLORS.lock : dirClr }]}>
            {shortDir} {roundedHeading}°
          </Text>
        </View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashOpacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionText: {
    color: COLORS.secondary,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: COLORS.secondary,
    fontWeight: "600",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBtnText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },
  roomPill: {
    backgroundColor: "rgba(124, 58, 237, 0.45)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.5)",
  },
  roomPillText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },
  topSpacer: { width: 40 },
  calibrateBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(245, 196, 81, 0.9)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    zIndex: 15,
  },
  calibrateText: {
    color: "#1A1230",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  compassWrap: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -100,
    alignItems: "center",
    zIndex: 10,
  },
  compassInner: {
    width: DIAL_SIZE + 20,
    height: DIAL_SIZE + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lockGlow: {
    position: "absolute",
    width: DIAL_SIZE + 34,
    height: DIAL_SIZE + 34,
    borderRadius: (DIAL_SIZE + 34) / 2,
    backgroundColor: "#3B82F644",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  fixedPointer: {
    position: "absolute",
    top: 2,
    width: 2,
    height: 10,
    borderRadius: 1.5,
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
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  dialInset: {
    width: DIAL_SIZE - 4,
    height: DIAL_SIZE - 4,
    borderRadius: (DIAL_SIZE - 4) / 2,
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
    width: DIAL_SIZE - 4,
    height: DIAL_SIZE - 4,
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
    top: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.north,
  },
  cardinal: {
    position: "absolute",
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 13,
  },
  cardinalN: { top: 18 },
  cardinalNRed: { color: COLORS.north, fontWeight: "800" },
  cardinalS: { bottom: 18 },
  cardinalE: { right: 20 },
  cardinalW: { left: 20 },
  compassDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 6,
  },
  compassDotLocked: {
    backgroundColor: COLORS.lock,
  },
  degreeText: {
    color: COLORS.text,
    fontWeight: "300",
    fontSize: 24,
    marginTop: 10,
    letterSpacing: -0.5,
  },
  degreeTextLocked: { color: COLORS.lock, fontWeight: "700" },
  directionFull: {
    fontWeight: "700",
    fontSize: 13,
    marginTop: 2,
  },
  directionBanner: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: 90,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 10,
  },
  directionBannerText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnText: { fontSize: 20 },
  captureOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureDisabled: { opacity: 0.5 },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  lockPill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    minWidth: 72,
    alignItems: "center",
  },
  lockText: {
    fontWeight: "800",
    fontSize: 12,
  },
  flash: {
    backgroundColor: "#fff",
    zIndex: 20,
  },
});
