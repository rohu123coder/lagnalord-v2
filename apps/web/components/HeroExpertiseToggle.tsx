"use client";

import { useState } from "react";

export function HeroExpertiseToggle() {
  const [expertiseMode, setExpertiseMode] = useState<"astro" | "vastu">("astro");

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16">
      <div className="mx-auto mb-8 flex w-fit gap-1 rounded-full border border-[#b18d4f]/30 bg-[#0E1C3B] p-1">
        <button
          type="button"
          onClick={() => setExpertiseMode("astro")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            expertiseMode === "astro"
              ? "bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] text-[#09142a]"
              : "text-[#C7C2B4]"
          }`}
        >
          Astrology
        </button>
        <button
          type="button"
          onClick={() => setExpertiseMode("vastu")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            expertiseMode === "vastu"
              ? "bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] text-[#09142a]"
              : "text-[#C7C2B4]"
          }`}
        >
          Vastu Shastra
        </button>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">
          Premium Astrology &amp; Vastu Platform
        </p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
          {expertiseMode === "astro" ? (
            <>Decode your destiny.<br /><span className="bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] bg-clip-text text-transparent">Master your space.</span></>
          ) : (
            <>Master your space.<br /><span className="bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] bg-clip-text text-transparent">Decode your destiny.</span></>
          )}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[#C7C2B4]">
          Explore horoscope, get your free Kundli, match compatibility, and consult verified astrologers with modern tools in one place.
        </p>
      </div>
    </div>
  );
}
