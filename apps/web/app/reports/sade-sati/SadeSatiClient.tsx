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

type SadeSatiPhase = "rising" | "peak" | "setting" | "none";

type SadeSatiResult = {
  moonRashi: string;
  saturnTransitRashi: string;
  sadeSatiActive: boolean;
  phase: SadeSatiPhase;
  dhaiyaActive: boolean;
  dhaiyaKind?: "fourth" | "eighth" | null;
  approxPhaseStart: string | null;
  approxPhaseEnd: string | null;
  asOf?: string;
  houseFromMoon?: number;
};

const fieldClass =
  "w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2.5 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:bg-slate-100 disabled:text-slate-400";

const PHASE_LABEL: Record<SadeSatiPhase, string> = {
  rising: "Rising Phase",
  peak: "Peak Phase",
  setting: "Setting Phase",
  none: "Not Active",
};

function formatYmd(value: string): string {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
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

function phaseGuidance(result: SadeSatiResult): string {
  if (result.sadeSatiActive && result.phase === "rising") {
    return "Rising Sade Sati often feels like the ground is shifting under familiar routines. That is usually a cue to simplify: clear one overdue task, protect sleep, and keep money decisions smaller than usual. You do not have to overhaul your life in the first chapter.";
  }
  if (result.sadeSatiActive && result.phase === "peak") {
    return "Peak phase sits on the natal Moon, so feelings can run closer to the surface. Treat this as a season for honest pacing rather than a test you must pass. Keep one trusted conversation going, eat and rest on a schedule, and let unfinished work wait when your body asks for it.";
  }
  if (result.sadeSatiActive && result.phase === "setting") {
    return "Setting phase is when many people notice they can sort what the earlier years stirred up. Review commitments you outgrew, keep the habits that actually helped, and give yourself credit for staying with the work. The aim is a quieter close, not a dramatic finish.";
  }
  if (result.dhaiyaActive) {
    return "Dhaiya is a shorter Saturn transit through the 4th or 8th from the Moon. It can highlight home, rest, or hidden pressure without being the full seven-and-a-half-year cycle. Steady daily structure still helps more than grand remedies.";
  }
  return "Saturn is not transiting the three Sade Sati signs from your Moon right now. Use quieter Saturn periods to strengthen the same basics — sleep, savings, and one skill you want to keep — so the next cycle, whenever it comes, meets you already organised.";
}

export default function SadeSatiClient() {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  const [asOf, setAsOf] = useState(todayYmd);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SadeSatiResult | null>(null);
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
      const res = await fetch("/api/sade-sati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob,
          tob,
          pob: place.trim(),
          lat,
          lng,
          asOf: asOf || undefined,
        }),
      });
      const json = (await res.json()) as SadeSatiResult & { error?: string };
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

  const statusLabel = result
    ? result.sadeSatiActive
      ? `Active — ${PHASE_LABEL[result.phase]}`
      : result.dhaiyaActive
        ? "Not in Sade Sati — Dhaiya active"
        : "Not Active"
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#F5F1E8]">Sade Sati Report</h1>
        <p className="mt-2 text-sm text-[#C7C2B4]">
          Enter birth details to see whether Saturn’s current transit sits in Sade Sati
          relative to your natal Moon.
        </p>

        <section className="mt-6 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-5 shadow-sm">
          <div className="space-y-3">
            <div>
              <label htmlFor="ss-dob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Date of birth
              </label>
              <input
                id="ss-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={`${fieldClass} [color-scheme:light]`}
              />
            </div>
            <div>
              <label htmlFor="ss-tob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Time of birth
              </label>
              <input
                id="ss-tob"
                type="time"
                value={tob}
                onChange={(e) => setTob(e.target.value)}
                className={`${fieldClass} [color-scheme:light]`}
              />
            </div>
            <div ref={pobRef} className="relative">
              <label htmlFor="ss-pob" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Place of birth
              </label>
              <div className="relative">
                <input
                  id="ss-pob"
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
            <div>
              <label htmlFor="ss-asof" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                As of date (optional)
              </label>
              <input
                id="ss-asof"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value || todayYmd())}
                className={`${fieldClass} [color-scheme:light]`}
              />
              <p className="mt-1 text-xs text-[#C7C2B4]">
                Defaults to today. Change this to see Saturn’s transit on another date.
              </p>
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
              <h2 className="text-3xl font-extrabold text-[#F5F1E8]">{statusLabel}</h2>
              <span
                className={
                  result.sadeSatiActive
                    ? "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
                    : "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
                }
              >
                {result.sadeSatiActive ? "Sade Sati" : "Outside Sade Sati"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#C7C2B4]">{phaseGuidance(result)}</p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">Natal Moon Rashi</dt>
                <dd className="font-semibold text-[#F5F1E8]">{result.moonRashi}</dd>
              </div>
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">
                  Saturn transit{result.asOf ? ` · ${formatYmd(result.asOf)}` : ""}
                </dt>
                <dd className="font-semibold text-[#F5F1E8]">{result.saturnTransitRashi}</dd>
              </div>
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">Sade Sati phase</dt>
                <dd className="font-semibold text-[#F5F1E8]">{PHASE_LABEL[result.phase]}</dd>
              </div>
              <div className="rounded-xl bg-[#09142a] px-3 py-2.5">
                <dt className="text-xs text-[#C7C2B4]">Dhaiya</dt>
                <dd className="font-semibold text-[#F5F1E8]">
                  {result.dhaiyaActive
                    ? result.dhaiyaKind === "fourth"
                      ? "Active — 4th from Moon"
                      : result.dhaiyaKind === "eighth"
                        ? "Active — 8th from Moon"
                        : "Active"
                    : "Not active"}
                </dd>
              </div>
              {result.approxPhaseStart && result.approxPhaseEnd ? (
                <div className="rounded-xl bg-[#09142a] px-3 py-2.5 sm:col-span-2">
                  <dt className="text-xs text-[#C7C2B4]">
                    Approximate current-sign window
                  </dt>
                  <dd className="font-semibold text-[#F5F1E8]">
                    {formatYmd(result.approxPhaseStart)} – {formatYmd(result.approxPhaseEnd)}
                  </dd>
                  <p className="mt-1 text-xs text-[#C7C2B4]">
                    Dates mark Saturn’s present stay in this sign at noon UTC. Retrograde
                    can split a sign transit, so this is a working range, not a ritual calendar.
                  </p>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="mt-8 space-y-5 text-sm leading-relaxed text-[#C7C2B4]">
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">What Sade Sati is</h2>
            <p className="mt-2">
              Sade Sati is a name for Saturn’s slow walk through the sign before your natal
              Moon, the Moon’s own sign, and the sign after it. In classical language that is
              about seven and a half years, because Saturn spends roughly two and a half years
              in each rashi. It is a transit clock, not a verdict on your character or a
              forecast of disaster.
            </p>
            <p className="mt-2">
              Saturn is associated with time, duty, and the parts of life that only improve
              when they are tended. People often notice heavier work, clearer limits, or a
              wish to grow up in one area during these years. Those themes can be useful. They
              are not a reason to delay marriage, freeze a career, or expect loss as a rule.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">The three phases</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-[#F5F1E8]">Rising</span> — Saturn in
                the 12th sign from the Moon. Familiar comforts may feel thinner. This is a
                good stretch to reduce clutter, close small debts, and notice what actually
                restores you.
              </li>
              <li>
                <span className="font-semibold text-[#F5F1E8]">Peak</span> — Saturn on
                the natal Moon. Emotions can sit closer to daily life. Kind structure —
                regular meals, a walk, one person you can tell the truth to — does more here
                than dramatic vows.
              </li>
              <li>
                <span className="font-semibold text-[#F5F1E8]">Setting</span> — Saturn in
                the 2nd from the Moon. Many charts show a sorting period: keep what you built,
                release what you were only carrying. Speech and family money habits often
                deserve a quiet review.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">Dhaiya, briefly</h2>
            <p className="mt-2">
              When Saturn transits the 4th or 8th from the Moon, some traditions call it
              Dhaiya — a shorter, related chapter rather than the full Sade Sati. It can
              highlight home, rest, or topics people keep private. The same practical advice
              applies: do not treat it as a curse, and do not ignore basic care.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">How to use this report</h2>
            <p className="mt-2">
              Use the status above as a map of Saturn’s current sign, then decide one
              ordinary improvement you can keep for a month. If you want a full chart reading,
              sit with an astrologer who can weigh dasha, house lords, and your actual
              circumstances — this page does not replace that conversation, and it is not
              medical or financial advice.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
