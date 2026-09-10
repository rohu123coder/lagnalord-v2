"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { reduceToSingleDigit, sumDigitsInString } from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const VEHICLE_MEANINGS: Record<number, string> = {
  1: "A 1-total is talked about as an independent plate. Plenty of ordinary family cars still reduce to 1.",
  2: "Two is given a shared-ride flavour in garage folklore. It is not traffic science.",
  3: "Three plates are linked with short, visible trips — a motif, not a mileage forecast.",
  4: "Four is the workhorse story: school runs and maintenance done on time.",
  5: "Five is the highway rumour. It does not excuse speeding.",
  6: "Six is painted as the household vehicle — festivals and shopping bags.",
  7: "Seven is the quieter-road stereotype. Owners with this total still sit in jams.",
  8: "Eight is associated with load and long ownership. It is not a luxury promise.",
  9: "Nine is given a completing, protective tone in plate talk. Keep it symbolic.",
};

const FAQS = [
  {
    q: "Which characters count?",
    a: "Only digits 0–9. State codes and series letters are ignored. DL01AB1234 uses 0,1,1,2,3,4. Letters are not given Chaldean values on this page.",
  },
  {
    q: "BH plates or auction numbers?",
    a: "The method does not change. Extract digits, add, reduce. Price paid at auction does not alter the arithmetic.",
  },
  {
    q: "Should the plate match my Mulank?",
    a: "Some people try. RTO stock and budget usually decide first. If you already have a plate, this is curiosity, not a reason to re-register.",
  },
  {
    q: "Is this vastu of the garage?",
    a: "No. Digit-sum of a registration is a separate popular habit from parking direction.",
  },
];

export function LuckyVehicleClient() {
  const [reg, setReg] = useState("");
  const [digit, setDigit] = useState<number | null>(null);
  const [raw, setRaw] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = reg.replace(/\D/g, "");
    if (digits.length < 2) {
      setDigit(null);
      setRaw(null);
      setError("Enter a registration that contains digits.");
      return;
    }
    const total = sumDigitsInString(digits);
    const reduced = reduceToSingleDigit(total);
    if (!reduced) {
      setError("Could not read a number from that registration.");
      setDigit(null);
      setRaw(null);
      return;
    }
    setError(null);
    setRaw(total);
    setDigit(reduced);
  }

  return (
    <div className="min-h-screen text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Registration digits
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Lucky Vehicle Number
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Paste a registration mark. We add only the numerals and reduce them to one digit.
              Letters stay on the plate; they are not scored here.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Vehicle registration
            </label>
            <input
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="DL01AB1234"
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Calculate plate number
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {digit ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Reduced digit</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{digit}</p>
              <p className="mt-2 text-xs text-[#C7C2B4]">
                Digits in “{reg.replace(/\s/g, "")}” sum to {raw} → {digit}
              </p>
              <p className="mt-4 text-sm leading-6 text-[#C7C2B4]">{VEHICLE_MEANINGS[digit]}</p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Buying or transferring a vehicle?"
            text="Plate numerology is a side habit. Muhurat for purchase, loan timing, and whether a journey is actually wise belong in a consultation, not in a digit-sum box."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Digits only, not the state code</h2>
            <p>
              A plate is public and photographed at tolls, so some owners ask for “their” digit
              the way they ask about a mobile number. This calculator never scores DL, MH, or KA
              with Chaldean letter values. Only numerals are added — the way most garage-level
              plate talk actually works.
            </p>
            <p>
              Brakes, insurance, and sleep before a long drive still matter more than whether the
              plate reduces to 4 or 8.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: DL01AB1234</h2>
            <p>
              Digits 0+1+1+2+3+4 = 11, then 1+1 = 2. MH12DE9999 uses 1+2+9+9+9+9 = 39 → 12 → 3.
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
