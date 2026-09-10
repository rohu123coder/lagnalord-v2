"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/Footer";
import { HoroscopePreviewCard } from "@/components/HoroscopePreviewCard";
import { Navbar } from "@/components/Navbar";
import {
  rashis,
  type HoroscopeResponse,
  type Period,
} from "@/lib/horoscope";

const periods: Array<{ id: Period; label: string }> = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export default function HoroscopePage() {
  const [period, setPeriod] = useState<Period>("today");
  const [selectedRashi, setSelectedRashi] = useState<string>(rashis[0].id);
  const [data, setData] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/horoscope?rashi=${selectedRashi}&period=${period}`
        );
        if (!res.ok) {
          throw new Error("Could not fetch horoscope");
        }
        const json = (await res.json()) as HoroscopeResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRashi, period]);

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

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {periods.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                period === item.id
                  ? "bg-[#b18d4f] text-[#09142a] shadow-md"
                  : "bg-[#0E1C3B] text-[#C7C2B4] ring-1 ring-[#b18d4f]/20 hover:bg-[#09142a]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rashis.map((rashi) => (
            <article
              key={rashi.id}
              className={`rounded-2xl border bg-[#0E1C3B] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
                selectedRashi === rashi.id
                  ? "border-[#b18d4f] ring-2 ring-[#b18d4f]/30"
                  : "border-[#b18d4f]/20"
              }`}
              style={{
                background: `linear-gradient(135deg, ${rashi.color}22 0%, #0E1C3B 55%)`,
              }}
            >
              <p className="text-4xl">{rashi.symbol}</p>
              <h2 className="mt-3 text-xl font-bold text-[#F5F1E8]">
                {rashi.hindi} ({rashi.english})
              </h2>
              <p className="mt-1 text-sm text-[#C7C2B4]">{rashi.dateRange}</p>
              <button
                type="button"
                onClick={() => setSelectedRashi(rashi.id)}
                className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
              >
                Read Horoscope
              </button>
            </article>
          ))}
        </section>

        {loading ? (
          <div className="mt-10 h-44 animate-pulse rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B]" />
        ) : data ? (
          <HoroscopePreviewCard data={data} className="mt-10" />
        ) : (
          <p className="mt-10 text-sm text-red-600">
            Unable to load horoscope right now.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
