"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { computeNameNumbers } from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const DESTINY_MEANINGS: Record<number, string> = {
  1: "Expression 1 is read as a public signature of standing first — not a command to ignore others, but a name that is often remembered for taking a position.",
  2: "Expression 2 is associated with pairing and tact. The spelling is said to sit more easily in work that needs timing rather than volume.",
  3: "Expression 3 is linked with language and display. The name is often described as easier to recall for how something is said, not only for what is produced.",
  4: "Expression 4 is the scaffold: records, method, and finishing after the room has lost interest.",
  5: "Expression 5 prefers options. Traditional notes tie it to changing cities or briefs more easily than to one locked title.",
  6: "Expression 6 is the household-and-harmony total in name work. It can feel heavy if rest is never scheduled.",
  7: "Expression 7 turns inward: study and craft. Public work is possible; the fuel in the old lists is usually solitude.",
  8: "Expression 8 is the ledger number — authority and long games. It is not a salary forecast.",
  9: "Expression 9 widens the circle. The spelling is linked with closings that help more than the immediate family.",
};

const FAQS = [
  {
    q: "Why not Pythagorean A=1 to Z=26?",
    a: "This calculator uses the Chaldean letter chart (values 1–8, no 9 on letters) so Destiny, lucky-name, and related tools on LagnaLord share one alphabet. Pythagorean arithmetic is a different system.",
  },
  {
    q: "Do spaces and punctuation add anything?",
    a: "No. Only A–Z get a value. “R. Sharma” scores R, S, H, A, R, M, A. Digits in a name are ignored here.",
  },
  {
    q: "Legal name or the name I actually use?",
    a: "Use the spelling you live under — email, introductions, visiting cards. If two spellings are in daily use, run both and notice which one you answer to.",
  },
  {
    q: "How is Soul Urge different from Destiny?",
    a: "Destiny sums every letter. Soul Urge / Heart’s Desire sums vowels A E I O U only. Personality sums consonants. All three print in the result so the headline digit is not the only view.",
  },
];

export function DestinyClient() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<ReturnType<typeof computeNameNumbers> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const numbers = computeNameNumbers(name);
    if (!numbers.destiny) {
      setResult(null);
      setError("Enter a name that contains letters.");
      return;
    }
    setError(null);
    setResult(numbers);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Chaldean numerology
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Destiny Number Calculator
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              The Destiny or Expression number is the Chaldean total of every letter in a name,
              reduced to one digit. Type the spelling you actually use.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Full name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohit"
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Calculate Destiny Number
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {result ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Destiny / Expression</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{result.destiny}</p>
              <p className="mt-2 text-xs text-[#C7C2B4]">
                Letter total {result.destinyRaw} → reduced to {result.destiny}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#09142a] p-3">
                  <p className="text-xs font-semibold text-[#C8AC80]">Soul Urge (vowels)</p>
                  <p className="text-2xl font-bold text-[#F5F1E8]">{result.soulUrge}</p>
                </div>
                <div className="rounded-xl bg-[#09142a] p-3">
                  <p className="text-xs font-semibold text-[#C8AC80]">Personality (consonants)</p>
                  <p className="text-2xl font-bold text-[#F5F1E8]">{result.personality}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#C7C2B4]">
                {DESTINY_MEANINGS[result.destiny]}
              </p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Does this name sit well with your chart?"
            text="A Destiny digit is name-arithmetic. An astrologer can tell you whether that spelling cooperates with your dasha and the work you are actually trying to do."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">What Destiny / Expression measures</h2>
            <p>
              Mulank comes from the birthday. Destiny comes from letters. The Expression number is
              the Chaldean total of the spelling you actually use, reduced to 1–9. Practitioners
              treat it as the “public job description” of a name — an invitation the spelling
              repeats, not a court order.
            </p>
            <p>
              Drop an H, add a surname, or switch to a nickname and the total moves. That is why
              the form asks for the living name rather than a document you never speak.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: Rohit</h2>
            <p>
              Letters: R=2, O=7, H=5, I=1, T=4. Sum 2+7+5+1+4 = 19. Reduce 1+9=10, then 1+0=1.
              Destiny is 1. Vowels O+I = 8 (Soul Urge). Consonants R+H+T = 11 → 2 (Personality).
            </p>
          </article>

          <section>
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Meanings for Destiny 1–9</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(DESTINY_MEANINGS).map(([num, text]) => (
                <article
                  key={num}
                  className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4"
                >
                  <p className="font-semibold text-[#C8AC80]">Destiny {num}</p>
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
