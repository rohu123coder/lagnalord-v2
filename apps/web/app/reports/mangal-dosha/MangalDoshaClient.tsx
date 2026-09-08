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

type MangalDoshaResult = {
  isManglik: boolean;
  moonChartManglik: boolean;
  venusChartManglik?: boolean;
  marsHouse: number;
  marsHouseFromMoon?: number;
  marsRashi?: string;
  moonRashi?: string;
  lagnaRashi?: string;
  naturalDosha?: boolean;
  cancellationFactors: string[];
  explanation: string;
};

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-3 py-2.5 text-[#F5F1E8] outline-none ring-[#b18d4f]/30 transition focus:border-[#b18d4f] focus:ring-2";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

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

export default function MangalDoshaClient() {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MangalDoshaResult | null>(null);
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
      const res = await fetch("/api/mangal-dosha", {
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
      const json = (await res.json()) as MangalDoshaResult & { error?: string };
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

  const cancelled =
    result != null &&
    (result.naturalDosha ?? result.cancellationFactors.length > 0) &&
    result.cancellationFactors.length > 0 &&
    !result.isManglik;
  const showRemedies = result?.isManglik === true && result.cancellationFactors.length === 0;
  const showMoonChartDiff =
    result != null && result.moonChartManglik !== result.isManglik;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#F5F1E8]">
          Mangal Dosha Checker
        </h1>
        <p className="mt-2 text-sm text-[#C7C2B4]">
          Enter birth details to check Mangal Dosha and suggested remedies.
        </p>

        <section className="mt-6 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-lg shadow-black/30">
          <div className="space-y-3">
            <div>
              <label htmlFor="md-dob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Date of birth
              </label>
              <input
                id="md-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="md-tob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Time of birth
              </label>
              <input
                id="md-tob"
                type="time"
                value={tob}
                onChange={(e) => setTob(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div ref={pobRef} className="relative">
              <label htmlFor="md-pob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Place of birth
              </label>
              <div className="relative">
                <input
                  id="md-pob"
                  type="text"
                  autoComplete="off"
                  value={place}
                  onChange={(e) => onPobChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
                  placeholder="Search city or town"
                  className={fieldClass}
                />
                {geoLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b18d4f]">
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
          <section className="mt-6 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-lg shadow-black/30">
            <p className="text-sm font-semibold text-[#C8AC80]">Overall status</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-extrabold text-[#F5F1E8]">
                {result.isManglik ? "Manglik" : "Non-Manglik"}
              </h2>
              <span
                className={
                  result.isManglik
                    ? "rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300"
                    : "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
                }
              >
                {result.isManglik ? "Mangal Dosha Present" : "Overall Non-Manglik"}
              </span>
            </div>

            {cancelled ? (
              <p className="mt-2 text-sm text-[#C7C2B4]">
                Natural Dosha: Present (cancelled). Mars sits in a Mangal house from
                the Ascendant, but cancellation factors apply, so the overall result
                is Non-Manglik.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#C7C2B4]">{result.explanation}</p>
            )}

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">Mars from Lagna</dt>
                <dd className="font-semibold text-[#F5F1E8]">
                  {ordinal(result.marsHouse)} house
                  {result.lagnaRashi ? ` · Lagna ${result.lagnaRashi}` : ""}
                </dd>
              </div>
              {showMoonChartDiff ? (
                <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                  <dt className="text-xs text-[#C7C2B4]">Moon Chart</dt>
                  <dd className="font-semibold text-[#F5F1E8]">
                    {result.moonChartManglik ? "Manglik" : "Non-Manglik"}
                    {result.marsHouseFromMoon
                      ? ` · Mars in ${ordinal(result.marsHouseFromMoon)} from Moon`
                      : ""}
                  </dd>
                </div>
              ) : null}
              {result.marsRashi ? (
                <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                  <dt className="text-xs text-[#C7C2B4]">Mars Rashi</dt>
                  <dd className="font-semibold text-[#F5F1E8]">{result.marsRashi}</dd>
                </div>
              ) : null}
            </dl>

            {result.cancellationFactors.length > 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <h3 className="text-sm font-bold text-emerald-300">
                  Cancellation Factors
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-100/90">
                  {result.cancellationFactors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {cancelled ? (
              <p className="mt-4 text-sm text-[#C7C2B4]">{result.explanation}</p>
            ) : null}

            {showRemedies ? (
              <>
                <p className="mt-4 text-sm text-[#C7C2B4]">
                  Your chart indicates Mars influence in key marriage houses. You can
                  reduce effects through remedies and disciplined routine.
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#C7C2B4]">
                  <li>Recite Hanuman Chalisa on Tuesdays.</li>
                  <li>Offer red lentils (masoor dal) in daan on Tuesday mornings.</li>
                  <li>Observe Mangal fast (Mangalvar vrat) with sattvic food.</li>
                  <li>Perform Mangal Shanti puja with a qualified priest.</li>
                </ul>
              </>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
