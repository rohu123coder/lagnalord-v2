"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Navbar } from "@/components/Navbar";

type Nakshatra = { name: string; lord: string; pada: number };
type TimeRange = { start: string; end: string };
type ChoghadiyaRow = {
  period: string;
  name: string;
  nature: "auspicious" | "inauspicious" | "neutral";
};
type HoraRow = { start: string; end: string; planet: string };

export type PanchangData = {
  date: string;
  lat: number;
  lng: number;
  utcOffset: number;
  tithi: { number: number; name: string; paksha: "Shukla" | "Krishna" };
  nakshatra: Nakshatra;
  yoga: { name: string };
  karana: { name: string };
  vaar: { english: string; hindi: string };
  sunrise: string;
  sunset: string;
  rahuKaal: TimeRange;
  yamaganda: TimeRange;
  gulikaKaal: TimeRange;
  choghadiya: { day: ChoghadiyaRow[]; night: ChoghadiyaRow[] };
  hora: HoraRow[];
  abhijitMuhurat: TimeRange;
};

type GeocodeHit = {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress: string;
};

const DELHI = { lat: 28.6139, lng: 77.209, name: "Delhi, India" };

const CHOGHADIYA_NOTE: Record<string, string> = {
  Amrit: "Highly auspicious",
  Shubh: "Good for starts",
  Labh: "Good for gains",
  Char: "Travel and movement",
  Udveg: "Mixed outcomes",
  Kaal: "Avoid important work",
  Rog: "Not preferred",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

function formatLongDate(ymd: string): string {
  return parseYmd(ymd).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function choghadiyaNatureClass(nature: ChoghadiyaRow["nature"]): string {
  if (nature === "auspicious") return "text-emerald-400";
  if (nature === "inauspicious") return "text-red-400";
  return "text-[#F5F1E8]";
}

async function fetchPanchang(date: string, lat: number, lng: number): Promise<PanchangData> {
  const params = new URLSearchParams({ date, lat: String(lat), lng: String(lng) });
  const res = await fetch(`/api/panchang?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json?.success || !json?.data) {
    throw new Error(json?.error ?? "Could not load Panchang");
  }
  return json.data as PanchangData;
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-lg shadow-black/30 ${className}`}
    >
      <h2 className="text-lg font-bold text-[#F5F1E8]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
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

export function PanchangClient() {
  const todayYmd = useMemo(() => toYmd(new Date()), []);
  const tomorrowYmd = useMemo(() => addDays(todayYmd, 1), [todayYmd]);

  const [date, setDate] = useState(todayYmd);
  const [placeName, setPlaceName] = useState(DELHI.name);
  const [lat, setLat] = useState(DELHI.lat);
  const [lng, setLng] = useState(DELHI.lng);
  const [suggestions, setSuggestions] = useState<GeocodeHit[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pobRef = useRef<HTMLDivElement>(null);

  const [detail, setDetail] = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dayToggle = date === todayYmd ? "today" : date === tomorrowYmd ? "tomorrow" : "custom";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!pobRef.current?.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onPlaceChange = useCallback((value: string) => {
    setPlaceName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`/api/kundli/geocode?q=${encodeURIComponent(value.trim())}`);
        const json = (await res.json()) as { results?: GeocodeHit[] };
        const list = (json.results ?? [])
          .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
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
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPanchang(date, lat, lng);
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load Panchang");
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [date, lat, lng]);

  const heading =
    dayToggle === "tomorrow"
      ? "Tomorrow's Panchang"
      : dayToggle === "today"
        ? "Today's Panchang"
        : "Panchang";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0F2240] to-[#0A1A2F]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#F5F1E8] sm:text-4xl">{heading}</h1>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              {formatLongDate(date)} | {placeName}
            </p>
          </div>

          <form
            className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:max-w-xl"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="sm:w-40">
              <label htmlFor="panchang-date" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Date
              </label>
              <input
                id="panchang-date"
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
                className="w-full rounded-xl border border-[#C9A227]/20 bg-[#0A1A2F] px-4 py-2.5 text-sm text-[#F5F1E8] shadow-sm outline-none ring-[#C9A227]/30 transition focus:border-[#C9A227] focus:ring-2"
              />
            </div>
            <div ref={pobRef} className="relative min-w-0 flex-1">
              <label htmlFor="panchang-place" className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
                Place
              </label>
              <div className="relative">
                <input
                  id="panchang-place"
                  type="text"
                  autoComplete="off"
                  placeholder="Search city"
                  value={placeName}
                  onChange={(e) => onPlaceChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
                  className="w-full rounded-xl border border-[#C9A227]/20 bg-[#0A1A2F] px-4 py-2.5 text-sm text-[#F5F1E8] shadow-sm outline-none ring-[#C9A227]/30 transition focus:border-[#C9A227] focus:ring-2"
                />
                {geoLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A227]">
                    <Spinner className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
              {showSuggest && suggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#C9A227]/20 bg-[#0F2240] py-1 shadow-lg">
                  {suggestions.map((s, i) => {
                    const line = [s.city, s.country].filter(Boolean).join(", ");
                    return (
                      <li key={`${s.formattedAddress}-${i}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm text-[#F5F1E8] hover:bg-[#0A1A2F]"
                          onClick={() => {
                            setPlaceName(s.formattedAddress || line || DELHI.name);
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
          </form>
        </header>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setDate(todayYmd)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              dayToggle === "today"
                ? "bg-[#2A7D7B] text-white hover:bg-[#3A9D9B]"
                : "bg-[#0F2240] text-[#C7C2B4] ring-1 ring-[#C9A227]/20 hover:bg-[#0A1A2F]"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDate(tomorrowYmd)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              dayToggle === "tomorrow"
                ? "bg-[#2A7D7B] text-white hover:bg-[#3A9D9B]"
                : "bg-[#0F2240] text-[#C7C2B4] ring-1 ring-[#C9A227]/20 hover:bg-[#0A1A2F]"
            }`}
          >
            Tomorrow
          </button>
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-[#C7C2B4]">Loading Panchang…</p>
        ) : null}

        {error ? (
          <p className="mt-10 text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && detail ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Tithi", `${detail.tithi.paksha} ${detail.tithi.name}`],
                  ["Nakshatra", `${detail.nakshatra.name} (Pada ${detail.nakshatra.pada})`],
                  ["Yoga", detail.yoga.name],
                  ["Karana", detail.karana.name],
                  ["Vaar", `${detail.vaar.hindi} / ${detail.vaar.english}`],
                  ["Sunrise / Sunset", `${detail.sunrise} · ${detail.sunset}`],
                ] as const
              ).map(([label, value]) => (
                <article
                  key={label}
                  className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-lg shadow-black/30"
                >
                  <p className="text-sm font-semibold text-[#E0C158]">{label}</p>
                  <p className="mt-2 text-lg font-bold text-[#F5F1E8]">{value}</p>
                </article>
              ))}
            </section>

            <section className="mt-8 rounded-2xl border border-[#C9A227]/40 bg-[#0F2240] p-5 shadow-lg shadow-black/30">
              <h2 className="text-lg font-bold text-[#F5F1E8]">Inauspicious timings</h2>
              <p className="mt-1 text-xs text-[#C7C2B4]">Rahu Kaal, Yamaganda, and Gulika Kaal for this location</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Rahu Kaal", detail.rahuKaal],
                    ["Yamaganda", detail.yamaganda],
                    ["Gulika Kaal", detail.gulikaKaal],
                  ] as const
                ).map(([label, range]) => (
                  <li key={label} className="rounded-xl bg-[#0A1A2F] px-4 py-3">
                    <p className="text-sm font-semibold text-[#E0C158]">{label}</p>
                    <p className="mt-1 text-sm font-medium text-red-400">
                      {range.start} – {range.end}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8 rounded-2xl border border-[#C9A227]/40 bg-[#0F2240] p-5 shadow-lg shadow-black/30">
              <h2 className="text-lg font-bold text-[#F5F1E8]">Abhijit Muhurat</h2>
              <p className="mt-2 text-lg font-semibold text-[#E0C158]">
                {detail.abhijitMuhurat.start} – {detail.abhijitMuhurat.end}
              </p>
              <p className="mt-1 text-sm text-[#C7C2B4]">Solar-noon-centered muhurat for this date and place.</p>
            </section>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <Card title="Day Choghadiya">
                <ChoghadiyaTable rows={detail.choghadiya.day} />
              </Card>
              <Card title="Night Choghadiya">
                <ChoghadiyaTable rows={detail.choghadiya.night} />
              </Card>
            </div>

            <div className="mt-8">
              <Card title="Hora">
                <div className="max-h-[28rem] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[#0A1A2F] text-[#E0C158]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Start</th>
                        <th className="px-3 py-2 font-semibold">End</th>
                        <th className="px-3 py-2 font-semibold">Planet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.hora.map((row) => (
                        <tr key={`${row.start}-${row.end}-${row.planet}`} className="border-b border-[#C9A227]/10">
                          <td className="px-3 py-2 text-[#C7C2B4]">{row.start}</td>
                          <td className="px-3 py-2 text-[#C7C2B4]">{row.end}</td>
                          <td className="px-3 py-2 font-semibold text-[#F5F1E8]">{row.planet}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function ChoghadiyaTable({ rows }: { rows: ChoghadiyaRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#0A1A2F] text-[#E0C158]">
          <tr>
            <th className="px-3 py-2 font-semibold">Time</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period} className="border-b border-[#C9A227]/10">
              <td className="px-3 py-2 text-[#C7C2B4]">{row.period}</td>
              <td className={`px-3 py-2 font-semibold ${choghadiyaNatureClass(row.nature)}`}>
                {row.name}
              </td>
              <td className="px-3 py-2 text-[#C7C2B4]">{CHOGHADIYA_NOTE[row.name] ?? row.nature}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
