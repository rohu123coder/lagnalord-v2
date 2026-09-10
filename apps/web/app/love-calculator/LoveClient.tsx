"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { computeFlames, type FlamesResult } from "@/lib/flames";
import {
  computeNameNumbers,
  lovePercentageBreakdown,
  type LoveScoreBreakdown,
} from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const CATEGORY_BLURB: Record<string, string> = {
  Friends:
    "The leftover-letter walk landed on Friends. In the playground version that means easy company — not that romance is forbidden, and not that it is promised.",
  Lovers:
    "Lovers is the FLAMES letter this pair produced. Treat it as a party trick: two spellings, one leftover count, one letter on a six-step wheel.",
  Affectionate:
    "Affectionate is the warm-but-undefined slot on the wheel. It is a category name, not a forecast of how anyone will actually behave.",
  Marriage:
    "Marriage is just the M in FLAMES. It does not schedule a wedding, match families, or replace a kundli comparison.",
  Enemies:
    "Enemies is the sharpest FLAMES label. Plenty of kind people still draw it because their leftover count happened to strike E. Laugh, then ignore it.",
  Siblings:
    "Siblings (or a full letter-cancel) is the “same household energy” joke on the wheel. It is not a blood-relation test.",
};

const FAQS = [
  {
    q: "Is this a real compatibility reading?",
    a: "No. It is two party games on one screen: letter cancellation (FLAMES) and a published arithmetic mix of two Destiny digits. Neither one is a horoscope.",
  },
  {
    q: "Why show both a category and a percentage?",
    a: "They answer different dares. FLAMES only cares which letters survive cancellation. The percentage never looks at leftover letters — it only uses each name’s Chaldean Destiny digit. You can get “Enemies” and a high percent on the same pair.",
  },
  {
    q: "Do spaces, initials, or surnames change the result?",
    a: "Yes. We keep A–Z only. “Rohit” and “Rohit Sharma” are different Destiny totals and a different leftover count. Use the spellings you actually want to tease.",
  },
  {
    q: "Can I use this to decide a relationship?",
    a: "Please don’t. If a real question is sitting under the joke — timing, family, a chart — talk to an astrologer. This page is for sharing a screenshot, not for breaking up.",
  },
];

type Result = {
  flames: FlamesResult;
  love: LoveScoreBreakdown;
  nameA: string;
  nameB: string;
};

export function LoveClient() {
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const flames = computeFlames(nameA, nameB);
    const destA = computeNameNumbers(nameA).destiny;
    const destB = computeNameNumbers(nameB).destiny;
    const love = lovePercentageBreakdown(destA, destB);
    if (!flames || !love) {
      setResult(null);
      setError("Enter two names that contain letters.");
      return;
    }
    setError(null);
    setResult({ flames, love, nameA: nameA.trim(), nameB: nameB.trim() });
  }

  return (
    <div className="min-h-screen text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Entertainment
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Love Calculator
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Two names in, two jokes out: a FLAMES category from leftover letters, and a Love
              Percentage built from each name’s Destiny digit. Fun to share. Not a verdict.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">Your name</label>
            <input
              type="text"
              required
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="First name"
              className={fieldClass}
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#C7C2B4]">
              Their name
            </label>
            <input
              type="text"
              required
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="Second name"
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Calculate love score
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {result ? (
            <section className="space-y-4 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Love Percentage</p>
              <p className="text-5xl font-extrabold text-[#F5F1E8]">{result.love.total}%</p>
              <p className="text-sm text-[#C7C2B4]">
                Destiny {result.love.destinyA} ({result.nameA}) × Destiny {result.love.destinyB} (
                {result.nameB})
              </p>
              <p className="text-lg font-bold text-[#C8AC80]">{result.flames.label}</p>
              <p className="text-sm leading-6 text-[#C7C2B4]">
                {CATEGORY_BLURB[result.flames.label]} Leftover letters:{" "}
                <span className="font-semibold text-[#F5F1E8]">
                  {result.flames.leftoverA || "—"} / {result.flames.leftoverB || "—"}
                </span>{" "}
                (count {result.flames.remaining}).
              </p>
              <ul className="space-y-1 text-sm text-[#C7C2B4]">
                <li>Start: 100 − 9 × gap {result.love.gap} = {result.love.base}</li>
                {result.love.sameBonus ? <li>Same Destiny bonus: +{result.love.sameBonus}</li> : null}
                {result.love.sumBonus ? (
                  <li>Sum 9 or 10 bonus: +{result.love.sumBonus}</li>
                ) : null}
                {result.love.triadBonus ? (
                  <li>Friendly-triad bonus: +{result.love.triadBonus}</li>
                ) : null}
                {result.love.clashPenalty ? (
                  <li>Clash-pair penalty: −{result.love.clashPenalty}</li>
                ) : null}
                <li>Then clamp between 18 and 99.</li>
              </ul>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Want a personalized reading?"
            text="A percentage from two name digits is a dare, not a chart. If the question is actually about timing, family, or a relationship, sit with an astrologer who can read both kundlis."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">A dare, not a diagnosis</h2>
            <p>
              Love calculators live in the same drawer as paper fortune-tellers. You type two
              spellings, the screen answers with a label and a number, and the fun is watching a
              friend react — not treating the output as fate. Nothing here looks at birth time,
              lagna, or dasha. If those matter, this is the wrong tool.
            </p>
            <p>
              We still show the arithmetic in the result card so the percentage cannot hide behind
              “vibes.” You can disagree with the bonuses; you should not have to guess how the
              score was built.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">How the Love Percentage is built</h2>
            <p>
              Each name is reduced to a Chaldean Destiny digit (the same map as the Destiny Number
              calculator: A/I/J/Q/Y = 1 … F/P = 8, then digit-sum to 1–9). Call those digits A and
              B.
            </p>
            <p>
              Start at 100. Subtract 9 for every step of gap between A and B. If the digits match,
              add 8. If they add to 9 or 10, add 10. If they sit in a friendly triad (1-5-7, 2-4-8,
              3-6-9) and are not equal, add 6. If they are a clash pair (1–8, 2–9, 4–5, 5–8),
              subtract 12. Finally clamp the score between 18 and 99 so a wide gap still prints a
              number instead of a scolding zero.
            </p>
            <p>
              FLAMES on this page is independent: cancel matching letters one-for-one, count what
              remains, and walk F-L-A-M-E-S until one letter is left. The standalone FLAMES
              calculator uses that same walk if you want only the category.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: Rohit and Priya</h2>
            <p>
              “Rohit” Destiny is 1 (R2+O7+H5+I1+T4 = 19 → 1). “Priya” is 4 (P8+R2+I1+Y1+A1 = 13 →
              4). Gap 3 → base 100 − 27 = 73. They are not equal, do not sum to 9 or 10, and 1 vs 4
              is a neutral pairing — no triad bonus, no clash penalty. Clamped result:{" "}
              <span className="font-semibold text-[#F5F1E8]">73%</span>.
            </p>
            <p>
              FLAMES on the same spellings is independent: R and I cancel, leftovers OHT + PYA,
              count 6, which walks to <span className="font-semibold text-[#F5F1E8]">M — Marriage</span>.
              So this pair can screenshot 73% and Marriage together — two games, not one proof.
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
