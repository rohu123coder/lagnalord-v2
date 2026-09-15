import { Suspense } from "react";
import { headers } from "next/headers";

import { Footer } from "@/components/Footer";
import { HoroscopePreviewCard } from "@/components/HoroscopePreviewCard";
import { Navbar } from "@/components/Navbar";
import { type HoroscopeResponse, type Period } from "@/lib/horoscope";

import { HoroscopeControls } from "./HoroscopeControls";

const PERIODS: Period[] = ["today", "tomorrow", "weekly", "monthly"];

function parsePeriod(value: string | undefined): Period {
  const normalized = (value ?? "today").toLowerCase();
  return PERIODS.includes(normalized as Period)
    ? (normalized as Period)
    : "today";
}

function HoroscopeFallback() {
  return (
    <div className="mt-10 h-44 animate-pulse rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B]" />
  );
}

async function fetchHoroscope(
  rashi: string,
  period: Period
): Promise<HoroscopeResponse | null> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const res = await fetch(
    `${proto}://${host}/api/horoscope?rashi=${encodeURIComponent(rashi)}&period=${encodeURIComponent(period)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as HoroscopeResponse;
}

async function HoroscopeResult({
  rashi,
  period,
}: {
  rashi: string;
  period: Period;
}) {
  const data = await fetchHoroscope(rashi, period);
  if (!data) {
    return (
      <p className="mt-10 text-sm text-red-600">
        Unable to load horoscope right now.
      </p>
    );
  }
  return <HoroscopePreviewCard data={data} className="mt-10" />;
}

export default async function HoroscopePage({
  searchParams,
}: {
  searchParams: { rashi?: string; period?: string };
}) {
  const rashi = searchParams.rashi?.trim() || "aries";
  const period = parsePeriod(searchParams.period);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-[#F5F1E8] sm:text-4xl">
            Aaj Ka Rashifal | Daily Horoscope 2026
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#C7C2B4] sm:text-base">
            Choose your rashi and get personalized guidance for love, career,
            health, finance, family, and travel.
          </p>
        </header>

        <HoroscopeControls selectedRashi={rashi} period={period} />

        <Suspense key={`${rashi}-${period}`} fallback={<HoroscopeFallback />}>
          <HoroscopeResult rashi={rashi} period={period} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
