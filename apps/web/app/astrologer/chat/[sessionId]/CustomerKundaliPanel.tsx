"use client";

import { useEffect, useState } from "react";

interface KundaliData {
  ascendant: { rashi: string; rashiIndex?: number; degree: number; longitude?: number };
  moonSign: { rashi: string; rashiIndex?: number; degree: number };
  sunSign: { rashi: string; rashiIndex?: number; degree: number };
  nakshatra: { name: string; lord: string; pada: number };
  planets: Array<{ name: string; longitude: number; rashi: string; rashiIndex?: number }>;
  approximate: boolean;
}

interface CustomerKundaliResponse {
  hasDetails: boolean;
  customer: {
    name: string;
    dateOfBirth?: string;
    timeOfBirth?: string | null;
    placeName?: string | null;
    gender?: string | null;
  };
  kundali?: KundaliData;
  message?: string;
}

interface Props {
  sessionId: string;
  authToken: string;
  apiBase: string;
}

export default function CustomerKundaliPanel({ sessionId, authToken, apiBase }: Props) {
  const [data, setData] = useState<CustomerKundaliResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchKundali() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${apiBase}/api/astrologer/sessions/${sessionId}/customer-kundli`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }

        const json = (await res.json()) as CustomerKundaliResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Unknown error";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (sessionId && authToken) {
      fetchKundali();
    }

    return () => {
      cancelled = true;
    };
  }, [sessionId, authToken, apiBase]);

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-[#C7C2B4]">
        Loading kundali...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-red-400">
        Error: {error}
      </div>
    );
  }

  if (!data) return null;

  if (!data.hasDetails) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <h3 className="mb-2 font-semibold text-orange-300">
            🎂 Birth Details Required
          </h3>
          <p className="text-sm text-orange-200">
            {data.customer.name} ne abhi tak birth details share nahi ki hain.
          </p>
          <p className="mt-2 text-xs text-orange-200/70">
            Chat mein customer se DOB, time, aur place pucho.
          </p>
        </div>
      </div>
    );
  }

  const k = data.kundali!;
  const c = data.customer;

  return (
    <div className="space-y-3 overflow-y-auto p-4">
      <div className="rounded-lg border border-[#b18d4f]/30 bg-[#b18d4f]/10 p-3">
        <h3 className="font-semibold text-[#C8AC80]">{c.name}</h3>
        <div className="mt-1 space-y-0.5 text-xs text-[#C7C2B4]">
          {c.dateOfBirth && (
            <div>📅 {new Date(c.dateOfBirth).toLocaleDateString("en-IN")}</div>
          )}
          {c.timeOfBirth && <div>🕐 {c.timeOfBirth}</div>}
          {c.placeName && <div>📍 {c.placeName}</div>}
          {c.gender && <div>👤 {c.gender}</div>}
        </div>
        {k.approximate && (
          <div className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            ⚠️ Time of birth missing — ascendant approximate
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SignCard
          label="Sun"
          emoji="☀️"
          rashi={k.sunSign.rashi}
          degree={k.sunSign.degree}
          color="orange"
        />
        <SignCard
          label="Moon"
          emoji="🌙"
          rashi={k.moonSign.rashi}
          degree={k.moonSign.degree}
          color="blue"
        />
        <SignCard
          label="Asc"
          emoji="⬆️"
          rashi={k.ascendant.rashi}
          degree={k.ascendant.degree}
          color="purple"
        />
      </div>

      <div className="rounded-lg border border-[#2A7D7B]/30 bg-[#2A7D7B]/10 p-3">
        <div className="mb-1 text-xs text-[#3A9D9B]">⭐ Nakshatra</div>
        <div className="font-semibold text-[#F5F1E8]">{k.nakshatra.name}</div>
        <div className="mt-1 text-xs text-[#3A9D9B]">
          Lord: <span className="font-medium">{k.nakshatra.lord}</span> • Pada:{" "}
          {k.nakshatra.pada}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#b18d4f]/20 bg-[#0E1C3B]">
        <div className="border-b border-[#b18d4f]/20 bg-[#09142a] px-3 py-2 text-xs font-semibold text-[#C8AC80]">
          🪐 Planetary Positions
        </div>
        <table className="w-full text-xs">
          <tbody>
            {k.planets.map((p) => (
              <tr key={p.name} className="border-b border-[#b18d4f]/10 last:border-0">
                <td className="px-3 py-1.5 font-medium text-[#F5F1E8]">{p.name}</td>
                <td className="px-3 py-1.5 text-[#C7C2B4]">{p.rashi}</td>
                <td className="px-3 py-1.5 text-right text-[#C7C2B4]/70">
                  {p.longitude.toFixed(2)}°
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[#b18d4f]/20 bg-[#09142a] p-3 text-center text-xs text-[#C7C2B4]">
        🔮 Mahadasha details coming soon
      </div>
    </div>
  );
}

function SignCard({
  label,
  emoji,
  rashi,
  degree,
  color,
}: {
  label: string;
  emoji: string;
  rashi: string;
  degree: number;
  color: "orange" | "blue" | "purple";
}) {
  const colorClasses = {
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-300",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    purple: "bg-[#2A7D7B]/10 border-[#2A7D7B]/30 text-[#3A9D9B]",
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg border p-2 text-center`}>
      <div className="text-lg">{emoji}</div>
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="mt-0.5 text-xs font-semibold">{rashi}</div>
      <div className="text-[10px] opacity-60">{degree.toFixed(1)}°</div>
    </div>
  );
}
