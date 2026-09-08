"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import api from "@/lib/api";
import Link from "next/link";

const specializationOptions = [
  "Love & Relationship",
  "Career",
  "Finance",
  "Vastu",
  "Numerology",
  "Tarot",
  "Palmistry",
  "Vedic Astrology",
] as const;

const languageOptions = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
  "Gujarati",
] as const;

type Specialization = (typeof specializationOptions)[number];
type Language = (typeof languageOptions)[number];

export default function AstrologerRegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // STEP 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // STEP 2
  const [experience, setExperience] = useState("");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [ratePerMinute, setRatePerMinute] = useState("");
  const [bio, setBio] = useState("");

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const fullNameTrimmed = useMemo(() => fullName.trim(), [fullName]);

  const toggleOption = <T,>(
    current: T[],
    value: T
  ): T[] => {
    if (current.includes(value)) {
      return current.filter((x) => x !== value);
    }
    return [...current, value];
  };

  const validateStep1 = (): string | null => {
    if (!fullNameTrimmed) return "Full Name is required";
    if (!emailTrimmed) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(emailTrimmed)) return "Enter a valid email address";
    if (!phone.trim()) return "Phone number is required";
    if (!/^[6-9]\d{9}$/.test(phone.trim())) return "Enter a valid 10-digit Indian phone number";
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!confirmPassword) return "Confirm Password is required";
    if (confirmPassword !== password) return "Passwords do not match";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (!experience.trim()) return "Years of Experience is required";
    const exp = Number(experience);
    if (!Number.isFinite(exp) || exp < 0) return "Enter valid years of experience";
    if (specializations.length === 0) return "Select at least one specialization";
    if (languages.length === 0) return "Select at least one language";
    if (!ratePerMinute.trim()) return "Rate per minute is required";
    const rpm = Number(ratePerMinute);
    if (!Number.isFinite(rpm) || rpm < 5 || rpm > 500) return "Rate must be between 5 and 500";
    if (bio.length > 300) return "Bio must be at most 300 characters";
    return null;
  };

  const onContinue = () => {
    setError(null);
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(2);
  };

  const onSubmit = async () => {
    setError(null);
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/astrologer/register", {
        name: fullNameTrimmed,
        email: emailTrimmed,
        phone: phone.trim(),
        password,
        experience: Number(experience),
        specializations,
        languages,
        ratePerMinute: Number(ratePerMinute),
        bio: bio.trim(),
      });

      const data = res.data as { success: true; userId: string };
      if (!data?.success) {
        throw new Error("Unexpected response");
      }

      localStorage.setItem(
        "divinemarg_astrologer_pending",
        JSON.stringify({ name: fullNameTrimmed, email: emailTrimmed })
      );

      router.replace("/astrologer/pending");
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "response" in e &&
        e.response &&
        typeof e.response === "object" &&
        "data" in e.response &&
        e.response.data &&
        typeof e.response.data === "object" &&
        "error" in e.response.data
          ? String((e.response.data as { error?: string }).error)
          : "Application failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] to-[#0E1C3B]">
      <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#F5F1E8]">
            Astrologer Registration
          </h1>
          <Link href="/astrologer/login" className="text-sm font-semibold text-[#C8AC80] hover:underline">
            Sign in
          </Link>
        </div>

        <p className="mt-2 text-sm text-[#C7C2B4]">
          Step {step} of 2
        </p>

        <div className="mt-8 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                  placeholder="10-digit phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                />
                <p className="mt-1 text-xs text-[#C7C2B4]/70">
                  Minimum 8 characters.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={onContinue}
                disabled={loading}
                className="w-full rounded-xl bg-[#b18d4f] hover:bg-[#8E713F] hover:text-white py-3 text-sm font-semibold text-[#09142a] shadow-md transition hover:opacity-95 disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-[#C7C2B4]">
                  Specializations
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {specializationOptions.map((opt) => {
                    const checked = specializations.includes(opt);
                    return (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#b18d4f]/20 px-3 py-2 text-sm text-[#C7C2B4] hover:bg-[#b18d4f]/10"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSpecializations((cur) =>
                              toggleOption(cur, opt)
                            )
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[#C7C2B4]">
                  Languages spoken
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {languageOptions.map((opt) => {
                    const checked = languages.includes(opt);
                    return (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#b18d4f]/20 px-3 py-2 text-sm text-[#C7C2B4] hover:bg-[#b18d4f]/10"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setLanguages((cur) => toggleOption(cur, opt))}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Rate per minute in ₹
                </label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={ratePerMinute}
                  onChange={(e) => setRatePerMinute(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                />
                <p className="mt-1 text-xs text-[#C7C2B4]/70">
                  Between 5 and 500.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#C7C2B4]">
                  Short bio / about
                </label>
                <textarea
                  value={bio}
                  maxLength={300}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 min-h-[110px] w-full resize-y rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] shadow-sm outline-none ring-[#b18d4f] focus:ring-2"
                  placeholder="A short introduction (max 300 chars)"
                />
                <div className="mt-1 text-right text-xs text-[#C7C2B4]/70">
                  {bio.length}/300
                </div>
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-[#b18d4f]/30 px-3 py-3 text-sm font-semibold text-[#C7C2B4] shadow-sm transition hover:bg-[#09142a] disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-[#b18d4f] hover:bg-[#8E713F] hover:text-white px-3 py-3 text-sm font-semibold text-[#09142a] shadow-md transition hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Submitting…" : "Submit application"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[#C7C2B4]/70">
          By submitting, you agree that your application will be reviewed by our admin team.
        </p>
      </div>
    </div>
  );
}

