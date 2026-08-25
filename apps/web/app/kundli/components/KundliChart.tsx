"use client";

import { useMemo } from "react";
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

/** Finds the top-left-most vertex of a house polygon, then nudges it
 * toward the house center so the label sits inside the shape near its
 * corner instead of exactly on the boundary line. */
function cornerLabelPos(
  pts: [number, number][],
  center: [number, number]
): [number, number] {
  let best = pts[0];
  let bestScore = pts[0][0] + pts[0][1];
  for (const p of pts) {
    const score = p[0] + p[1];
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  const dx = center[0] - best[0];
  const dy = center[1] - best[1];
  const t = 0.22;
  return [best[0] + dx * t, best[1] + dy * t];
}

const HOUSE_LABEL_POS: [number, number][] = HOUSE_POLYGONS.map((pts, i) =>
  cornerLabelPos(pts, HOUSE_CENTERS[i])
);

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

function toPath(points: [number, number][]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${sy(y)}`)
    .join(" ") + " Z";
}

export function KundliChart({
  chartData,
  planets,
  className = "",
}: {
  chartData: KundliChartPayload;
  planets: KundliCalculateResponse["planets"];
  className?: string;
}) {
  const byHouse = useMemo(() => {
    const map: Record<number, { short: string; degree: number; retro: boolean; color: string }[]> = {};
    for (let h = 1; h <= 12; h++) map[h] = [];
    for (const p of planets) {
      const short = PLANET_SHORT[p.name] ?? p.name.slice(0, 2);
      if (!map[p.house]) map[p.house] = [];
      let color = "#2A7D7B";
      if (OUTER_PLANET_COLORS[p.name]) {
        color = OUTER_PLANET_COLORS[p.name];
      } else {
        try {
          color = planetInfo(p.name as Parameters<typeof planetInfo>[0]).color;
        } catch {}
      }
      map[p.house].push({ short, degree: p.degree, retro: p.isRetrograde, color });
    }
    return map;
  }, [planets]);

  return (
    <div
      className={`rounded-2xl border border-[#C9A227]/20 bg-gradient-to-br from-[#0F2240] to-[#0A1A2F] p-4 shadow-lg shadow-black/40 ${className}`}
    >
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-[#E0C158]">
        North Indian (D1) · Whole sign
      </p>
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="mx-auto h-auto w-full max-w-[400px]"
        role="img"
        aria-label="North Indian style Vedic birth chart"
      >
        <defs>
          <linearGradient id="houseFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#13294B" />
            <stop offset="100%" stopColor="#0F2240" />
          </linearGradient>
          <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C9A227" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0A1A2F" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={VB.w}
          height={VB.h}
          rx="12"
          fill="#0A1A2F"
          stroke="url(#edgeGlow)"
          strokeWidth="2"
        />

        {HOUSE_POLYGONS.map((pts, i) => (
          <path
            key={i}
            d={toPath(pts)}
            fill="url(#houseFill)"
            stroke="#C9A227"
            strokeOpacity={0.45}
            strokeWidth="1.25"
          />
        ))}

        {HOUSE_CENTERS.map(([cx, cy], i) => {
          const houseNum = i + 1;
          const rashi = chartData.houseRashis[i] ?? "";
          const rashiShort = rashi.split(" (")[0];
          const planetsInHouse = byHouse[houseNum] ?? [];
          const useGrid = planetsInHouse.length >= 3;
          return (
            <g key={houseNum}>
              <text
                x={HOUSE_LABEL_POS[i][0]}
                y={sy(HOUSE_LABEL_POS[i][1])}
                textAnchor="middle"
                style={{ fontSize: 9, fontWeight: 400 }}
              >
                <tspan className="fill-[#C7C2B4]">{houseNum}</tspan>
                {rashiShort ? (
                  <tspan className="fill-[#8A93A6]" style={{ fontSize: 8 }}>
                    {" "}
                    {rashiShort}
                  </tspan>
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
                      <tspan style={{ fontSize: 8, fontWeight: 600, fill: "#C9A227" }} dy="0">
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
