import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "../../lib/api";
import { setupPushNotifications } from "../../lib/pushNotifications";
import { useAppStore, type User } from "../../lib/store";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const hydrateAuth = useAppStore((state) => state.hydrateAuth);

  const submitDetails = async () => {
    if (loading) return;
    if (name.trim().length < 2) {
      Alert.alert("Error", "Please enter your full name.");
      return;
    }
    if (phone.trim().length < 8) {
      Alert.alert("Error", "Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register", { name: name.trim(), phone: phone.trim() });
      setRequested(true);
      Alert.alert("OTP sent", "Please check your phone for the verification code.");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not create account. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async () => {
    if (loading) return;
    if (otp.trim().length === 0) {
      Alert.alert("Error", "Please enter the OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", {
        phone: phone.trim(),
        otp: otp.trim(),
        isRegistration: true,
      });
      const token = (res.data?.data?.token ?? "") as string;
      const payload = (res.data?.data?.user ?? {}) as Partial<User>;
      if (!token || !payload.id || !payload.name) throw new Error("Invalid response");
      hydrateAuth({
        user: {
          id: payload.id,
          name: payload.name,
          phone: payload.phone ?? phone,
          wallet_balance: payload.wallet_balance ?? 0,
          profile_photo: payload.profile_photo ?? null,
        },
        token,
      });
      void setupPushNotifications(token);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Invalid OTP. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A2E" }}>Create Account</Text>
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Create your account</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={name}
          onChangeText={setName}
          editable={!requested}
        />
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          editable={!requested}
        />
        {requested ? (
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
          />
        ) : null}
        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={requested ? verifyAndLogin : submitDetails}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {requested
              ? loading
                ? "Verifying..."
                : "Verify OTP"
              : loading
              ? "Sending OTP..."
              : "Sign Up"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 26, color: "#1A1A2E", fontWeight: "800", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#D4AF37",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  buttonText: { color: "#1A1A2E", fontWeight: "700" },
});
