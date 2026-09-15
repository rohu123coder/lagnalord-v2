"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { rashis, type Period } from "@/lib/horoscope";

const periods: Array<{ id: Period; label: string }> = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export function HoroscopeControls({
  selectedRashi,
  period,
}: {
  selectedRashi: string;
  period: Period;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateQuery = (nextRashi: string, nextPeriod: Period) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("rashi", nextRashi);
    next.set("period", nextPeriod);
    router.replace(`/horoscope?${next.toString()}`, { scroll: false });
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {periods.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => updateQuery(selectedRashi, item.id)}
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
              onClick={() => updateQuery(rashi.id, period)}
              className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Read Horoscope
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
