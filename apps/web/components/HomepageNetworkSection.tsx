"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { formatDisplayDate } from "@/lib/formatDate";

type GeocodeHit = {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress: string;
};

const tithiNames = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Purnima",
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Amavasya",
];

const nakshatraNames = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

const yogaNames = [
  "Vishkumbha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shoola",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyana",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
];

const karanNames = [
  "Bava",
  "Balava",
  "Kaulava",
  "Taitila",
  "Garija",
  "Vanija",
  "Vishti",
  "Shakuni",
  "Chatushpada",
  "Naga",
  "Kimstughna",
];

const rahukaalByDay = [
  "16:30 - 18:00",
  "07:30 - 09:00",
  "15:00 - 16:30",
  "12:00 - 13:30",
  "13:30 - 15:00",
  "10:30 - 12:00",
  "09:00 - 10:30",
];

function normalizeDegree(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getPanchang(date: Date) {
  const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const days = (utcDate - j2000) / 86400000;

  const sunLongitude = normalizeDegree(280.46 + 0.9856474 * days);
  const moonLongitude = normalizeDegree(218.316 + 13.176396 * days);
  const moonSunAngle = normalizeDegree(moonLongitude - sunLongitude);
  const tithiIndex = Math.floor(moonSunAngle / 12) % 30;
  const nakshatraIndex = Math.floor(moonLongitude / (360 / 27)) % 27;
  const yogaIndex = Math.floor(normalizeDegree(sunLongitude + moonLongitude) / (360 / 27)) % 27;
  const karanIndex = Math.floor(moonSunAngle / 6) % karanNames.length;

  return {
    tithi: tithiNames[tithiIndex],
    nakshatra: nakshatraNames[nakshatraIndex],
    yoga: yogaNames[yogaIndex],
    karan: karanNames[karanIndex],
    rahukaal: rahukaalByDay[date.getDay()],
  };
}

export function HomepageNetworkSection() {
  const router = useRouter();
  const [kundliForm, setKundliForm] = useState({
    name: "",
    gender: "male",
    date: "",
    time: "",
    place: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [matchForm, setMatchForm] = useState({
    name: "",
    date: "",
    time: "",
    place: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [kundliSuggestions, setKundliSuggestions] = useState<GeocodeHit[]>([]);
  const [kundliShowSuggest, setKundliShowSuggest] = useState(false);
  const [kundliGeoLoading, setKundliGeoLoading] = useState(false);
  const kundliDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kundliPobRef = useRef<HTMLDivElement>(null);

  const [matchSuggestions, setMatchSuggestions] = useState<GeocodeHit[]>([]);
  const [matchShowSuggest, setMatchShowSuggest] = useState(false);
  const [matchGeoLoading, setMatchGeoLoading] = useState(false);
  const matchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchPobRef = useRef<HTMLDivElement>(null);

  const onKundliPlaceChange = useCallback((value: string) => {
    setKundliForm((f) => ({ ...f, place: value, lat: null, lng: null }));
    if (kundliDebounceRef.current) clearTimeout(kundliDebounceRef.current);
    if (value.trim().length < 2) {
      setKundliSuggestions([]);
      setKundliShowSuggest(false);
      return;
    }
    kundliDebounceRef.current = setTimeout(async () => {
      setKundliGeoLoading(true);
      try {
        const res = await fetch(`/api/kundli/geocode?q=${encodeURIComponent(value.trim())}`);
        const json = (await res.json()) as { results?: GeocodeHit[]; error?: string };
        if (!res.ok) {
          setKundliSuggestions([]);
          return;
        }
        const list = (json.results ?? [])
          .filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && !Number.isNaN(r.lat) && !Number.isNaN(r.lng))
          .slice(0, 5);
        setKundliSuggestions(list);
        setKundliShowSuggest(list.length > 0);
      } catch {
        setKundliSuggestions([]);
      } finally {
        setKundliGeoLoading(false);
      }
    }, 400);
  }, []);

  const onMatchPlaceChange = useCallback((value: string) => {
    setMatchForm((f) => ({ ...f, place: value, lat: null, lng: null }));
    if (matchDebounceRef.current) clearTimeout(matchDebounceRef.current);
    if (value.trim().length < 2) {
      setMatchSuggestions([]);
      setMatchShowSuggest(false);
      return;
    }
    matchDebounceRef.current = setTimeout(async () => {
      setMatchGeoLoading(true);
      try {
        const res = await fetch(`/api/kundli/geocode?q=${encodeURIComponent(value.trim())}`);
        const json = (await res.json()) as { results?: GeocodeHit[]; error?: string };
        if (!res.ok) {
          setMatchSuggestions([]);
          return;
        }
        const list = (json.results ?? [])
          .filter((r) => typeof r.lat === "number" && typeof r.lng === "number" && !Number.isNaN(r.lat) && !Number.isNaN(r.lng))
          .slice(0, 5);
        setMatchSuggestions(list);
        setMatchShowSuggest(list.length > 0);
      } catch {
        setMatchSuggestions([]);
      } finally {
        setMatchGeoLoading(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (kundliPobRef.current && !kundliPobRef.current.contains(e.target as Node)) {
        setKundliShowSuggest(false);
      }
      if (matchPobRef.current && !matchPobRef.current.contains(e.target as Node)) {
        setMatchShowSuggest(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const today = new Date();
  const todayLong = formatDisplayDate(today);
  const panchang = getPanchang(today);

  const handleKundliSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({
      name: kundliForm.name,
      gender: kundliForm.gender,
      date: kundliForm.date,
      time: kundliForm.time,
      place: kundliForm.place,
      ...(kundliForm.lat != null ? { lat: String(kundliForm.lat) } : {}),
      ...(kundliForm.lng != null ? { lng: String(kundliForm.lng) } : {}),
    });
    router.push(`/kundli?${params.toString()}`);
  };

  const handleMatchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({
      boyName: matchForm.name,
      date: matchForm.date,
      time: matchForm.time,
      place: matchForm.place,
      ...(matchForm.lat != null ? { lat: String(matchForm.lat) } : {}),
      ...(matchForm.lng != null ? { lng: String(matchForm.lng) } : {}),
    });
    router.push(`/kundli/match?${params.toString()}`);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#b18d4f]/25 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md">
          <h3 className="text-lg font-bold text-[#C8AC80]">Kundli / Birth Chart</h3>
          <form className="mt-4 space-y-3" onSubmit={handleKundliSubmit}>
            <input
              type="text"
              placeholder="Name"
              value={kundliForm.name}
              onChange={(e) => setKundliForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
            />
            <select
              value={kundliForm.gender}
              onChange={(e) => setKundliForm((prev) => ({ ...prev, gender: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input
              type="date"
              value={kundliForm.date}
              onChange={(e) => setKundliForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
            />
            <input
              type="time"
              value={kundliForm.time}
              onChange={(e) => setKundliForm((prev) => ({ ...prev, time: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
            />
            <div ref={kundliPobRef} className="relative">
              <input
                type="text"
                placeholder="Place"
                autoComplete="off"
                value={kundliForm.place}
                onChange={(e) => onKundliPlaceChange(e.target.value)}
                onFocus={() => kundliSuggestions.length > 0 && setKundliShowSuggest(true)}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              />
              {kundliGeoLoading ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b18d4f]">
                  <span className="text-xs">...</span>
                </div>
              ) : null}
              {kundliShowSuggest && kundliSuggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#b18d4f]/30 bg-white py-1 shadow-lg">
                  {kundliSuggestions.map((s, i) => {
                    const line = [s.city, s.country].filter(Boolean).join(", ");
                    return (
                      <li key={`${s.formattedAddress}-${i}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm text-[#09142a] hover:bg-[#b18d4f]/10"
                          onClick={() => {
                            setKundliForm((f) => ({ ...f, place: s.formattedAddress || line, lat: s.lat!, lng: s.lng! }));
                            setKundliShowSuggest(false);
                            setKundliSuggestions([]);
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
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Get Kundli
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[#b18d4f]/25 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md">
          <h3 className="text-lg font-bold text-[#C8AC80]">Kundli Matching</h3>
          <form className="mt-4 space-y-3" onSubmit={handleMatchSubmit}>
            <input
              type="text"
              placeholder="Boy's Name"
              value={matchForm.name}
              onChange={(e) => setMatchForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
            />
            <input
              type="date"
              value={matchForm.date}
              onChange={(e) => setMatchForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
            />
            <input
              type="time"
              value={matchForm.time}
              onChange={(e) => setMatchForm((prev) => ({ ...prev, time: e.target.value }))}
              className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
            />
            <div ref={matchPobRef} className="relative">
              <input
                type="text"
                placeholder="Place"
                autoComplete="off"
                value={matchForm.place}
                onChange={(e) => onMatchPlaceChange(e.target.value)}
                onFocus={() => matchSuggestions.length > 0 && setMatchShowSuggest(true)}
                className="w-full rounded-lg border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              />
              {matchGeoLoading ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b18d4f]">
                  <span className="text-xs">...</span>
                </div>
              ) : null}
              {matchShowSuggest && matchSuggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#b18d4f]/30 bg-white py-1 shadow-lg">
                  {matchSuggestions.map((s, i) => {
                    const line = [s.city, s.country].filter(Boolean).join(", ");
                    return (
                      <li key={`${s.formattedAddress}-${i}`}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm text-[#09142a] hover:bg-[#b18d4f]/10"
                          onClick={() => {
                            setMatchForm((f) => ({ ...f, place: s.formattedAddress || line, lat: s.lat!, lng: s.lng! }));
                            setMatchShowSuggest(false);
                            setMatchSuggestions([]);
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
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
            >
              Continue
            </button>
            <Link
              href="/kundli/match"
              className="block text-center text-sm font-medium text-[#C8AC80] hover:underline"
            >
              Open full matching report
            </Link>
          </form>
        </div>

        <div className="rounded-2xl border border-[#b18d4f]/25 bg-[#0E1C3B] p-5 shadow-sm transition hover:shadow-md">
          <h3 className="text-lg font-bold text-[#C8AC80]">Today&apos;s Panchang</h3>
          <p className="mt-1 text-sm text-[#C7C2B4]">{todayLong}</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
              <span className="font-medium text-[#C7C2B4]">Tithi</span>
              <span className="font-semibold text-[#C8AC80]">{panchang.tithi}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
              <span className="font-medium text-[#C7C2B4]">Nakshatra</span>
              <span className="font-semibold text-[#C8AC80]">{panchang.nakshatra}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
              <span className="font-medium text-[#C7C2B4]">Yoga</span>
              <span className="font-semibold text-[#C8AC80]">{panchang.yoga}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
              <span className="font-medium text-[#C7C2B4]">Karan</span>
              <span className="font-semibold text-[#C8AC80]">{panchang.karan}</span>
            </p>
            <p className="flex items-center justify-between rounded-lg bg-[#122352] px-3 py-2">
              <span className="font-medium text-[#C7C2B4]">Rahukaal (Delhi)</span>
              <span className="font-semibold text-[#C8AC80]">{panchang.rahukaal}</span>
            </p>
          </div>
          <Link
            href="/panchang"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
          >
            Today Panchang
          </Link>
        </div>
      </div>
    </section>
  );
}
