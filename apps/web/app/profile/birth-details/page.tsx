"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";

type GeocodeHit = {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress: string;
};

export default function BirthDetailsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gender, setGender] = useState("male");

  const [suggestions, setSuggestions] = useState<GeocodeHit[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pobRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent("/profile/birth-details")}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/birth-details", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json?.hasDetails && json?.data) {
          const d = json.data;
          setDob(d.dateOfBirth ?? "");
          setTob(d.timeOfBirth ?? "");
          setPlaceName(d.placeName ?? "");
          setLat(d.lat ?? null);
          setLng(d.lng ?? null);
          if (d.gender) setGender(d.gender);
        }
      } catch {
        // ignore — user just fills the form fresh
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (pobRef.current && !pobRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const onPlaceChange = useCallback((value: string) => {
    setPlaceName(value);
    setLat(null);
    setLng(null);
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
        const json = await res.json();
        const list = (json.results ?? [])
          .filter(
            (r: GeocodeHit) =>
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

  const canSubmit = dob.length > 0 && lat != null && lng != null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !token) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users/birth-details", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dateOfBirth: dob,
          timeOfBirth: tob || null,
          placeName,
          lat,
          lng,
          gender,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not save birth details");
        return;
      }
      setSaved(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09142a]">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <div className="h-64 animate-pulse rounded-2xl bg-[#0E1C3B]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09142a] pb-16">
      <Navbar />
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[#F5F1E8]">Your Birth Details</h1>
        <p className="mt-1 text-sm text-[#C7C2B4]">
          Used to generate your Kundli for astrology chats and readings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Date of birth
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-xl border border-[#b18d4f]/40 bg-white px-4 py-3 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Time of birth
            </label>
            <input
              type="time"
              value={tob}
              onChange={(e) => setTob(e.target.value)}
              className="w-full rounded-xl border border-[#b18d4f]/40 bg-white px-4 py-3 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 [color-scheme:light]"
            />
          </div>

          <div ref={pobRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Place of birth
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder="Search city or town"
              value={placeName}
              onChange={(e) => onPlaceChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              className="w-full rounded-xl border border-[#b18d4f]/40 bg-white px-4 py-3 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
            />
            {geoLoading ? (
              <div className="absolute right-3 top-[42px] text-xs text-[#b18d4f]">…</div>
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
                          setPlaceName(s.formattedAddress || line);
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
            {placeName && lat == null ? (
              <p className="mt-2 text-xs font-medium text-amber-400">
                ⚠️ Please select your city from the search suggestions above.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#C7C2B4]">
              Gender
            </label>
            <div className="flex gap-3">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-medium capitalize transition ${
                    gender === g
                      ? "border-[#b18d4f] bg-[#b18d4f]/10 text-[#C8AC80]"
                      : "border-[#b18d4f]/20 text-[#C7C2B4]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {saved ? (
            <p className="text-sm text-emerald-400">
              Saved! Your birth details are ready for AI Astrologer chats.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-3 text-sm font-semibold text-[#09142a] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save birth details"}
          </button>
        </form>
      </div>
    </div>
  );
}
