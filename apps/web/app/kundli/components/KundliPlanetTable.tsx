import type { KundliCalculateResponse } from "../types";

import { SectionTitle } from "./SectionTitle";

export function KundliPlanetTable({ result }: { result: KundliCalculateResponse }) {
  return (
    <section className="print:break-inside-avoid print:mb-6">
      <SectionTitle subtitle="Sidereal longitudes · retrograde marked">
        Planetary positions
      </SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] shadow-md">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#b18d4f]/20 bg-[#09142a] text-[#C8AC80]">
              <th className="px-4 py-3 font-semibold">Planet</th>
              <th className="px-4 py-3 font-semibold">Sign</th>
              <th className="px-4 py-3 font-semibold">House</th>
              <th className="px-4 py-3 font-semibold">Deg</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.planets.map((p) => (
              <tr
                key={p.name}
                className="border-b border-[#b18d4f]/10 hover:bg-[#09142a]/50"
              >
                <td className="px-4 py-2.5 font-medium text-[#F5F1E8]">
                  <span className="mr-2 text-[#C8AC80]">{p.symbol}</span>
                  {p.name}
                </td>
                <td className="px-4 py-2.5 text-[#C7C2B4]">{p.rashi}</td>
                <td className="px-4 py-2.5 text-[#C8AC80]">{p.house}</td>
                <td className="px-4 py-2.5 tabular-nums text-[#C7C2B4]">
                  {p.degree}° {p.minutes}′
                </td>
                <td className="px-4 py-2.5 text-xs text-[#C7C2B4]">
                  {p.isRetrograde ? (
                    <span className="rounded bg-[#0E1C3B] px-1.5 py-0.5">
                      ℞
                    </span>
                  ) : null}{" "}
                  {p.isExalted ? (
                    <span className="text-emerald-600">Exalted</span>
                  ) : null}{" "}
                  {p.isDebilitated ? (
                    <span className="text-rose-600">Debilitated</span>
                  ) : null}{" "}
                  {p.ownSign ? (
                    <span className="text-[#C8AC80]">Own</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
