"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { reduceToSingleDigit, sumDigitsInString } from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-3 py-2.5 text-[#F5F1E8] outline-none focus:ring-2 focus:border-[#b18d4f] focus:ring-[#b18d4f]";

const MOBILE_MEANINGS: Record<number, string> = {
  1: "A 1-total is often described as a number that starts threads. Informal only — many quiet people carry a 1 handset.",
  2: "A 2-total is given a pairing flavour in mobile folklore: follow-ups more than broadcasts.",
  3: "Three is linked with talk and sharing. It is a motif, not a diagnosis of how you actually chat.",
  4: "Four totals get a workmanlike reputation: reminders and calls with a purpose.",
  5: "Five is the “more pings, more plans” rumour. It can also just be digits that add to five.",
  6: "Six is painted as the family SIM — school groups and household logistics.",
  7: "Seven is the privacy stereotype in these write-ups. Plenty of 7 numbers still live in group chats.",
  8: "Eight is tied to deals and deadlines in the same folklore. It does not predict income.",
  9: "Nine is given a closing, helping tone. Keep the reading light.",
};

const FAQS = [
  {
    q: "Why exactly ten digits?",
    a: "Indian mobiles are ten digits after the country code. We strip +91 and spaces, then require ten numerals so totals are comparable. Landlines are out of scope.",
  },
  {
    q: "Does a “good” total make the phone lucky?",
    a: "No. This is a popular overlay on a number you already use. Changing a printed number for a digit is rarely worth the chaos.",
  },
  {
    q: "Should I type 91 as well?",
    a: "No. Enter the ten-digit subscriber number only. The country code would change the sum.",
  },
  {
    q: "What if digits repeat?",
    a: "They still add normally. 9999999999 sums to 90 → 9. Repeats do not get extra mystical weight beyond what they already add.",
  },
];

export function MobileNumberClient() {
  const [mobile, setMobile] = useState("");
  const [digit, setDigit] = useState<number | null>(null);
  const [raw, setRaw] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) {
      setDigit(null);
      setRaw(null);
      setError("Enter a 10-digit mobile number.");
      return;
    }
    const total = sumDigitsInString(digits);
    setError(null);
    setRaw(total);
    setDigit(reduceToSingleDigit(total));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Informal numerology
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Mobile Number Numerology
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Add the ten digits, reduce to one number, and read a short, non-definitive note.
              This is folk arithmetic, not a network quality test.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              10-digit mobile number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="9876543210"
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-[#b18d4f] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#8E713F] hover:text-white"
            >
              Calculate number
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {digit ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Reduced digit</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{digit}</p>
              <p className="mt-2 text-xs text-[#C7C2B4]">Digit sum {raw} → {digit}</p>
              <p className="mt-4 text-sm leading-6 text-[#C7C2B4]">{MOBILE_MEANINGS[digit]}</p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Is it worth changing a number?"
            text="Usually the hassle outweighs the folklore. If you are already switching SIMs for practical reasons, an astrologer can talk timing — this page will not pick a carrier for you."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Keep this reading light</h2>
            <p>
              A mobile number is repeated on UPI, WhatsApp, and missed-call lists. Some people
              therefore paste the same 1–9 character sketches used for birth numbers onto the
              SIM. Telecom engineering has nothing to say about that overlay.
            </p>
            <p>
              Treat the result like a newspaper sun-sign paragraph: flavour, not a forecast of
              who will call, and not medical or financial advice.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: 9876543210</h2>
            <p>
              9+8+7+6+5+4+3+2+1+0 = 45, then 4+5 = 9. The reduced digit is 9. 9000000001 sums to
              10, then 1.
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
