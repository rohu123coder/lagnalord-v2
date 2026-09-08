"use client";

import { type FormEvent, useMemo, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { computeAge, todayIsoDate, type AgeResult } from "@/lib/age";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const FAQS = [
  {
    q: "Why does an astrology reading care about exact age?",
    a: "Dasha balance, annual charts, and “how old were you when…” questions all start from a civil date, not from a rounded year. A sloppy age (36 instead of 36 years 3 months 24 days) is enough to mis-place a conversation even when the birth time is already correct.",
  },
  {
    q: "Does this use birth time or time zone?",
    a: "No. It is calendar math on two YYYY-MM-DD values. For a kundli you still need place and time; this page only answers how old the native is on a chosen civil day.",
  },
  {
    q: "What if I was born on 29 February?",
    a: "In a non-leap year we treat the birthday as 28 February for the countdown. Age in years still ticks up on that day. Leap years keep 29 February as the anniversary.",
  },
  {
    q: "Can I calculate age on a past date?",
    a: "Yes. Set “as of” to any day on or after the date of birth — a wedding, a dasha start, a parent’s death anniversary — to see how old the native was then.",
  },
];

export function AgeClient() {
  const today = useMemo(() => todayIsoDate(), []);
  const [dob, setDob] = useState("");
  const [asOf, setAsOf] = useState(today);
  const [age, setAge] = useState<AgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const computed = computeAge(dob, asOf || today);
    if (!computed.ok) {
      setAge(null);
      setError(
        computed.reason === "future"
          ? "The “as of” date is before the date of birth."
          : "Enter a valid date of birth (and as-of date)."
      );
      return;
    }
    setError(null);
    setAge(computed.age);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Civil age for charts
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Age Calculator
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Years, months, and days on a chosen date, plus days lived and the wait until the
              next birthday. The same civil age an astrologer should confirm before talking dasha
              or an annual reading.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Date of birth
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={`${fieldClass} [color-scheme:light]`}
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#C7C2B4]">
              As of date (optional, defaults to today)
            </label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className={`${fieldClass} [color-scheme:light]`}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-[#b18d4f] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#8E713F] hover:text-white"
            >
              Calculate age
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {age ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Exact age</p>
              <p className="mt-1 text-3xl font-extrabold text-[#F5F1E8] md:text-4xl">
                {age.years} years, {age.months} months, {age.days} days
              </p>
              <p className="mt-3 text-sm text-[#C7C2B4]">
                Total days lived:{" "}
                <span className="font-semibold text-[#F5F1E8]">{age.totalDays.toLocaleString()}</span>
              </p>
              <p className="mt-2 text-sm text-[#C7C2B4]">
                {age.isBirthday ? (
                  <>Today (the as-of date) is the birthday.</>
                ) : (
                  <>
                    Next birthday {age.nextBirthdayIso}:{" "}
                    <span className="font-semibold text-[#F5F1E8]">
                      {age.nextBirthdayDays} day{age.nextBirthdayDays === 1 ? "" : "s"}
                    </span>{" "}
                    away.
                  </>
                )}
              </p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Want a personalized reading?"
            text="Age is the easy half. A dasha reading still needs birth time, place, and the question you actually walked in with. Chat with an astrologer once those are in hand."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Why horoscopes start with a date</h2>
            <p>
              A kundli is cast from a moment. Age is what you do with that moment later: “this
              dasha began when you were twenty-three,” “the solar return is next week,” “Saturn
              return is a 29-and-a-bit conversation, not a 30th-birthday party.” Rounding to
              completed years throws those sentences off even when the lagna is already correct.
            </p>
            <p>
              This calculator does not compute dasha. It only makes the civil interval honest —
              years, leftover months, leftover days — so the next sentence in a reading has a
              clean number underneath it.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">How the split is counted</h2>
            <p>
              We subtract two calendar dates, borrowing days from the previous month when the
              as-of day is smaller than the birth day, then borrowing 12 months from the year
              column if needed. Total days lived is the difference of those two civil dates in
              UTC midnight units, so daylight-saving shifts cannot steal or gift a day. The next
              birthday is the next anniversary on or after the as-of date (28 February for 29
              February natives in common years).
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: 15 May 1990 as of 8 September 2026</h2>
            <p>
              From 1990-05-15 to 2026-09-08 the civil split is{" "}
              <span className="font-semibold text-[#F5F1E8]">36 years, 3 months, 24 days</span>.
              Total days lived: <span className="font-semibold text-[#F5F1E8]">13,265</span>.
              15 May 2026 has already passed, so the next birthday is 2027-05-15 —{" "}
              <span className="font-semibold text-[#F5F1E8]">249 days</span> after 8 September.
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
