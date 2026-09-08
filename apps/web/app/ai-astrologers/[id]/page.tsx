"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import { AIAstrologerChat } from "../../kundli/components/AIAstrologerChat";
import type { KundliCalculateResponse } from "../../kundli/types";

type Persona = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  photo_url: string | null;
  rate_per_min: number;
};

type BirthDetails = {
  hasDetails: boolean;
  data?: {
    dateOfBirth: string | null;
    timeOfBirth: string | null;
    placeName: string | null;
    lat: number | null;
    lng: number | null;
    gender: string | null;
  };
};

export default function AiAstrologerProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [kundliData, setKundliData] = useState<KundliCalculateResponse | null>(
    null
  );
  const [chatStarted, setChatStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-astrologer/personas");
        const json = await res.json();
        const match = (json?.personas as Persona[] | undefined)?.find(
          (p) => p.id === id
        );
        if (!cancelled) {
          if (match) {
            setPersona(match);
          } else {
            setError("Astrologer not found");
          }
        }
      } catch {
        if (!cancelled) setError("Could not load astrologer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleStartChat() {
    if (!user || !token) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/ai-astrologers/${id}`)}`
      );
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const bdRes = await fetch("/api/users/birth-details", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bdJson = (await bdRes.json()) as BirthDetails;
      if (!bdRes.ok || !bdJson.hasDetails || !bdJson.data) {
        setError(
          "Please complete your birth details in your profile first, then come back to chat."
        );
        return;
      }
      const bd = bdJson.data;
      if (!bd.dateOfBirth || bd.lat == null || bd.lng == null) {
        setError(
          "Your saved birth details are incomplete. Please update your profile."
        );
        return;
      }
      const gender = bd.gender === "female" ? "female" : "male";
      const calcRes = await fetch("/api/kundli/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name ?? "User",
          dob: bd.dateOfBirth,
          tob: bd.timeOfBirth,
          pob: bd.placeName ?? "Unknown",
          lat: bd.lat,
          lng: bd.lng,
          gender,
        }),
      });
      const calcJson = await calcRes.json();
      if (!calcRes.ok) {
        setError(calcJson?.error ?? "Could not calculate your kundli.");
        return;
      }
      setKundliData(calcJson as KundliCalculateResponse);
      setChatStarted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09142a]">
        <Navbar />
        <div className="mx-auto max-w-4xl animate-pulse px-4 py-10 sm:px-6">
          <div className="h-40 rounded-2xl bg-[#0E1C3B]" />
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="min-h-screen bg-[#09142a]">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <p className="text-[#C7C2B4]">{error ?? "Not found"}</p>
          <Link href="/" className="mt-6 inline-block font-semibold text-[#C8AC80]">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09142a] pb-16">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4 text-sm text-[#C7C2B4]">
          <Link href="/" className="hover:text-[#C8AC80]">
            Home
          </Link>{" "}
          &gt; <span>{persona.name}&apos;s Profile</span>
        </div>

        <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="shrink-0">
              {persona.photo_url ? (
                <img
                  src={persona.photo_url}
                  alt={persona.name}
                  className="h-[160px] w-[160px] rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-[160px] w-[160px] items-center justify-center rounded-2xl bg-[#09142a] text-5xl">
                  {persona.emoji}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#F5F1E8] sm:text-3xl">
                  {persona.name}
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#b18d4f]/20 px-2 py-0.5 text-xs font-semibold text-[#C8AC80]">
                  AI
                </span>
              </div>
              <p className="mt-2 text-sm text-[#C7C2B4]">{persona.tagline}</p>
              <p className="mt-3 text-lg font-bold text-[#F5F1E8]">
                ₹{persona.rate_per_min}/min
              </p>

              {!chatStarted ? (
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => void handleStartChat()}
                  className="mt-6 rounded-full bg-[#b18d4f] px-6 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#8E713F] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {starting ? "Preparing your chat…" : "Start Chat"}
                </button>
              ) : null}

              {error ? (
                <p className="mt-4 text-sm text-red-400">
                  {error}
                  {error.includes("birth details") ? (
                    <>
                      {" "}
                      <a href="/profile/birth-details" className="underline hover:text-red-300">
                        Complete now →
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {chatStarted && kundliData ? (
          <div className="mt-8">
            <AIAstrologerChat
              kundliData={kundliData}
              preselectedPersonaId={persona.id}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
