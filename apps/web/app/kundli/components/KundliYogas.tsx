import type { KundliCalculateResponse } from "../types";

import { SectionTitle } from "./SectionTitle";

export function KundliYogas({ result }: { result: KundliCalculateResponse }) {
  return (
    <section className="print:break-inside-avoid print:mb-6">
      <SectionTitle subtitle="Classical combinations detected in your chart">
        Yogas
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {result.yogas.map((y) => (
          <div
            key={y.name}
            className={`rounded-xl border p-4 print:break-inside-avoid ${
              y.present
                ? "border-[#b18d4f]/40 bg-[#b18d4f]/10"
                : "border-[#b18d4f]/10 bg-[#09142a]/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[#F5F1E8]">{y.name}</h3>
              <span
                className={
                  y.present
                    ? "text-xs font-medium text-[#C8AC80]"
                    : "text-xs text-[#C7C2B4]/50"
                }
              >
                {y.present ? "Present" : "—"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#C7C2B4]">{y.description}</p>
            <p className="mt-2 text-xs text-[#C7C2B4]/70">{y.effect}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
