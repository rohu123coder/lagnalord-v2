"use client";

import { type FormEvent, useState } from "react";

import { AstrologerCTA } from "@/components/AstrologerCTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import {
  friendshipPercentageFromNames,
  sharedUniqueLetters,
  uniqueLetterSet,
} from "@/lib/numerology";

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-3 py-2.5 text-[#F5F1E8] outline-none focus:ring-2 focus:border-[#b18d4f] focus:ring-[#b18d4f]";

const FAQS = [
  {
    q: "Why doesn’t this use Destiny numbers?",
    a: "On purpose. The Love Calculator already mixes two Destiny digits. Friendship here is a different dare: how much of the two alphabets overlap, ignoring order and repeats.",
  },
  {
    q: "Why can’t the score be 0% or 100%?",
    a: "The scale is 35 + 60 × Jaccard. Zero overlap still prints 35% (the names share a language, not a void). Perfect letter-set overlap prints 95%, not 100 — there is always room for the friendship you actually live.",
  },
  {
    q: "Do double letters count twice?",
    a: "No. Sets ignore repeats. “Anna” contributes A and N once each. That keeps a long name from winning just by stacking the same glyph.",
  },
  {
    q: "Can cousins or colleagues use this?",
    a: "Yes. The framing is platonic on purpose. If you want FLAMES theatre or a Destiny pairing, those are separate pages.",
  },
];

type Result = {
  percent: number;
  shared: string[];
  sizeA: number;
  sizeB: number;
  union: number;
};

export function FriendshipClient() {
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const percent = friendshipPercentageFromNames(nameA, nameB);
    if (!percent) {
      setResult(null);
      setError("Enter two names that contain letters.");
      return;
    }
    const setA = uniqueLetterSet(nameA);
    const setB = uniqueLetterSet(nameB);
    const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
    setError(null);
    setResult({
      percent,
      shared: sharedUniqueLetters(nameA, nameB),
      sizeA: setA.size,
      sizeB: setB.size,
      union,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a] text-[#F5F1E8]">
      <Navbar />
      <main>
        <section className="border-b border-[#b18d4f]/20 bg-[#0E1C3B]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C8AC80]">
              Platonic overlap
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#C8AC80] md:text-5xl">
              Friendship Calculator
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C7C2B4]">
              Two names, one overlap score. We compare unique letters — not Destiny digits, not a
              FLAMES wheel — and scale that shared alphabet into a friendship percentage.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm"
          >
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">Friend one</label>
            <input
              type="text"
              required
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="e.g. Kavya"
              className={fieldClass}
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#C7C2B4]">
              Friend two
            </label>
            <input
              type="text"
              required
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="e.g. Sneha"
              className={fieldClass}
            />
            <button
              type="submit"
              className="mt-4 rounded-xl bg-[#2A7D7B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3A9D9B]"
            >
              Measure overlap
            </button>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </form>

          {result ? (
            <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#C8AC80]">Friendship score</p>
              <p className="mt-1 text-5xl font-extrabold text-[#F5F1E8]">{result.percent}%</p>
              <p className="mt-3 text-sm leading-6 text-[#C7C2B4]">
                Shared unique letters:{" "}
                <span className="font-semibold text-[#F5F1E8]">
                  {result.shared.length ? result.shared.join(" · ") : "none"}
                </span>
              </p>
              <p className="mt-2 text-sm text-[#C7C2B4]">
                Sets of {result.sizeA} and {result.sizeB} letters · union {result.union} · Jaccard{" "}
                {(result.shared.length / result.union).toFixed(2)} · then 35 + 60 × Jaccard,
                rounded.
              </p>
            </section>
          ) : null}

          <AstrologerCTA
            heading="Want a personalized reading?"
            text="Letter overlap is a spelling toy. If you actually want to understand a friendship, a family knot, or a falling-out, bring the charts — not the Jaccard index."
          />

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Why this is not a second love meter</h2>
            <p>
              Romance pages tend to collapse two people into Destiny digits or a leftover-letter
              wheel. Friendship is messier than that, so this calculator refuses both shortcuts. It
              only asks: once you throw away order, case, and repeats, how much of the two names
              is the same handful of letters?
            </p>
            <p>
              That overlap — Jaccard similarity — is a set recipe used in all kinds of matching
              problems. Here it is scaled into a friendly 35–95 band so a pair with no shared
              glyphs still gets a number, and a pair that uses exactly the same letters still
              leaves 5% of the bar empty. The score is a conversation piece for two friends, not a
              ranking of who “belongs” in whose life.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">The formula, without mystery</h2>
            <p>
              Build set A from unique A–Z letters in the first name, set B from the second. Shared
              = |A ∩ B|. Union = |A ∪ B|. Jaccard = shared ÷ union. Score = round(35 + 60 ×
              Jaccard). No planet, no triad, no clash table. Change a nickname and the sets move;
              that is the whole mechanic.
            </p>
          </article>

          <article className="space-y-4 text-sm leading-7 text-[#C7C2B4]">
            <h2 className="text-2xl font-bold text-[#F5F1E8]">Worked example: Kavya and Sneha</h2>
            <p>
              KAVYA unique letters: A, K, V, Y (4). SNEHA: A, E, H, N, S (5). They share only A.
              Union is 8. Jaccard = 1/8 = 0.125. Score = 35 + 7.5 →{" "}
              <span className="font-semibold text-[#F5F1E8]">43%</span>. A pair like “Anita” and
              “Nita” shares almost the whole set and will sit much higher on the same scale —
              still without claiming they are better friends.
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
