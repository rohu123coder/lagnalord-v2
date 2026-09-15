import type { KundliCalculateResponse } from "../types";

import { SectionTitle } from "./SectionTitle";

export function KundliDashaDosha({ result }: { result: KundliCalculateResponse }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2 print:break-inside-avoid print:mb-6">
      <div className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md">
        <SectionTitle>Vimshottari Dasha</SectionTitle>
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between">
            <span className="text-[#C7C2B4]">Mahadasha</span>
            <span className="font-semibold text-[#C8AC80]">
              {result.dasha.mahadasha.planet}
            </span>
          </li>
          <li className="flex justify-between text-xs text-[#C7C2B4]">
            <span>
              {result.dasha.mahadasha.startDate} → {result.dasha.mahadasha.endDate}
            </span>
          </li>
          <li className="flex justify-between border-t border-[#b18d4f]/10 pt-2">
            <span className="text-[#C7C2B4]">Antardasha</span>
            <span className="font-medium text-[#F5F1E8]">
              {result.dasha.antardasha.planet}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-[#C7C2B4]">Pratyantar</span>
            <span className="font-medium text-[#F5F1E8]">
              {result.dasha.pratyantar.planet}
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md">
        <SectionTitle>Doshas</SectionTitle>
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <span className="text-[#C7C2B4]">Mangal Dosha</span>
            <span
              className={
                result.doshas.mangalDosha.present
                  ? "rounded-full bg-rose-100 px-2 py-0.5 text-rose-800"
                  : "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
              }
            >
              {result.doshas.mangalDosha.present ? "Present" : "None"}
            </span>
            <span className="text-xs text-[#C7C2B4]">
              {result.doshas.mangalDosha.type} · {result.doshas.mangalDosha.severity}
            </span>
          </li>
          <li className="text-xs text-[#C7C2B4]">
            Sade Sati:{" "}
            {result.doshas.sadeSati.present ? (
              <>
                active ({result.doshas.sadeSati.phase}) — approx{" "}
                {result.doshas.sadeSati.startYear}–{result.doshas.sadeSati.endYear}
              </>
            ) : (
              "not indicated at current transit"
            )}
          </li>
          <li className="text-xs text-[#C7C2B4]">
            Kaal Sarp:{" "}
            {result.doshas.kaalsarpDosha.present
              ? "flagged — consult full chart"
              : "not flagged"}
          </li>
        </ul>
      </div>
    </section>
  );
}
