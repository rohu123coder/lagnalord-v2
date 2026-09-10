"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import {
  compareNameToMulank,
  computeNameNumbers,
  mulankFromDob,
  type Compatibility,
} from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const COMPAT_COPY: Record<Compatibility, string> = {
  favorable:
    "This spelling’s Destiny digit sits in the same friendly triad as the Mulank (or matches it). On this page that is a supportive pairing — a screen, not a promise that the name will “work.”",
  neutral:
    "The two digits are not in the same triad and not on the short clash list. Many everyday spellings land here. How you use the name still matters more than the flag.",
  avoid:
    "This is one of the tense beginner-table pairs (for example 1 with 8). Treat it as a caution when you are already choosing between spellings — not as an order to drop a name you already live with.",
};

const FAQS = [
  {
    q: "What does “lucky name” mean on LagnaLord?",
    a: "The Chaldean Destiny digit of a proposed spelling, optionally compared with Mulank from the birth day. It is not a lottery score.",
  },
  {
    q: "How are favourable, neutral, and avoid assigned?",
    a: "Triads used here: 1-5-7, 2-4-8, 3-6-9. Same number or same triad = favourable. Clash pairs 1–8, 2–9, 4–5, 5–8 = avoid. Everything else is neutral. Other schools draw different maps.",
  },
  {
    q: "Is date of birth required?",
    a: "No. Without a date you still get the name number. The compatibility line appears only when Mulank can be read from the day.",
  },
  {
    q: "Should I change my name if it says avoid?",
    a: "Not from this page alone. Documents and family usage are social facts. If a spelling bothers you, take it to a full chart reading.",
  },
];

export function LuckyNameClient() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [destiny, setDestiny] = useState<number | null>(null);
  const [mulank, setMulank] = useState<number | null>(null);
  const [compat, setCompat] = useState<Compatibility | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const numbers = computeNameNumbers(name);
    if (!numbers.destiny) {
      setDestiny(null);
      setMulank(null);
      setCompat(null);
      setError("Enter a proposed name with letters.");
      return;
    }
    setError(null);
    setDestiny(numbers.destiny);
    if (dob) {
      const m = mulankFromDob(dob);
      setMulank(m || null);
      setCompat(m ? compareNameToMulank(numbers.destiny, m) : null);
    } else {
      setMulank(null);
      setCompat(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Name spelling check
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Lucky Name Numerology
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Try a spelling, see its Chaldean Destiny digit, and — if you add a birth date —
              a plain favourable, neutral, or avoid note against your Mulank.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Proposed name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name to test"
              className={fieldClass}
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#C7C2B4]">
              Date of birth (optional)
            </label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={`${fieldClass} [color-scheme:light]`} />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Check name
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {destiny ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Name number</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{destiny}</p>
              {mulank ? (
                <p className="mt-2 text-sm text-[#C7C2B4]">
                  Mulank from birth day: <span className="font-semibold text-[#F5F1E8]">{mulank}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#C7C2B4]">
                  Add a date of birth to compare this spelling with your Mulank.
                </p>
              )}
              {compat ? (
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    compat === "favorable"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : compat === "avoid"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-amber-500/40 bg-amber-500/10"
                  }`}
                >
                  <p
                    className={`text-sm font-bold capitalize ${
                      compat === "favorable"
                        ? "text-emerald-300"
                        : compat === "avoid"
                          ? "text-red-300"
                          : "text-amber-300"
                    }`}
                  >
                    {compat}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#C7C2B4]">
                    {COMPAT_COPY[compat]}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <AstrologerCTA
            heading="Choosing between two spellings?"
            text="This tool only compares two reduced digits. If a name change, baby name, or brand spelling actually matters, sit with an astrologer who can weigh timing and the rest of the chart."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">When a spelling gets a “luck” label</h2>
            <p>
              This page is for people already choosing between spellings — a baby name, a shop
              board, an English form of a Hindi name. The “luck” label is only whether the name’s
              Destiny digit sits comfortably next to Mulank. It is folk pairing, not a lab test.
            </p>
            <p>
              A favourable flag can still sit inside a hard year. An avoid flag can belong to
              someone thriving. Use it when you already have two options, not as a reason to
              abandon a name printed on every document.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: Rohit, born 15 May 1990</h2>
            <p>
              “Rohit” Destiny is 1 (see the Destiny calculator). Mulank from 1990-05-15 is 6.
              1 and 6 sit in different triads and are not a clash pair, so the screen is{" "}
              <span className="font-semibold text-amber-300">neutral</span>. Destiny 1 with Mulank 8
              would show avoid.
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
