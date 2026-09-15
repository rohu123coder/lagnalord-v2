import { calcStars, stars } from "../kundliLookups";
import type { KundliCalculateResponse } from "../types";

import { SectionTitle } from "./SectionTitle";

export function KundliLifeRatings({ result }: { result: KundliCalculateResponse }) {
  const ratings = [
    { area: "Personality", value: calcStars(result, [1]) },
    { area: "Career", value: calcStars(result, [10, 6]) },
    { area: "Marriage", value: calcStars(result, [7]) },
    { area: "Health", value: calcStars(result, [1, 6]) },
    { area: "Finance", value: calcStars(result, [2, 11]) },
  ];

  return (
    <section className="print:break-inside-avoid print:mb-6">
      <SectionTitle subtitle="Strength rating by house support">
        Life Area Ratings
      </SectionTitle>
      <div className="grid gap-4 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md sm:grid-cols-2 lg:grid-cols-5">
        {ratings.map((rating) => (
          <div
            key={rating.area}
            className="rounded-xl bg-[#09142a]/60 p-3 text-center print:break-inside-avoid"
          >
            <p className="text-xs uppercase tracking-wide text-[#C7C2B4]">
              {rating.area}
            </p>
            <p className="mt-1 text-lg font-semibold text-amber-500">
              {stars(rating.value)}
            </p>
            <p className="text-xs text-[#C7C2B4]">{rating.value}/5</p>
          </div>
        ))}
      </div>
    </section>
  );
}
