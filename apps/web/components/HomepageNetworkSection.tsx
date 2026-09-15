import Link from "next/link";

import { HomepageQuickForms } from "@/components/HomepageQuickForms";
import { formatDisplayDate } from "@/lib/formatDate";

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
  const today = new Date();
  const todayLong = formatDisplayDate(today);
  const panchang = getPanchang(today);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <HomepageQuickForms />

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
