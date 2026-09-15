import {
  LUCKY_MAP,
  PLANET_REMEDIES,
  PROFESSION_MAP,
  signKey,
} from "../kundliLookups";
import type { KundliCalculateResponse } from "../types";

import { SectionTitle } from "./SectionTitle";

export function KundliInsights({ result }: { result: KundliCalculateResponse }) {
  const lagnaKey = signKey(result.basicInfo.ascendant.rashi);
  const moonKey = signKey(result.basicInfo.moonSign.rashi);
  const sunKey = signKey(result.basicInfo.sunSign.rashi);
  const tenthSign = signKey(result.houses[9]?.rashi ?? "");
  const luckyProfile = LUCKY_MAP[lagnaKey] ?? LUCKY_MAP.Mesh;
  const recommendedProfessions = PROFESSION_MAP[tenthSign] ?? PROFESSION_MAP.Mesh;
  const weakPlanets = result.planets
    .filter((p) => p.isDebilitated || ([6, 8, 12].includes(p.house) && !p.isExalted))
    .slice(0, 3);
  const remedyPlanets = weakPlanets.length ? weakPlanets : result.planets.slice(0, 2);

  return (
    <>
      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:break-inside-avoid print:mb-6">
        <SectionTitle>Detailed Personality Analysis</SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-[#C7C2B4]">
          <p>
            Your Lagna in <span className="font-semibold">{result.basicInfo.ascendant.rashi}</span> defines
            how you project yourself to the world. This gives your natural approach to decisions, confidence,
            and physical vitality. The Lagna lord also shapes your long-term life direction and resilience.
          </p>
          <p>
            Your Moon sign in <span className="font-semibold">{result.basicInfo.moonSign.rashi}</span> shows
            emotional needs, inner comfort zones, and relationship response patterns. It indicates how you
            process stress, connect with loved ones, and seek mental peace in day-to-day life.
          </p>
          <p>
            Your Sun sign in <span className="font-semibold">{result.basicInfo.sunSign.rashi}</span> reveals
            your core purpose, authority style, and confidence in the public sphere. The combination of{" "}
            <span className="font-semibold">{lagnaKey}</span>, <span className="font-semibold">{moonKey}</span>,
            and <span className="font-semibold">{sunKey}</span> creates a balanced signature of action,
            emotion, and identity that can be refined into a powerful personal brand.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:break-inside-avoid print:mb-6">
        <SectionTitle>Career &amp; Finance Deep Dive</SectionTitle>
        <p className="text-sm leading-relaxed text-[#C7C2B4]">
          Your 10th house in <span className="font-semibold">{result.houses[9].rashi}</span> and wealth axis
          (2nd/11th houses) indicate a path of sustained growth through skill-building and strategic timing.
          Career opportunities increase notably during supportive dasha phases, while finances improve through
          diversified income streams and disciplined long-term investing.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendedProfessions.map((profession) => (
            <span
              key={profession}
              className="rounded-full bg-[#b18d4f]/20 px-3 py-1 text-xs font-medium text-[#C8AC80]"
            >
              {profession}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:break-inside-avoid print:mb-6">
        <SectionTitle>Love &amp; Marriage Analysis</SectionTitle>
        <p className="text-sm leading-relaxed text-[#C7C2B4]">
          Your 7th house in <span className="font-semibold">{result.houses[6].rashi}</span> suggests a
          relationship pattern that matures with emotional clarity and commitment readiness. Marriage timing
          is generally stronger during benefic dasha-antardasha windows and when Venus/Jupiter transits support
          your 7th house axis. Spouse energy appears {result.houses[6].lord}-influenced: loyal in commitment,
          value-driven in partnership, and more compatible with emotionally mature communication.
        </p>
      </section>

      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:break-inside-avoid print:mb-6">
        <SectionTitle>Health &amp; Wellness Guide</SectionTitle>
        <p className="text-sm leading-relaxed text-[#C7C2B4]">
          Focus on body zones indicated by your Lagna and 6th house for preventive wellness. Prioritize routine
          sleep, hydration, gut care, and stress regulation through yoga, pranayama, and weekly detox habits.
          Regular checkups around vulnerable areas reduce long-term risk and keep vitality high.
        </p>
        <p className="mt-2 text-sm text-[#C7C2B4]">
          Key watch areas: {result.predictions.health}
        </p>
      </section>

      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:break-inside-avoid print:mb-6">
        <SectionTitle>Lucky Numbers, Colors &amp; Gems</SectionTitle>
        <ul className="space-y-2 text-sm text-[#C7C2B4]">
          <li>
            <span className="font-semibold text-[#C8AC80]">Lucky Number:</span>{" "}
            {result.basicInfo.numerologyNumber}
          </li>
          <li>
            <span className="font-semibold text-[#C8AC80]">Lucky Colors:</span>{" "}
            {luckyProfile.colors.join(", ")}
          </li>
          <li>
            <span className="font-semibold text-[#C8AC80]">Lucky Days:</span>{" "}
            {luckyProfile.days.join(", ")}
          </li>
          <li>
            <span className="font-semibold text-[#C8AC80]">Gemstone:</span> {luckyProfile.gemstone}
          </li>
          <li>
            <span className="font-semibold text-[#C8AC80]">Wearing Instruction:</span>{" "}
            {luckyProfile.instruction}
          </li>
          <li>
            <span className="font-semibold text-[#C8AC80]">Rudraksha:</span> {luckyProfile.rudraksha}
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:break-inside-avoid print:mb-6">
        <SectionTitle>Remedies &amp; Upay</SectionTitle>
        <div className="space-y-4">
          {remedyPlanets.map((planet) => {
            const remedy = PLANET_REMEDIES[planet.name];
            if (!remedy) return null;
            return (
              <div
                key={planet.name}
                className="rounded-xl border border-[#b18d4f]/20 bg-[#09142a]/40 p-4 print:break-inside-avoid"
              >
                <p className="text-sm font-semibold text-[#C8AC80]">{planet.name} Remedies</p>
                <p className="mt-1 text-sm text-[#C7C2B4]">
                  <span className="font-medium">Mantra:</span> {remedy.mantra}
                </p>
                <p className="text-sm text-[#C7C2B4]">
                  <span className="font-medium">Daan:</span> {remedy.donation}
                </p>
                <p className="text-sm text-[#C7C2B4]">
                  <span className="font-medium">Fasting:</span> {remedy.fasting}
                </p>
                <p className="text-sm text-[#C7C2B4]">
                  <span className="font-medium">Temple Visit:</span> {remedy.temple}
                </p>
                <p className="text-sm text-[#C7C2B4]">
                  <span className="font-medium">Wear/Avoid Colors:</span> {remedy.colors}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
