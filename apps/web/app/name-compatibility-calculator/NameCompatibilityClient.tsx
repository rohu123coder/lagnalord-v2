"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import {
  compareDestinyNumbers,
  computeNameNumbers,
  type Compatibility,
} from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-3 py-2.5 text-[#F5F1E8] outline-none focus:ring-2 focus:border-[#b18d4f] focus:ring-[#b18d4f]";

const COMPAT_COPY: Record<Compatibility, string> = {
  favorable:
    "These two Destiny digits sit in the same friendly triad (1-5-7, 2-4-8, or 3-6-9), or they match. In the beginner tables that is a supportive pairing of name-numbers — still only two reduced digits, not two lives.",
  neutral:
    "The digits are not in the same triad and not on the short clash list. Many everyday name pairs land here. The grouping is a sorting hat, not a forecast of how the relationship will go.",
  avoid:
    "This is one of the tense pairs on the same table used for lucky names (1–8, 2–9, 4–5, 5–8). Treat it as a caution when you are already comparing spellings or two people on paper — not as an order to end a bond.",
};

const FAQS = [
  {
    q: "Is this the same test as Lucky Name Numerology?",
    a: "Same grouping logic: triads 1-5-7, 2-4-8, 3-6-9, clash pairs 1–8, 2–9, 4–5, 5–8. Lucky Name compares a spelling with Mulank (the birth-day digit). This page compares two Destiny numbers from two names. No date of birth is used here.",
  },
  {
    q: "Why Chaldean and not Pythagorean?",
    a: "LagnaLord’s name tools share one letter map (no 9 on letters). Mixing maps on neighbouring pages would make the same spelling disagree with itself.",
  },
  {
    q: "Should we change a name if it says avoid?",
    a: "Not from this screen. Documents, family usage, and the rest of a chart outweigh two reduced digits. Use the flag when you already have two spellings or two people to compare, then take the serious case to a reading.",
  },
  {
    q: "Do we include surnames?",
    a: "Only if you want that spelling in the total. “Rohit” and “Rohit Sharma” produce different Destiny digits. Be consistent for both people.",
  },
];

type Result = {
  nameA: string;
  nameB: string;
  destinyA: number;
  destinyB: number;
  rawA: number;
  rawB: number;
  compat: Compatibility;
};

export function NameCompatibilityClient() {
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const a = computeNameNumbers(nameA);
    const b = computeNameNumbers(nameB);
    if (!a.destiny || !b.destiny) {
      setResult(null);
      setError("Enter two names that contain letters.");
      return;
    }
    setError(null);
    setResult({
      nameA: nameA.trim(),
      nameB: nameB.trim(),
      destinyA: a.destiny,
      destinyB: b.destiny,
      rawA: a.destinyRaw,
      rawB: b.destinyRaw,
      compat: compareDestinyNumbers(a.destiny, b.destiny),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Chaldean pairing
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Name Compatibility
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Reduce each name to a Destiny digit, then sort the pair with the same favourable /
              neutral / avoid groups used for lucky names. A serious-toned sketch — still not a
              substitute for two full charts.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">First name</label>
            <input
              type="text"
              required
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="e.g. Rohit"
              className={fieldClass}
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#C7C2B4]">
              Second name
            </label>
            <input
              type="text"
              required
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="e.g. Neha"
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-[#b18d4f] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#8E713F] hover:text-white"
            >
              Compare Destiny numbers
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {result ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Destiny pairing</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <p className="text-sm text-[#C7C2B4]">
                  {result.nameA}:{" "}
                  <span className="text-3xl font-extrabold text-[#F5F1E8]">{result.destinyA}</span>
                  <span className="mt-1 block text-xs">raw total {result.rawA}</span>
                </p>
                <p className="text-sm text-[#C7C2B4]">
                  {result.nameB}:{" "}
                  <span className="text-3xl font-extrabold text-[#F5F1E8]">{result.destinyB}</span>
                  <span className="mt-1 block text-xs">raw total {result.rawB}</span>
                </p>
              </div>
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  result.compat === "favorable"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : result.compat === "avoid"
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                <p
                  className={`text-sm font-bold capitalize ${
                    result.compat === "favorable"
                      ? "text-emerald-300"
                      : result.compat === "avoid"
                        ? "text-red-300"
                        : "text-amber-300"
                  }`}
                >
                  {result.compat}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">
                  {COMPAT_COPY[result.compat]}
                </p>
              </div>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Want a personalized reading?"
            text="Two Destiny digits are a thin slice of name numerology. An astrologer can set them beside lagna, dasha, and the actual question — marriage, business partners, a baby name — instead of stopping at a traffic-light label."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">What this pairing is for</h2>
            <p>
              People bring two spellings to a numerologist when a relationship is already real:
              spouses comparing how their names sit, founders testing a brand against a personal
              name, parents holding two baby-name shortlists. This page answers only the first
              filter those tables offer — do the reduced Destiny digits belong together, sit
              apart, or clash on the short list.
            </p>
            <p>
              It is more sober than FLAMES and more specific than a love percentage. It is also
              narrower than a kundli match. If the stakes are a wedding date or a legal name
              change, stop after the flag and continue with a full reading.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">The grouping, unchanged</h2>
            <p>
              Friendly triads: 1-5-7 (Sun / Mercury / Ketu flavour in the Mulank planet list),
              2-4-8, and 3-6-9. Same digit or same triad → favourable. Clash pairs 1 with 8, 2 with
              9, 4 with 5, 5 with 8 → avoid. Every other combination is neutral. Other schools
              publish different maps; we keep this one so Lucky Name and this page cannot
              contradict each other.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: Rohit and Neha</h2>
            <p>
              “Rohit” Destiny is 1. “Neha” is N5+E5+H5+A1 = 16 → 7. 1 and 7 share the 1-5-7 triad,
              so the screen is{" "}
              <span className="font-semibold text-emerald-300">favourable</span>. Swap the second
              name for a Destiny 8 spelling and the same first name would show avoid. “Rohit” with
              “Priya” (Destiny 4) is neutral — different triads, not a clash pair.
            </p>
          </article>

          <section>
            <h2 className="text-2xl font-bold text-[#F5F1E8]">FAQ</h2>
            <div className="mt-4 space-y-3">
              {FAQS.map((item) => (
                <article
                  key={item.q}
                  className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4"
                >
                  <h3 className="font-semibold text-[#F5F1E8]">{item.q}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">{item.a}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
