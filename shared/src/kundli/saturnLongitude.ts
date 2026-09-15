const J2000 = 2451545.0;

function normLon(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function lahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 365.25;
  return 23.85 + 0.013964 * T;
}

/** JS Saturn longitude used for Sade Sati transit (same formula as apps/web/lib/kundli/planets.ts). */
export function saturnLongitude(jd: number): number {
  const T = (jd - J2000) / 36525.0;
  const L = 50.077444 + 1223.5110686 * T + 0.00051397 * T * T;
  const M = normLon(317.02 + 1222.11 * T);
  const Mrad = toRad(M);
  const eq = 6.3585 * Math.sin(Mrad) + 0.2204 * Math.sin(2 * Mrad);
  return normLon(L + eq - lahiriAyanamsa(jd));
}
