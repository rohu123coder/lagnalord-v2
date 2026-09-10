"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

type GeocodeHit = {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress: string;
};

type AxisSide = "rahu_to_ketu" | "ketu_to_rahu";

type PlanetPosition = {
  name: string;
  longitude: number;
  relativeToRahu?: number;
  sideOfAxis: AxisSide;
  conjunctNode?: boolean;
};

type KaalSarpResult = {
  isPresent: boolean;
  type: string | null;
  rahuHouse: number;
  ketuHouse?: number;
  planetPositions: PlanetPosition[];
  anyPlanetConjunctNode: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const TYPE_THEME: Record<string, string> = {
  Anant:
    "Anant (Rahu in the 1st) is read as a long-running pattern around identity and how you start things. It is a style of self-presentation, not a sentence on your worth.",
  Kulik:
    "Kulik (Rahu in the 2nd) is often linked to family tone, speech, and how money is discussed at home. Practical language habits matter more here than ritual panic.",
  Vasuki:
    "Vasuki (Rahu in the 3rd) tends to show in effort, siblings, and the courage to take the next small step. Skill practice is a better response than fear of short journeys.",
  Shankhpal:
    "Shankhpal (Rahu in the 4th) can highlight home, rest, and the people who raised you. A quieter room and clearer boundaries usually help more than dramatic vows.",
  Padma:
    "Padma (Rahu in the 5th) is associated with learning, creativity, and how you take a risk with the heart. Curiosity stays useful; treating children or art as cursed does not.",
  Mahapadma:
    "Mahapadma (Rahu in the 6th) often shows in daily work, health routine, and small frictions. Regular meals, sleep, and one honest work habit are the usual levers.",
  Takshak:
    "Takshak (Rahu in the 7th) is read through partnership — how you meet the other person. Fair conversation and time apart when needed beat the idea that marriage is doomed.",
  Karkotak:
    "Karkotak (Rahu in the 8th) can point to shared resources, privacy, and change you did not schedule. Transparency with one trusted person is enough; secrecy is not destiny.",
  Shankhchud:
    "Shankhchud (Rahu in the 9th) is linked to teachers, beliefs, and longer journeys of meaning. Questioning a received idea is allowed. Losing all faith is not required.",
  Ghatak:
    "Ghatak (Rahu in the 10th) sits on vocation and public work. Reputation grows from the next competent week, not from avoiding a career because of a node.",
  Vishdhar:
    "Vishdhar (Rahu in the 11th) can colour friends, groups, and how gains arrive. Choose circles that keep you honest. Isolation is not a remedy.",
  Sheshnag:
    "Sheshnag (Rahu in the 12th) often concerns rest, solitude, and what you release. Sleep and a private practice help; treating withdrawal as a curse does not.",
};

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

function formatDeg(lon: number): string {
  const n = ((lon % 360) + 360) % 360;
  const sign = Math.floor(n / 30);
  const deg = n % 30;
  return `${deg.toFixed(1)}° in sign ${sign + 1}`;
}

function sideLabel(side: AxisSide): string {
  return side === "rahu_to_ketu" ? "Rahu → Ketu arc" : "Ketu → Rahu arc";
}

export default function KaalSarpDoshaClient() {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KaalSarpResult | null>(null);
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
      const res = await fetch("/api/kaal-sarp-dosha", {
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
      const json = (await res.json()) as KaalSarpResult & { error?: string };
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

  const rahuArcCount =
    result?.planetPositions.filter((p) => p.sideOfAxis === "rahu_to_ketu").length ?? 0;
  const ketuArcCount =
    result?.planetPositions.filter((p) => p.sideOfAxis === "ketu_to_rahu").length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#F5F1E8]">
          Kaal Sarp Dosha Checker
        </h1>
        <p className="mt-2 text-sm text-[#C7C2B4]">
          Enter birth details to see whether the seven classical planets sit on one
          side of the Rahu–Ketu axis.
        </p>

        <section className="mt-6 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm">
          <div className="space-y-3">
            <div>
              <label htmlFor="ks-dob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Date of birth
              </label>
              <input
                id="ks-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={`${fieldClass} [color-scheme:light]`}
              />
            </div>
            <div>
              <label htmlFor="ks-tob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Time of birth
              </label>
              <input
                id="ks-tob"
                type="time"
                value={tob}
                onChange={(e) => setTob(e.target.value)}
                className={`${fieldClass} [color-scheme:light]`}
              />
            </div>
            <div ref={pobRef} className="relative">
              <label htmlFor="ks-pob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Place of birth
              </label>
              <div className="relative">
                <input
                  id="ks-pob"
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
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#b18d4f]/30 bg-white py-1 shadow-lg">
                  {suggestions.map((s, i) => {
                    const line = [s.city, s.country].filter(Boolean).join(", ");
                    return (
                      <li key={`${s.formattedAddress}-${i}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm text-[#09142a] hover:bg-[#b18d4f]/10"
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
          <section className="mt-6 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-3xl font-extrabold text-[#F5F1E8]">
                {result.isPresent ? "Present" : "Not Present"}
              </h2>
              <span
                className={
                  result.isPresent
                    ? "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
                    : "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
                }
              >
                {result.isPresent
                  ? result.type
                    ? `${result.type} type`
                    : "Present"
                  : "Axis is open"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              {result.isPresent
                ? "All seven classical planets sit on one side of the Rahu–Ketu line in this birth chart. That is a geometric note, not a life sentence."
                : "At least one classical planet sits on the other side of the Rahu–Ketu axis, so this chart does not meet the strict one-arc rule."}
            </p>
            {result.isPresent && result.type && TYPE_THEME[result.type] ? (
              <p className="mt-3 text-sm text-[#C7C2B4]">{TYPE_THEME[result.type]}</p>
            ) : null}
            {result.anyPlanetConjunctNode ? (
              <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-[#C7C2B4]">
                One or more planets sit within 2° of Rahu or Ketu. Some traditions treat
                that as a weaker or partly cancelled form of the pattern. We flag it here
                and still report the geometric result above.
              </p>
            ) : null}

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">Rahu house from Lagna</dt>
                <dd className="font-semibold text-[#F5F1E8]">{result.rahuHouse}</dd>
              </div>
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">Arc split (Sun–Saturn)</dt>
                <dd className="font-semibold text-[#F5F1E8]">
                  {rahuArcCount} on Rahu→Ketu · {ketuArcCount} on Ketu→Rahu
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <h3 className="text-sm font-bold text-[#F5F1E8]">Planet distribution</h3>
              <ul className="mt-2 divide-y divide-[#b18d4f]/20 rounded-xl border border-[#b18d4f]/20 bg-[#09142a]">
                {result.planetPositions.map((p) => (
                  <li
                    key={p.name}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-[#F5F1E8]">{p.name}</span>
                    <span className="text-[#C7C2B4]">
                      {sideLabel(p.sideOfAxis)}
                      {p.conjunctNode ? " · near a node" : ""}
                    </span>
                    <span className="w-full text-xs text-[#C7C2B4] sm:w-auto">
                      {formatDeg(p.longitude)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="mt-8 space-y-5 text-sm leading-relaxed text-[#C7C2B4]">
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">What this pattern is</h2>
            <p className="mt-2">
              In Jyotish, Rahu and Ketu are opposite points. Some later writers called it
              Kaal Sarp when the Sun, Moon, Mars, Mercury, Jupiter, Venus, and Saturn all
              fall in the 180° stretch on one side of that axis. The name is dramatic. The
              test itself is only a count of which side of a line the planets occupy.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">What it is often not</h2>
            <p className="mt-2">
              This combination is widely sold as rare, fatal, or in need of an expensive
              puja. It is not rare if you use loose house rules, and it is not a medical or
              financial diagnosis. Many capable charts show it; many difficult lives do not.
              Classical texts do not treat it as a standalone doom yoga the way modern
              marketing does.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">How to use the result</h2>
            <p className="mt-2">
              If the pattern is present, read the type as a hint about which house Rahu
              occupies — a place that may need extra honesty, not extra fear. If it is
              absent, you do not need a remedy for a yoga you do not have. Either way, a
              full chart (dasha, house lords, and your actual circumstances) matters more
              than this one axis. This page is not a substitute for that conversation.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
