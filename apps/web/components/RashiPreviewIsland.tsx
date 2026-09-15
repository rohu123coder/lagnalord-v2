"use client";

import { useState } from "react";

import { HoroscopePreviewCard } from "@/components/HoroscopePreviewCard";
import { formatDisplayDate } from "@/lib/formatDate";
import { createHoroscope, rashis, type Period } from "@/lib/horoscope";

function homepagePeriodToApi(period: string): Period {
  if (period === "Weekly") return "weekly";
  if (period === "Monthly" || period === "Yearly") return "monthly";
  return "today";
}

function homepageOverviewHeading(period: string) {
  switch (period) {
    case "Weekly":
      return "This Week's Overview";
    case "Monthly":
      return "This Month's Overview";
    case "Yearly":
      return "This Year's Overview";
    default:
      return "Today's Overview";
  }
}

export function RashiPreviewIsland() {
  const [activePeriod, setActivePeriod] = useState("Daily");
  const [selectedRashi, setSelectedRashi] = useState<string | null>(null);
  const homepageRashiPreview = selectedRashi
    ? createHoroscope(selectedRashi, homepagePeriodToApi(activePeriod))
    : null;
  const todayLong = formatDisplayDate(new Date());

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
      <div className="rounded-3xl border border-[#b18d4f]/25 bg-[#0E1C3B]/90 p-5 shadow-sm sm:p-8">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-[#b18d4f]/15 pb-4 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold text-[#C8AC80]">Select Your Rashi</h2>
          <p className="rounded-full bg-[#b18d4f]/15 px-4 py-1.5 text-sm font-semibold text-[#C8AC80]">
            {todayLong}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {rashis.map((rashi) => (
            <button
              key={rashi.id}
              type="button"
              onClick={() =>
                setSelectedRashi((current) => (current === rashi.id ? null : rashi.id))
              }
              className={`rounded-xl border bg-[#122352] p-3 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#b18d4f]/50 hover:shadow-md ${
                selectedRashi === rashi.id
                  ? "border-[#b18d4f] ring-2 ring-[#b18d4f]/30"
                  : "border-[#b18d4f]/20"
              }`}
            >
              <p className="text-2xl">{rashi.symbol}</p>
              <p className="mt-1 text-xs font-semibold text-[#F5F1E8] sm:text-sm">
                {rashi.english}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Daily", "Weekly", "Monthly", "Yearly"].map((period) => (
            <button
              key={period}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activePeriod === period
                  ? "bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] text-[#09142a]"
                  : "border border-[#b18d4f]/25 bg-[#0E1C3B] text-[#C8AC80] hover:bg-[#122352]"
              }`}
              onClick={() => setActivePeriod(period)}
            >
              {period}
            </button>
          ))}
        </div>
        {selectedRashi && homepageRashiPreview ? (
          <HoroscopePreviewCard
            data={homepageRashiPreview}
            overviewHeading={homepageOverviewHeading(activePeriod)}
          />
        ) : null}
      </div>
    </div>
  );
}
