"use client";

import type { KundliChartVariant } from "./KundliChart";
import type { KundliCalculateResponse } from "../types";

export function KundliShareBar({
  result,
  tenantName,
  chartVariant,
  onChartVariantChange,
}: {
  result: KundliCalculateResponse;
  tenantName: string;
  chartVariant: KundliChartVariant;
  onChartVariantChange: (variant: KundliChartVariant) => void;
}) {
  const onShare = async () => {
    const shareText = `My Kundli: Lagna ${result.basicInfo.ascendant.rashi}, Moon ${result.basicInfo.moonSign.rashi}, current Mahadasha ${result.dasha.mahadasha.planet}.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${tenantName} Kundli Report`,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // user cancelled share; no action required
      }
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      window.alert("Kundli summary copied to clipboard.");
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={onShare}
        className="rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2 text-sm font-medium text-[#09142a] transition hover:opacity-95"
      >
        Share Your Kundli
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border border-[#b18d4f]/40 bg-[#09142a] px-4 py-2 text-sm font-medium text-[#C8AC80] transition hover:bg-[#b18d4f]/10"
      >
        Print / Save as PDF
      </button>
      <div
        className="ml-auto flex w-fit gap-1 rounded-full border border-[#b18d4f]/30 bg-[#0E1C3B] p-1"
        role="group"
        aria-label="Chart style"
      >
        <button
          type="button"
          onClick={() => onChartVariantChange("dark")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            chartVariant === "dark"
              ? "bg-[#b18d4f] text-[#09142a]"
              : "text-[#C7C2B4]"
          }`}
        >
          Style 1
        </button>
        <button
          type="button"
          onClick={() => onChartVariantChange("light")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            chartVariant === "light"
              ? "bg-[#b18d4f] text-[#09142a]"
              : "text-[#C7C2B4]"
          }`}
        >
          Style 2
        </button>
      </div>
    </div>
  );
}
