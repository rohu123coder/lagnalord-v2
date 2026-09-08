"use client";

import { useId, useMemo } from "react";
import { planetInfo } from "@/lib/kundli/ephemerisUtils";
import type { KundliCalculateResponse, KundliChartPayload } from "../types";

const VB = { w: 400, h: 400 };
/** Scale gist coords (y in 0–300) to 400×400 viewBox */
const sy = (y: number) => (y * VB.h) / 300;

/** North Indian diamond chart — polygon layout (standard construction), houses 1–12 */
const HOUSE_POLYGONS: [number, number][][] = [
  // 1 — top kendra (Lagna)
  [
    [100, 75],
    [200, 150],
    [300, 75],
    [200, 0],
  ],
  // 2
  [
    [0, 0],
    [100, 75],
    [200, 0],
  ],
  // 3
  [
    [0, 0],
    [0, 150],
    [100, 75],
  ],
  // 4
  [
    [0, 150],
    [100, 225],
    [200, 150],
    [100, 75],
  ],
  // 5
  [
    [0, 150],
    [0, 300],
    [100, 225],
  ],
  // 6
  [
    [0, 300],
    [100, 225],
    [200, 300],
  ],
  // 7 — bottom kendra
  [
    [100, 225],
    [200, 300],
    [300, 225],
    [200, 150],
  ],
  // 8
  [
    [300, 225],
    [200, 300],
    [400, 300],
  ],
  // 9
  [
    [300, 225],
    [400, 300],
    [400, 150],
  ],
  // 10 — right kendra
  [
    [300, 75],
    [200, 150],
    [300, 225],
    [400, 150],
  ],
  // 11
  [
    [300, 75],
    [400, 150],
    [400, 0],
  ],
  // 12
  [
    [200, 0],
    [300, 75],
    [400, 0],
  ],
];

const HOUSE_CENTERS: [number, number][] = [
  [190, 75],
  [100, 30],
  [30, 75],
  [90, 150],
  [30, 225],
  [90, 278],
  [190, 225],
  [290, 278],
  [360, 225],
  [290, 150],
  [360, 75],
  [290, 30],
];

const PLANET_SHORT: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

const OUTER_PLANET_COLORS: Record<string, string> = {
  Uranus: "#38bdf8",
  Neptune: "#818cf8",
  Pluto: "#a3a3a3",
};

/** Pale semantic colors that wash out on cream #F5F1E8 — darker same-hue substitutes for light variant only. */
const LIGHT_PLANET_OVERRIDES: Record<string, string> = {
  Sun: "#b45309",
  Moon: "#475569",
  Mercury: "#15803d",
  Jupiter: "#a16207",
  Uranus: "#0369a1",
  Neptune: "#4f46e5",
  Pluto: "#525252",
};

export type KundliChartVariant = "dark" | "light";

const CHART_THEMES = {
  dark: {
    cardClass:
      "rounded-2xl border border-[#b18d4f]/20 bg-gradient-to-br from-[#0E1C3B] to-[#09142a] p-2 shadow-lg shadow-black/40",
    titleClass:
      "mb-3 text-center text-xs font-medium uppercase tracking-wider text-[#C8AC80]",
    boardFill: "#09142a",
    edgeStart: "#b18d4f",
    edgeStartOpacity: 0.35,
    edgeEnd: "#09142a",
    edgeEndOpacity: 0.5,
    houseFillStart: "#122352",
    houseFillEnd: "#0E1C3B",
    houseStroke: "#b18d4f",
    houseStrokeOpacity: 0.45,
    rashi: "#C7C2B4",
    planetFallback: "#C7C2B4",
    retrograde: "#b18d4f",
  },
  light: {
    cardClass:
      "rounded-2xl border border-[#b18d4f]/40 bg-gradient-to-br from-[#FFFFFF] to-[#F5F1E8] p-2 shadow-lg shadow-black/10",
    titleClass:
      "mb-3 text-center text-xs font-medium uppercase tracking-wider text-[#78543a]",
    boardFill: "#F5F1E8",
    edgeStart: "#b18d4f",
    edgeStartOpacity: 0.6,
    edgeEnd: "#F5F1E8",
    edgeEndOpacity: 0.5,
    houseFillStart: "#FFFFFF",
    houseFillEnd: "#F5F1E8",
    houseStroke: "#b18d4f",
    houseStrokeOpacity: 0.7,
    rashi: "#09142a",
    planetFallback: "#4B5563",
    retrograde: "#78543a",
  },
} as const;

