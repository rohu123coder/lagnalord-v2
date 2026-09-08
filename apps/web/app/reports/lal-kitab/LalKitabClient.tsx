"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Navbar } from "@/components/Navbar";

type GeocodeHit = {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress: string;
};

type LalKitabHouse = {
  houseNumber: number;
  sign: string;
  planets: string[];
};

type LalKitabPlanetDetail = {
  name: string;
  house: number;
  pakkaGharHouses?: number[];
  isInPakkaGhar: boolean;
  isSleeping: boolean;
};

type LalKitabResult = {
  lagna: string;
  houses: LalKitabHouse[];
  planetDetails: LalKitabPlanetDetail[];
};

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-3 py-2.5 text-[#F5F1E8] outline-none focus:ring-2 focus:border-[#b18d4f] focus:ring-[#b18d4f]";

const SAFE_REMEDIES = [
  "In the morning, place a little jaggery or grain where birds can find it. Keep the amount small and the habit regular.",
  "On a Thursday, donate a handful of uncooked wheat or rice to a kitchen that will actually cook it.",
  "Keep one small silver coin or bowl clean and unused for spending. Polish it when you tidy the house.",
  "Fill a plain bowl with water at night, leave it under the open sky, and water a plant with it the next morning.",
  "Offer water at the roots of a shade tree you can reach without trespassing. Do not cut or nail the tree.",
  "On a Saturday, pass on unused clothes that are still wearable. Do not buy new things only to donate them.",
];

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function LalKitabClient() {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LalKitabResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeHit[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pobRef = useRef<HTMLDivElement>(null);

  const canSubmit =
    dob.length > 0 && tob.length >= 4 && place.trim().length > 0 && lat != null && lng != null;

  const onPobChange = useCallback((value: string) => {
    setPlace(value);
    setLat(null);
    setLng(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(
          `/api/kundli/geocode?q=${encodeURIComponent(value.trim())}`
        );
        const json = (await res.json()) as {
          results?: GeocodeHit[];
          error?: string;
        };
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const list = (json.results ?? [])
          .filter(
            (r) =>
              typeof r.lat === "number" &&
              typeof r.lng === "number" &&
              !Number.isNaN(r.lat) &&
              !Number.isNaN(r.lng)
          )
          .slice(0, 5);
        setSuggestions(list);
        setShowSuggest(list.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setGeoLoading(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (pobRef.current && !pobRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function handleSubmit() {
    if (!canSubmit || loading || lat == null || lng == null) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lal-kitab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob,
          tob,
          pob: place.trim(),
          lat,
          lng,
        }),
      });
      const json = (await res.json()) as LalKitabResult & { error?: string };
      if (!res.ok) {
        setResult(null);
        setError(typeof json.error === "string" ? json.error : "Calculation failed");
        return;
      }
      setResult(json);
    } catch {
      setResult(null);
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#F5F1E8]">Lal Kitab Report</h1>
        <p className="mt-2 text-sm text-[#C7C2B4]">
          A fixed-house (Kaal Purush) snapshot from your birth chart — one commonly
          used method, not the only Lal Kitab school.
        </p>

        <div
          className="mt-6 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 shadow-sm"
          role="note"
        >
          <p className="text-sm font-semibold text-amber-200">
            How to read this report
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#F5F1E8]">
            Lal Kitab has multiple interpretive traditions. This report follows a
            commonly-used fixed-house (Kaal Purush) method for educational purposes.
            Results are computer-generated; consult a qualified astrologer for
            personalized guidance.
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm">
          <div className="space-y-3">
            <div>
              <label htmlFor="lk-dob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Date of birth
              </label>
              <input
                id="lk-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="lk-tob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Time of birth
              </label>
              <input
                id="lk-tob"
                type="time"
                value={tob}
                onChange={(e) => setTob(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div ref={pobRef} className="relative">
              <label htmlFor="lk-pob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Place of birth
              </label>
              <div className="relative">
                <input
                  id="lk-pob"
                  type="text"
                  autoComplete="off"
                  value={place}
                  onChange={(e) => onPobChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
                  placeholder="Search city or town"
                  className={fieldClass}
                />
                {geoLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8AC80]">
                    <Spinner className="h-5 w-5" />
                  </div>
                ) : null}
              </div>
              {place && lat == null && lng == null && !showSuggest ? (
                <p className="mt-2 text-xs font-medium text-amber-400">
                  Please select your city from the search suggestions to confirm the exact location.
                </p>
              ) : null}
              {showSuggest && suggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#b18d4f]/20 bg-[#0E1C3B] py-1 shadow-lg">
                  {suggestions.map((s, i) => {
                    const line = [s.city, s.country].filter(Boolean).join(", ");
                    return (
                      <li key={`${s.formattedAddress}-${i}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm text-[#F5F1E8] hover:bg-[#09142a]"
                          onClick={() => {
                            setPlace(s.formattedAddress || line);
                            setLat(s.lat!);
                            setLng(s.lng!);
                            setShowSuggest(false);
                            setSuggestions([]);
                          }}
                        >
                          {line || s.formattedAddress}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmit || loading}
            onClick={() => void handleSubmit()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#b18d4f] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#8E713F] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4 text-white" />
                Checking...
              </>
            ) : (
              "Check Now"
            )}
          </button>
          {error ? (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        {result ? (
          <section className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm">
              <h2 className="text-xl font-bold text-[#F5F1E8]">
                Kaal Purush house grid
              </h2>
              <p className="mt-1 text-sm text-[#C7C2B4]">
                Natal Lagna (from the birth chart, not used to number these houses):{" "}
                <span className="font-semibold text-[#F5F1E8]">{result.lagna}</span>
                . House 1 here is always Mesh (Aries).
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {result.houses.map((house) => (
                  <div
                    key={house.houseNumber}
                    className="rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-[#C8AC80]">
                      House {house.houseNumber}
                    </p>
                    <p className="text-xs text-[#C7C2B4]">{house.sign}</p>
                    <p className="mt-1 text-sm font-semibold text-[#F5F1E8]">
                      {house.planets.length > 0 ? house.planets.join(", ") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm">
              <h2 className="text-xl font-bold text-[#F5F1E8]">Planet notes</h2>
              <ul className="mt-3 divide-y divide-[#b18d4f]/20 rounded-xl border border-[#b18d4f]/20 bg-[#09142a]">
                {result.planetDetails.map((planet) => (
                  <li key={planet.name} className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#F5F1E8]">
                        {planet.name}
                      </span>
                      <span className="text-[#C7C2B4]">
                        House {planet.house}
                        {planet.pakkaGharHouses && planet.pakkaGharHouses.length > 0
                          ? ` · Pakka ${planet.pakkaGharHouses.join(", ")}`
                          : " · no pakka ghar in this table"}
                      </span>
                    </div>
                    {planet.isInPakkaGhar ? (
                      <p className="mt-1 text-[#C7C2B4]">
                        In its Pakka Ghar — this planet is in a house where many Lal
                        Kitab readers say it can express its full nature more steadily.
                      </p>
                    ) : (
                      <p className="mt-1 text-[#C7C2B4]">
                        Not in a listed Pakka Ghar for this method.
                      </p>
                    )}
                    <p className="mt-1 text-[#C7C2B4]">
                      {planet.isSleeping
                        ? "Sleeping in this simplified check: its influence is limited to its own house for now (no planet sits in the 7th from it, and it is not in Pakka Ghar)."
                        : "Awake in this simplified check: either it sits in Pakka Ghar, or another planet occupies the 7th house from it."}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="mt-8 space-y-5 text-sm leading-relaxed text-[#C7C2B4]">
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">What Lal Kitab is</h2>
            <p className="mt-2">
              Lal Kitab is a family of Hindi manuals from the late 19th and early 20th
              centuries. It uses many of the same planets as Parashari Jyotish, but it
              often reads a fixed “Kaal Purush” house wheel (Aries as the first house)
              and pairs placements with simple household remedies. It is not the same
              system as a classical Vedic chart, and two Lal Kitab teachers can disagree
              on the same birth data.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">The three ideas used here</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-[#F5F1E8]">Fixed houses</span> —
                sign equals house. Leo is always the 5th house in this grid, even if your
                natal Lagna is Sagittarius.
              </li>
              <li>
                <span className="font-semibold text-[#F5F1E8]">Pakka Ghar</span> —
                a short list of houses where a planet is treated as “at home.” Lists vary
                by school; this page uses one commonly repeated table.
              </li>
              <li>
                <span className="font-semibold text-[#F5F1E8]">Sleeping planet</span> —
                a simplified rule: not in Pakka Ghar, and the opposite (7th) house is
                empty. Other books add more tests. We do not.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">
              Gentle, low-cost practices
            </h2>
            <p className="mt-2">
              These are general household customs found in Lal Kitab-style advice. They
              are not prescribed for a specific dosha on this page, and they are not a
              substitute for medical, legal, or financial care.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {SAFE_REMEDIES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
