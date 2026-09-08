"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { computeFlames, FLAMES_LABELS, type FlamesResult } from "@/lib/flames";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const WHEEL = [
  { letter: "F", hint: "Friends — the leftover count struck everything except F." },
  { letter: "L", hint: "Lovers — a school-notebook label, not a synastry verdict." },
  { letter: "A", hint: "Affectionate — the in-between slot on the six-letter wheel." },
  { letter: "M", hint: "Marriage — still just the letter M after a counting game." },
  { letter: "E", hint: "Enemies — the dramatic strike; ignore it outside the joke." },
  { letter: "S", hint: "Siblings — also used when every letter cancels (count 0)." },
];

const FAQS = [
  {
    q: "What does FLAMES stand for?",
    a: "Friends, Lovers, Affectionate, Marriage, Enemies, Siblings. The order is fixed. We do not skip letters or add extra categories.",
  },
  {
    q: "How are matching letters cancelled?",
    a: "One-for-one. Each letter in the first name removes one matching copy from the second if it exists. Duplicate letters only cancel as many times as they appear on both sides. Punctuation and spaces are ignored.",
  },
  {
    q: "Is this the same as the Love Calculator?",
    a: "Only the FLAMES half. This page has no Destiny digits and no percentage. If you want both games together, use the Love Calculator; if you want the notebook version only, stay here.",
  },
  {
    q: "Why did a full cancel become Siblings?",
    a: "When nothing is left to count, the wheel has no steps to take. We map that complete overlap to S — the last letter in FLAMES — rather than printing an empty result.",
  },
];

export function FlamesClient() {
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [result, setResult] = useState<FlamesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = computeFlames(nameA, nameB);
    if (!next) {
      setResult(null);
      setError("Enter two names that contain letters.");
      return;
    }
    setError(null);
    setResult(next);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Schoolyard classic
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              FLAMES Calculator
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Cross out letters that appear in both names, count what is left, and walk the
              F-L-A-M-E-S wheel until one category remains. The same game that filled the back of
              a class notebook — now without the smudged eraser.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">Name one</label>
            <input
              type="text"
              required
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="e.g. Amit"
              className={fieldClass}
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#C7C2B4]">Name two</label>
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
              Run FLAMES
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {result ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">FLAMES result</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{result.letter}</p>
              <p className="mt-2 text-xl font-bold text-[#C8AC80]">{result.label}</p>
              <p className="mt-3 text-sm leading-6 text-[#C7C2B4]">
                Leftover from name one:{" "}
                <span className="font-semibold text-[#F5F1E8]">{result.leftoverA || "none"}</span>
                . Leftover from name two:{" "}
                <span className="font-semibold text-[#F5F1E8]">{result.leftoverB || "none"}</span>.
                Combined count used on the wheel:{" "}
                <span className="font-semibold text-[#F5F1E8]">{result.remaining}</span>.
              </p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Want a personalized reading?"
            text="FLAMES is a counting rhyme. If you came here with a real relationship question, a verified astrologer can read both charts instead of walking six letters."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">The wheel, not the heart</h2>
            <p>
              FLAMES is a procedure. You do not interpret “energy” and you do not weight vowels.
              You cancel, you count, you strike letters off a six-item list. That is why two
              classrooms can disagree about a couple: they cancelled nicknames differently, or they
              counted from the next letter after a strike instead of restarting at F. This page
              documents one consistent walk so a result can be checked.
            </p>
            <p>
              The six labels are theatre. “Enemies” from a leftover count of five is not a feud.
              “Marriage” is not an invitation to book a hall. Keep the drama on the screen.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">How the leftover count is used</h2>
            <p>
              After one-for-one cancellation, let N be the number of letters still standing. Start
              on F. Count N steps around whatever letters are still on the wheel, remove the letter
              you land on, and continue from the next surviving letter. Repeat until one letter
              remains. That letter is the category.
            </p>
            <p>
              Example rhythm with N = 4: count F-L-A-M and strike M, then keep walking L-A-E-S-F…
              until the list collapses. We never reduce N itself — the same leftover count is reused
              every round.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: Amit and Neha</h2>
            <p>
              AMIT and NEHA share one A, so that pair cancels once. Leftovers are MIT + NEH, count{" "}
              <span className="font-semibold text-[#F5F1E8]">6</span>. Walking F-L-A-M-E-S with 6
              lands on <span className="font-semibold text-[#F5F1E8]">M — Marriage</span>. Compare
              that with “Amit” and “Suman”, where A and M both cancel: leftovers IT + SUN, count 5,
              and the same walk lands on <span className="font-semibold text-[#F5F1E8]">F — Friends</span>.
              One cancelled letter changes the whole wheel.
            </p>
          </article>

          <section>
            <h2 className="text-2xl font-bold text-[#F5F1E8]">The six letters</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {WHEEL.map((item) => (
                <article
                  key={item.letter}
                  className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4"
                >
                  <p className="font-semibold text-[#C8AC80]">
                    {item.letter} · {FLAMES_LABELS[item.letter as keyof typeof FLAMES_LABELS]}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">{item.hint}</p>
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