function toPath(points: [number, number][]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${sy(y)}`)
    .join(" ") + " Z";
}

export function KundliChart({
  chartData,
  planets,
  className = "",
  variant = "dark",
}: {
  chartData: KundliChartPayload;
  planets: KundliCalculateResponse["planets"];
  className?: string;
  variant?: KundliChartVariant;
}) {
  const reactId = useId();
  const gid = useMemo(() => `kc${reactId.replace(/:/g, "")}`, [reactId]);
  const houseFillId = `${gid}-houseFill`;
  const edgeGlowId = `${gid}-edgeGlow`;
  const theme = CHART_THEMES[variant];

  const byHouse = useMemo(() => {
    const map: Record<number, { short: string; degree: number; retro: boolean; color: string }[]> = {};
    for (let h = 1; h <= 12; h++) map[h] = [];
    for (const p of planets) {
      const short = PLANET_SHORT[p.name] ?? p.name.slice(0, 2);
      if (!map[p.house]) map[p.house] = [];
      let color: string = theme.planetFallback;
      if (OUTER_PLANET_COLORS[p.name]) {
        color = OUTER_PLANET_COLORS[p.name];
      } else {
        try {
          color = planetInfo(p.name as Parameters<typeof planetInfo>[0]).color;
        } catch {}
      }
      if (variant === "light" && LIGHT_PLANET_OVERRIDES[p.name]) {
        color = LIGHT_PLANET_OVERRIDES[p.name];
      }
      map[p.house].push({ short, degree: p.degree, retro: p.isRetrograde, color });
    }
    return map;
  }, [planets, theme.planetFallback, variant]);

  return (
    <div className={`${theme.cardClass} ${className}`}>
      <p className={theme.titleClass}>
        Lagna Chart (D1)
      </p>
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="mx-auto h-auto w-full max-w-[460px]"
        role="img"
        aria-label="Lagna Chart (D1) — North Indian style Vedic birth chart"
      >
        <defs>
          <linearGradient id={houseFillId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.houseFillStart} />
            <stop offset="100%" stopColor={theme.houseFillEnd} />
          </linearGradient>
          <linearGradient id={edgeGlowId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.edgeStart} stopOpacity={theme.edgeStartOpacity} />
            <stop offset="100%" stopColor={theme.edgeEnd} stopOpacity={theme.edgeEndOpacity} />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={VB.w}
          height={VB.h}
          rx="12"
          fill={theme.boardFill}
          stroke={`url(#${edgeGlowId})`}
          strokeWidth="2"
        />

        {HOUSE_POLYGONS.map((pts, i) => (
          <path
            key={i}
            d={toPath(pts)}
            fill={`url(#${houseFillId})`}
            stroke={theme.houseStroke}
            strokeOpacity={theme.houseStrokeOpacity}
            strokeWidth="1.25"
          />
        ))}

        {HOUSE_CENTERS.map(([cx, cy], i) => {
          const houseNum = i + 1;
          const rashi = chartData.houseRashis[i] ?? "";
          const rashiShort = rashi.split(" (")[0];
          const planetsInHouse = byHouse[houseNum] ?? [];
          const KENDRA_HOUSES = new Set([1, 4, 7, 10]);
          const useGrid = planetsInHouse.length >= 3 && KENDRA_HOUSES.has(houseNum);
          return (
            <g key={houseNum}>
              <text
                x={cx}
                y={sy(cy) - 8}
                textAnchor="middle"
                style={{ fontSize: 10, fontWeight: 400 }}
              >
                {rashiShort ? (
                  <tspan style={{ fill: theme.rashi }}>{rashiShort}</tspan>
                ) : null}
              </text>
              {planetsInHouse.map((item, idx) => {
                const row = useGrid ? Math.floor(idx / 2) : idx;
                const col = useGrid ? idx % 2 : 0;
                const xOffset = useGrid ? (col === 0 ? -15 : 15) : 0;
                const yPos = sy(cy) + 8 + row * 17;
                return (
                  <text
                    key={`${houseNum}-${idx}`}
                    x={cx + xOffset}
                    y={yPos}
                    textAnchor="middle"
                    style={{ fontSize: 14, fontWeight: 700, fill: item.color }}
                  >
                    {item.short}
                    <tspan style={{ fontSize: 8, fontWeight: 600 }} dy="-5">
                      {item.degree}
                    </tspan>
                    {item.retro ? (
                      <tspan style={{ fontSize: 8, fontWeight: 600, fill: theme.retrograde }} dy="0">
                        {" "}℞
                      </tspan>
                    ) : null}
                  </text>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
