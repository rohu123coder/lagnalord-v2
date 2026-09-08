"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MULANK_PLANETS, mulankFromDob } from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#C9A227]/20 bg-[#0A1A2F] px-3 py-2.5 text-[#F5F1E8] outline-none focus:ring-2 focus:border-[#C9A227] focus:ring-[#C9A227]";

const MULANK_TRAITS: Record<number, string> = {
  1: "Sun. A birth-day 1 often starts conversations and projects without waiting for a committee. The traditional note is initiative — useful when it does not harden into refusing help.",
  2: "Moon. Sensitivity and timing. This Mulank is described as noticing shifts in a room before anyone names them, which can be a gift in family life and a drain if rest is skipped.",
  3: "Jupiter. Growth, teaching, and a taste for the bigger picture. The folklore says boredom arrives when learning stops, not when the calendar is full.",
  4: "Rahu. Method and restlessness in the same breath. People with this digit are often happiest when a process exists — and itchy when the process never finishes.",
  5: "Mercury. Movement, speech, and switching tasks. Stillness without a puzzle is rarely restful for this Mulank in the old tables.",
  6: "Venus. Care, taste, and keeping people comfortable. The same quality can become over-responsibility if every conflict is absorbed instead of named.",
  7: "Ketu. An inward research streak. Quiet work and craft show up more often than loud ambition, though insight can arrive suddenly.",
  8: "Saturn. Time, duty, and results that arrive late. Shortcuts tend to feel untrustworthy; endurance is the usual story attached to 8.",
  9: "Mars. Heat and protection. Action comes quickly; the traditional caution is to put the effort down before it burns the person carrying it.",
};

const FAQS = [
  {
    q: "Is Mulank the same as a Western Life Path number?",
    a: "No. This page uses only the calendar day (the 15 in 15 May). A Life Path or Bhagyank usually adds the whole date. Same family of single-digit portraits, different inputs.",
  },
  {
    q: "I was born on the 11th, 22nd, or 29th. Do I keep a double digit?",
    a: "Not here. 11 becomes 2, 22 becomes 4, 29 becomes 2 after 2+9. We do not keep 11/22 as separate “master” labels on this calculator.",
  },
  {
    q: "Does my birth month or year change Mulank?",
    a: "Not on this screen. 15 May and 15 December share Mulank 6. Month and year belong to other numbers (including a full-date Bhagyank), not to this day-digit.",
  },
  {
    q: "If two people share a Mulank, will their lives look the same?",
    a: "No. Mulank is one lens. Name totals, the rest of the chart, health, and ordinary choices still write the biography. Read it as a sketch of first instincts.",
  },
];

export function MulankClient() {
  const [dob, setDob] = useState("");
  const [mulank, setMulank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = mulankFromDob(dob);
    if (!value) {
      setMulank(null);
      setError("Enter a valid date of birth.");
      return;
    }
    setError(null);
    setMulank(value);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0F2240] to-[#0A1A2F] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#C9A227]/20 bg-[#0F2240]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E0C158]">
              Numerology
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#E0C158] md:text-5xl">
              Mulank Calculator
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Your Mulank is the number hidden in the day you arrived. Enter a birth date to see
              the single digit and the planet traditionally linked with it.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Date of birth
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-[#2A7D7B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3A9D9B]"
            >
              Calculate Mulank
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {mulank ? (
            <section className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#E0C158]">Your Mulank</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{mulank}</p>
              <p className="mt-2 text-sm text-[#C7C2B4]">
                Ruling planet:{" "}
                <span className="font-semibold text-[#F5F1E8]">{MULANK_PLANETS[mulank]}</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-[#C7C2B4]">{MULANK_TRAITS[mulank]}</p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Want this number read with your full chart?"
            text="Mulank is only the birth-day digit. An astrologer can set it beside your lagna, dasha, and the question you walked in with."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">What this number is used for</h2>
            <p>
              Mulank is the digit hiding in the day you were born. It is not your name, not the
              hour, and not the year printed on a certificate. In the tables used on LagnaLord it
              is treated as a temperament hint: how you tend to begin, how you recover, and which
              planet-label (Sun through Mars) the old lists pin to that day-digit.
            </p>
            <p>
              Two people with the same Mulank can still live opposite lives. The number is closer
              to a first instinct than to a career forecast. Use it as a conversation starter with
              the rest of a chart, not as a rule that forbids marriage, work, or travel.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: 15 May 1990</h2>
            <p>
              Date <span className="font-semibold text-[#F5F1E8]">1990-05-15</span>. Ignore the year
              and the month. Keep the day 15. Add 1 + 5. The sum is 6, so Mulank is 6, listed under
              Venus. A birth on the 4th is already 4. A birth on the 28th is 2 + 8 = 10, then
              1 + 0 = 1.
            </p>
            <p>
              Reduction always stops at 1–9 on this page. We do not compute Bhagyank (the sum of
              every digit in the full date) here; that is a separate addition if you want the
              whole-date portrait.
            </p>
          </article>

          <section>
            <h2 className="text-2xl font-bold text-[#F5F1E8]">The nine Mulank portraits</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(MULANK_TRAITS).map(([num, text]) => (
                <article
                  key={num}
                  className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-4"
                >
                  <p className="font-semibold text-[#E0C158]">
                    Mulank {num} · {MULANK_PLANETS[Number(num)]}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#F5F1E8]">FAQ</h2>
            <div className="mt-4 space-y-3">
              {FAQS.map((item) => (
                <article
                  key={item.q}
                  className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-4"
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
