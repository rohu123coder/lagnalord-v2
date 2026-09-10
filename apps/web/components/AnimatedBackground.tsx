import type { CSSProperties } from "react";

const STARS = [
  { left: 4, top: 8, size: 1.5, color: "#F5F1E8", min: 0.15, max: 0.32, rest: 0.22, delay: "0s", duration: "2.6s" },
  { left: 11, top: 22, size: 1, color: "#C8AC80", min: 0.18, max: 0.38, rest: 0.26, delay: "0.4s", duration: "3.4s" },
  { left: 18, top: 6, size: 2, color: "#F5F1E8", min: 0.16, max: 0.36, rest: 0.24, delay: "1.1s", duration: "4.1s" },
  { left: 23, top: 41, size: 1, color: "#C8AC80", min: 0.15, max: 0.3, rest: 0.2, delay: "1.8s", duration: "2.9s" },
  { left: 7, top: 58, size: 1.5, color: "#F5F1E8", min: 0.2, max: 0.4, rest: 0.28, delay: "0.7s", duration: "3.8s" },
  { left: 14, top: 74, size: 1, color: "#C8AC80", min: 0.15, max: 0.34, rest: 0.22, delay: "2.2s", duration: "4.6s" },
  { left: 9, top: 91, size: 2, color: "#F5F1E8", min: 0.17, max: 0.35, rest: 0.24, delay: "0.2s", duration: "3.1s" },
  { left: 31, top: 14, size: 1, color: "#C8AC80", min: 0.18, max: 0.4, rest: 0.27, delay: "1.5s", duration: "2.4s" },
  { left: 38, top: 33, size: 1.5, color: "#F5F1E8", min: 0.15, max: 0.31, rest: 0.21, delay: "2.8s", duration: "3.7s" },
  { left: 28, top: 52, size: 1, color: "#C8AC80", min: 0.16, max: 0.36, rest: 0.24, delay: "0.9s", duration: "4.3s" },
  { left: 35, top: 68, size: 2, color: "#F5F1E8", min: 0.18, max: 0.38, rest: 0.26, delay: "1.9s", duration: "2.8s" },
  { left: 42, top: 86, size: 1, color: "#C8AC80", min: 0.15, max: 0.33, rest: 0.22, delay: "0.3s", duration: "3.5s" },
  { left: 48, top: 11, size: 1.5, color: "#F5F1E8", min: 0.2, max: 0.4, rest: 0.28, delay: "2.4s", duration: "4.8s" },
  { left: 54, top: 27, size: 1, color: "#C8AC80", min: 0.16, max: 0.32, rest: 0.23, delay: "1.2s", duration: "3.2s" },
  { left: 46, top: 48, size: 2, color: "#F5F1E8", min: 0.15, max: 0.34, rest: 0.22, delay: "0.6s", duration: "2.7s" },
  { left: 52, top: 63, size: 1, color: "#C8AC80", min: 0.18, max: 0.37, rest: 0.25, delay: "3.1s", duration: "4.0s" },
  { left: 58, top: 81, size: 1.5, color: "#F5F1E8", min: 0.17, max: 0.36, rest: 0.24, delay: "1.7s", duration: "3.6s" },
  { left: 63, top: 5, size: 1, color: "#C8AC80", min: 0.15, max: 0.3, rest: 0.2, delay: "2.6s", duration: "2.5s" },
  { left: 69, top: 19, size: 2, color: "#F5F1E8", min: 0.19, max: 0.39, rest: 0.27, delay: "0.8s", duration: "4.4s" },
  { left: 61, top: 39, size: 1, color: "#C8AC80", min: 0.16, max: 0.35, rest: 0.23, delay: "2.0s", duration: "3.3s" },
  { left: 72, top: 46, size: 1.5, color: "#F5F1E8", min: 0.15, max: 0.32, rest: 0.21, delay: "1.4s", duration: "2.2s" },
  { left: 66, top: 71, size: 1, color: "#C8AC80", min: 0.18, max: 0.4, rest: 0.26, delay: "0.1s", duration: "3.9s" },
  { left: 73, top: 88, size: 2, color: "#F5F1E8", min: 0.17, max: 0.34, rest: 0.24, delay: "2.9s", duration: "4.7s" },
  { left: 79, top: 9, size: 1, color: "#C8AC80", min: 0.15, max: 0.31, rest: 0.21, delay: "1.6s", duration: "2.3s" },
  { left: 86, top: 24, size: 1.5, color: "#F5F1E8", min: 0.2, max: 0.38, rest: 0.28, delay: "0.5s", duration: "3.0s" },
  { left: 81, top: 42, size: 1, color: "#C8AC80", min: 0.16, max: 0.36, rest: 0.24, delay: "2.3s", duration: "4.2s" },
  { left: 88, top: 57, size: 2, color: "#F5F1E8", min: 0.15, max: 0.33, rest: 0.22, delay: "1.0s", duration: "2.8s" },
  { left: 84, top: 76, size: 1, color: "#C8AC80", min: 0.18, max: 0.37, rest: 0.25, delay: "3.3s", duration: "3.5s" },
  { left: 92, top: 93, size: 1.5, color: "#F5F1E8", min: 0.17, max: 0.35, rest: 0.24, delay: "0.4s", duration: "4.5s" },
  { left: 96, top: 13, size: 1, color: "#C8AC80", min: 0.15, max: 0.4, rest: 0.23, delay: "2.1s", duration: "3.1s" },
  { left: 94, top: 35, size: 1.5, color: "#F5F1E8", min: 0.19, max: 0.36, rest: 0.26, delay: "1.3s", duration: "2.6s" },
  { left: 97, top: 64, size: 1, color: "#C8AC80", min: 0.16, max: 0.32, rest: 0.22, delay: "2.7s", duration: "3.8s" },
  { left: 3, top: 36, size: 1, color: "#F5F1E8", min: 0.15, max: 0.34, rest: 0.21, delay: "1.8s", duration: "4.9s" },
  { left: 21, top: 83, size: 1.5, color: "#C8AC80", min: 0.18, max: 0.38, rest: 0.26, delay: "0.6s", duration: "2.5s" },
  { left: 44, top: 3, size: 1, color: "#F5F1E8", min: 0.17, max: 0.35, rest: 0.24, delay: "3.0s", duration: "3.4s" },
  { left: 57, top: 94, size: 2, color: "#C8AC80", min: 0.15, max: 0.31, rest: 0.2, delay: "1.1s", duration: "4.1s" },
  { left: 76, top: 61, size: 1, color: "#F5F1E8", min: 0.2, max: 0.4, rest: 0.28, delay: "2.5s", duration: "2.9s" },
  { left: 16, top: 47, size: 1.5, color: "#C8AC80", min: 0.16, max: 0.33, rest: 0.23, delay: "0.9s", duration: "3.6s" },
  { left: 40, top: 59, size: 1, color: "#F5F1E8", min: 0.15, max: 0.36, rest: 0.22, delay: "1.7s", duration: "4.4s" },
  { left: 67, top: 29, size: 1.5, color: "#C8AC80", min: 0.18, max: 0.37, rest: 0.25, delay: "0.3s", duration: "3.2s" },
  { left: 90, top: 48, size: 1, color: "#F5F1E8", min: 0.17, max: 0.34, rest: 0.24, delay: "2.2s", duration: "2.7s" },
  { left: 50, top: 72, size: 2, color: "#C8AC80", min: 0.15, max: 0.32, rest: 0.21, delay: "1.5s", duration: "3.9s" },
] as const;

export function AnimatedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#09142a]" />
      <div
        className="animate-nebula-drift absolute -inset-[18%] opacity-70"
        style={{
          background: [
            "radial-gradient(ellipse 55% 45% at 28% 38%, #122352 0%, transparent 58%)",
            "radial-gradient(ellipse 50% 60% at 74% 62%, #0E1C3B 0%, transparent 62%)",
            "radial-gradient(ellipse 40% 35% at 62% 18%, #122352 0%, transparent 55%)",
          ].join(", "),
        }}
      />
      {STARS.map((star, i) => (
        <span
          key={i}
          className="animate-star-twinkle absolute rounded-full"
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              opacity: star.rest,
              animationDelay: star.delay,
              animationDuration: star.duration,
              "--star-min": String(star.min),
              "--star-max": String(star.max),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
