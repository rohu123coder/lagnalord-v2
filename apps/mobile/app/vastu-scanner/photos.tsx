import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VastuCamera, directionColor, headingToShort } from "../../components/VastuCamera";
import { pickImage, processPickedImage } from "../../lib/imagePicker";
import { submitVastuScan, type VastuPhoto } from "../../lib/vastu";

const COLORS = {
  bg: "#0F0A1E",
  primary: "#7C3AED",
  secondary: "#C4B5FD",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  card: "#1A1230",
  border: "#2D2450",
  tipBg: "#1E1535",
};

const ROOM_TYPES = [
  "Entrance",
  "Kitchen",
  "Bedroom",
  "Master Bedroom",
  "Children Room",
  "Living Room",
  "Dining Room",
  "Bathroom",
  "Puja Room",
  "Office",
  "Store Room",
  "Balcony",
  "Staircase",
  "Garden/Terrace",
  "Garage",
  "Other",
];

const DESCRIPTION_PLACEHOLDERS: Record<string, string> = {
  Entrance: "Main door faces east, shoe rack on left...",
  Kitchen: "Gas stove on south wall, sink on north...",
  Bedroom: "Bed against west wall, mirror on east...",
  "Master Bedroom": "King bed in SW corner, wardrobe on west wall...",
  "Children Room": "Study desk facing east, bunk bed on south wall...",
  "Living Room": "Sofa faces north, TV on south wall...",
  "Dining Room": "Dining table in center, window on east side...",
  Bathroom: "Toilet in north corner, geyser on east...",
  "Puja Room": "Mandir facing east, diya on northeast corner...",
  Office: "Desk facing north, bookshelf on east wall...",
  "Store Room": "Heavy items in SW, shelves along west wall...",
  Balcony: "Plants on NE side, seating facing garden...",
  Staircase: "Stairs running south to north, landing on first floor...",
  "Garden/Terrace": "Tulsi plant in NE, heavy pots in SW corner...",
  Garage: "Vehicle parking in NW, tools on west wall...",
  Other: "Describe this area... (e.g., utility room, hallway, storage)",
};

const MAX_PHOTOS = 10;

function descriptionPlaceholder(roomLabel: string): string {
  return (
    DESCRIPTION_PLACEHOLDERS[roomLabel] ??
    "Describe this area... (e.g., 'Main kitchen, gas stove on left wall, window on north side')"
  );
}

