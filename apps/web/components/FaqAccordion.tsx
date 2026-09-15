"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const homepageFaqs = [
  {
    q: "What is a Kundli on LagnaLord?",
    a: "A Kundli is a map of the sky at your birth, drawn in the sidereal zodiac this app uses. You enter date, time, and place; Swiss Ephemeris supplies the longitudes. Houses, rashis, and dashas are read from that map — not from a one-size essay.",
  },
  {
    q: "Is my birth data private?",
    a: "Birth details are stored so you can reopen a chart and so an astrologer can see the same numbers you do. They are not published on a public wall. Treat any share link you generate as something you control.",
  },
  {
    q: "How are AI astrologers different from live ones?",
    a: "AI personas answer from the same chart JSON, quickly, in character. Live astrologers can ask follow-ups, sit with family context, and disagree with a first reading. Use AI for a sketch; use a human when the question is a decision.",
  },
  {
    q: "What if I do not know my birth time?",
    a: "You can still cast a chart with a noted approximation. Ascendant and house cusps will be less trustworthy than the moon and planets. Say so in chat — a good reading will shrink its claims instead of pretending the lagna is certain.",
  },
  {
    q: "How does the wallet work?",
    a: "You recharge, then pay the per-minute rate printed on a live astrologer’s card, or the per-message rate shown on an AI persona. Unused balance stays in the wallet. There is no hidden “session fee” on top of that displayed rate.",
  },
  {
    q: "Can I trust the horoscope on this site?",
    a: "Rashi notes are sky-weather, written to be read in a minute. They are not a substitute for your Kundli, and they cannot see your hour of birth. If a line feels wrong, prefer the chart over the daily blurb.",
  },
  {
    q: "What makes LagnaLord different?",
    a: "One desk for Kundli, matching, panchang, remedies, numerology, AI chat, and verified live sessions — with calculations from the same ephemeris instead of a collage of unrelated widgets. The rest is still your judgment.",
  },
] as const;

export function FaqAccordion() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="border-b border-[#b18d4f]/20 bg-[#09142a] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C8AC80]">First visit</p>
        <h2 className="mt-3 text-3xl font-extrabold text-[#F5F1E8] sm:text-5xl">
          New here? Start with this
        </h2>
        <p className="mt-3 max-w-2xl text-[#C7C2B4]">
          Short answers for the questions people usually ask before they type a birth time.
        </p>
        <div className="mt-10 space-y-3">
          {homepageFaqs.map((item, index) => {
            const open = openFaq === index;
            return (
              <article
                key={item.q}
                className="overflow-hidden rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B]"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenFaq(open ? null : index)}
                >
                  <span className="font-semibold text-[#F5F1E8]">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#C8AC80] transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open ? (
                  <p className="border-t border-[#b18d4f]/20 px-5 py-4 text-sm leading-6 text-[#C7C2B4]">
                    {item.a}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
