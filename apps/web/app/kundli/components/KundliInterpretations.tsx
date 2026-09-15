import type { KundliCalculateResponse } from "../types";

import { SectionTitle } from "./SectionTitle";

export function KundliInterpretations({
  result,
}: {
  result: KundliCalculateResponse;
}) {
  return (
    <section className="print:break-inside-avoid print:mb-6">
      <SectionTitle>Interpretations</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(result.predictions).map(([k, v]) => (
          <div
            key={k}
            className="rounded-xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm print:break-inside-avoid"
          >
            <h3 className="capitalize text-sm font-semibold text-[#C8AC80]">
              {k.replace(/([A-Z])/g, " $1").trim()}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#C7C2B4]">{v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