export default function VastuPhotosScreen() {
  const router = useRouter();
  const { northDirection, propertyType } = useLocalSearchParams<{
    northDirection?: string;
    propertyType?: string;
  }>();

  const north = Number(northDirection ?? 0);
  const propType = propertyType ?? "residential";

  const [photos, setPhotos] = useState<VastuPhoto[]>([]);
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  function openSlot(index: number) {
    if (photos[index]) return;
    if (photos.length >= MAX_PHOTOS && index >= photos.length) {
      Alert.alert("Limit reached", "Maximum 10 photos allowed");
      return;
    }
    setActiveSlot(index);
  }

  async function addPhoto(
    uri: string,
    meta?: { direction: string; degrees: number }
  ) {
    const slot = activeSlot ?? photos.length;
    const entry: VastuPhoto = {
      uri,
      roomLabel: selectedRoom,
      direction: meta?.direction ?? headingToShort(north),
      degrees: meta?.degrees ?? north,
      description: "",
    };
    setPhotos((prev) => {
      const next = [...prev];
      if (slot < next.length) {
        next[slot] = entry;
      } else {
        next.push(entry);
      }
      return next.slice(0, MAX_PHOTOS);
    });
    setActiveSlot(null);
  }

  function updatePhotoDescription(index: number, text: string) {
    setPhotos((prev) =>
      prev.map((photo, i) => (i === index ? { ...photo, description: text } : photo))
    );
  }

  async function handleCameraCapture(result: {
    uri: string;
    direction: string;
    degrees: number;
  }) {
    setShowCamera(false);
    setProcessingPhoto(true);
    try {
      const finalUri = await processPickedImage(result.uri);
      await addPhoto(finalUri, {
        direction: result.direction,
        degrees: result.degrees,
      });
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function handleGalleryPick() {
    const uri = await pickImage("gallery");
    if (!uri) return;
    await addPhoto(uri);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function showCaptureOptions() {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: () => setShowCamera(true) },
      { text: "Gallery", onPress: () => void handleGalleryPick() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleAnalyze() {
    if (photos.length === 0) {
      Alert.alert("Required", "Please add at least one photo");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitVastuScan({
        photos,
        northDirection: north,
        propertyType: propType,
      });
      router.replace({
        pathname: "/vastu-scanner/result",
        params: { id: result.id },
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (e instanceof Error ? e.message : "Something went wrong");
      Alert.alert("Submission failed", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Retry", onPress: () => void handleAnalyze() },
      ]);
      setSubmitting(false);
    }
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Step 2 of 2 — Scan Your Property</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tipBanner}>
          <Text style={styles.tipText}>
            💡 Pro tip: More photos = better analysis. Add description for each room for deeper
            insights.
          </Text>
        </View>

        <Text style={styles.subtitle}>Take photos of each area (min 1, max 10)</Text>

        <Text style={styles.sectionLabel}>Room type (select before each photo)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomScroll}>
          {ROOM_TYPES.map((room) => (
            <Pressable
              key={room}
              onPress={() => setSelectedRoom(room)}
              style={[styles.roomPill, selectedRoom === room && styles.roomPillActive]}
            >
              <Text
                style={[styles.roomPillText, selectedRoom === room && styles.roomPillTextActive]}
              >
                {room}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.slotsGrid}>
          {slots.map((photo, index) => (
            <View key={index} style={styles.slotWrap}>
              {photo ? (
                <View style={styles.filledSlot}>
                  <View style={styles.photoWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.thumb} />
                    <View
                      style={[
                        styles.directionBadge,
                        { backgroundColor: `${directionColor(photo.direction)}DD` },
                      ]}
                    >
                      <Text style={styles.directionBadgeText}>
                        {photo.direction} • {photo.degrees}°
                      </Text>
                    </View>
                    <Pressable style={styles.removeBtn} onPress={() => removePhoto(index)}>
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.roomLabel} numberOfLines={1}>
                    {photo.roomLabel}
                  </Text>
                  <TextInput
                    placeholder={descriptionPlaceholder(photo.roomLabel)}
                    value={photo.description}
                    onChangeText={(text) => updatePhotoDescription(index, text)}
                    style={styles.descriptionInput}
                    multiline
                    maxLength={200}
                    numberOfLines={2}
                    placeholderTextColor={COLORS.muted}
                  />
                  <Text style={styles.charCount}>{photo.description.length}/200</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.emptySlot}
                  onPress={() => {
                    openSlot(index);
                    showCaptureOptions();
                  }}
                >
                  <Ionicons name="add" size={32} color={COLORS.secondary} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {processingPhoto ? (
          <View style={styles.processing}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.processingText}>Processing photo…</Text>
          </View>
        ) : null}

        <Text style={styles.progress}>
          {photos.length}/{MAX_PHOTOS} photos added
        </Text>

        <Pressable
          style={[styles.analyzeBtn, (photos.length === 0 || submitting) && styles.analyzeDisabled]}
          onPress={() => void handleAnalyze()}
          disabled={photos.length === 0 || submitting}
        >
          {submitting ? (
            <View style={styles.analyzeInner}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.analyzeText}>Submitting…</Text>
            </View>
          ) : (
            <Text style={styles.analyzeText}>Analyze My Property</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <VastuCamera
          roomLabel={selectedRoom}
          onCapture={(result) => void handleCameraCapture(result)}
          onCancel={() => setShowCamera(false)}
        />
      </Modal>
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
  headerTitle: { color: COLORS.text, fontWeight: "700", fontSize: 15, flex: 1, textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  tipBanner: {
    backgroundColor: COLORS.tipBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipText: { color: COLORS.secondary, fontSize: 13, lineHeight: 20 },
  subtitle: { color: COLORS.secondary, fontSize: 14, marginBottom: 20, textAlign: "center" },
  sectionLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 10, fontWeight: "600" },
  roomScroll: { marginBottom: 20, maxHeight: 44 },
  roomPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.card,
  },
  roomPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roomPillText: { color: COLORS.muted, fontWeight: "600", fontSize: 13 },
  roomPillTextActive: { color: "#fff" },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  slotWrap: { width: "47%" },
  emptySlot: {
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  filledSlot: {},
  photoWrapper: { position: "relative" },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 12 },
  directionBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  directionBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 22 },
  roomLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  descriptionInput: {
    marginTop: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 12,
    minHeight: 52,
    textAlignVertical: "top",
  },
  charCount: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 4,
  },
  processing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
  },
  processingText: { color: COLORS.muted },
  progress: {
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 16,
    fontWeight: "600",
  },
  analyzeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  analyzeDisabled: { opacity: 0.5 },
  analyzeInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  analyzeText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
