import Link from "next/link";

import type { HoroscopeResponse, Period } from "@/lib/horoscope";

const OVERVIEW_HEADING: Record<Period, string> = {
  today: "Today's Overview",
  tomorrow: "Tomorrow's Overview",
  weekly: "This Week's Overview",
  monthly: "This Month's Overview",
};

function renderStars(value: number) {
  const clamped = Math.max(1, Math.min(5, value));
  return (
    <span className="tracking-tight text-[#C8AC80]">
      {"★".repeat(clamped)}
      <span className="text-[#C7C2B4]/30">{"★".repeat(5 - clamped)}</span>
    </span>
  );
}

export function HoroscopePreviewCard({
  data,
  overviewHeading,
  className,
}: {
  data: HoroscopeResponse;
  overviewHeading?: string;
  className?: string;
}) {
  const heading = overviewHeading ?? OVERVIEW_HEADING[data.period];

  return (
    <div
      className={`rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm sm:p-6 ${className ?? "mt-6"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-3xl" aria-hidden="true">
            {data.rashi.symbol}
          </p>
          <h3 className="mt-2 text-xl font-bold text-[#F5F1E8]">
            {data.rashi.hindi} ({data.rashi.english})
          </h3>
          <p className="mt-1 text-sm text-[#C7C2B4]">{data.rashi.dateRange}</p>
        </div>
        <Link
          href={`/horoscope/${data.rashi.id}?period=${data.period}`}
          className="text-sm font-semibold text-[#C8AC80] transition hover:underline"
        >
          Open full page →
        </Link>
      </div>

      <h4 className="mt-5 font-bold text-[#F5F1E8]">{heading}</h4>
      <p className="mt-2 text-sm leading-7 text-[#C7C2B4]">{data.todayOverview}</p>

      <div className="mt-5 grid gap-3 rounded-xl bg-[#09142a] p-4 text-sm sm:grid-cols-3">
        <p>
          <span className="font-semibold text-[#C8AC80]">Lucky Number:</span>{" "}
          <span className="text-[#F5F1E8]">{data.lucky.number}</span>
        </p>
        <p>
          <span className="font-semibold text-[#C8AC80]">Lucky Color:</span>{" "}
          <span className="text-[#F5F1E8]">{data.lucky.color}</span>
        </p>
        <p>
          <span className="font-semibold text-[#C8AC80]">Lucky Time:</span>{" "}
          <span className="text-[#F5F1E8]">{data.lucky.time}</span>
        </p>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#C7C2B4] sm:grid-cols-2">
        <p>
          Love &amp; Relationships: {renderStars(data.ratings.love)}
        </p>
        <p>
          Career &amp; Business: {renderStars(data.ratings.career)}
        </p>
        <p>
          Health &amp; Wellness: {renderStars(data.ratings.health)}
        </p>
        <p>
          Finance &amp; Money: {renderStars(data.ratings.finance)}
        </p>
      </div>
    </div>
  );
}
