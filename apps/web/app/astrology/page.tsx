import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";
import Link from "next/link";

import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: tenantPageTitle("Vedic Astrology Guide"),
  description:
    "Learn what Vedic astrology is, planetary significations, house meanings, and useful astrology tools.",
};

const planetSignificance = [
  ["Sun", "Authority, confidence, vitality, father, and reputation."],
  ["Moon", "Mind, emotions, mother, comfort, and intuition."],
  ["Mars", "Energy, courage, action, siblings, and assertiveness."],
  ["Mercury", "Communication, intellect, trade, analytics, and logic."],
  ["Jupiter", "Wisdom, dharma, children, growth, and guidance."],
  ["Venus", "Love, luxury, art, comfort, and relationships."],
  ["Saturn", "Discipline, karma, delays, hard work, and justice."],
  ["Rahu", "Ambition, foreign influence, unconventional growth."],
  ["Ketu", "Detachment, spirituality, research, and inner awakening."],
];

const houseMeanings = [
  "1st: Self, personality, health, and life direction",
  "2nd: Wealth, speech, family, and stored values",
  "3rd: Courage, communication, siblings, and efforts",
  "4th: Home, mother, property, and emotional security",
  "5th: Intelligence, children, romance, and creativity",
  "6th: Disease, debt, competition, and service",
  "7th: Marriage, partnerships, and public dealings",
  "8th: Transformation, longevity, occult, and inheritance",
  "9th: Fortune, dharma, higher learning, and gurus",
  "10th: Career, status, karma, and profession",
  "11th: Gains, networks, ambitions, and elder siblings",
  "12th: Expenses, liberation, foreign lands, and sleep",
];

export default function AstrologyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0F2240] to-[#0A1A2F]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#F5F1E8] sm:text-4xl">
          What Is Vedic Astrology?
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#C7C2B4] sm:text-base">
          Vedic astrology (Jyotish) is an ancient Indian system that interprets
          planetary positions at birth to understand karma, tendencies, strengths,
          and timing of events. It uses rashis, nakshatras, houses, dashas, and
          transits to provide practical guidance.
        </p>

        <section className="mt-8 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#F5F1E8]">
            Planets and Their Significance
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {planetSignificance.map(([planet, meaning]) => (
              <article key={planet} className="rounded-lg bg-[#0A1A2F] p-3">
                <p className="font-semibold text-[#E0C158]">{planet}</p>
                <p className="mt-1 text-sm text-[#C7C2B4]">{meaning}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#F5F1E8]">Houses and Meanings</h2>
          <ul className="mt-4 grid gap-2 text-sm text-[#C7C2B4] sm:grid-cols-2">
            {houseMeanings.map((house) => (
              <li key={house} className="rounded-lg bg-[#0A1A2F] px-3 py-2">
                {house}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#F5F1E8]">Explore Tools</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <Link className="rounded-full bg-[#0F2240] px-4 py-2 text-[#E0C158]" href="/kundli">
              Free Kundli
            </Link>
            <Link className="rounded-full bg-[#0F2240] px-4 py-2 text-[#E0C158]" href="/kundli/match">
              Kundli Matching
            </Link>
            <Link className="rounded-full bg-[#0F2240] px-4 py-2 text-[#E0C158]" href="/panchang">
              Today&apos;s Panchang
            </Link>
            <Link className="rounded-full bg-[#0F2240] px-4 py-2 text-[#E0C158]" href="/numerology">
              Numerology
            </Link>
            <Link className="rounded-full bg-[#0F2240] px-4 py-2 text-[#E0C158]" href="/remedies">
              Remedies
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
