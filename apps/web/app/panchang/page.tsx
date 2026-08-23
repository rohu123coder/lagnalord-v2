import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: tenantPageTitle("Today's Panchang"),
  description:
    "View today's Panchang with tithi, nakshatra, yoga, rahukaal, sunrise, shubh muhurat, festivals, and choghadiya timings.",
};

const choghadiya = [
  { period: "06:08 AM - 07:38 AM", type: "Amrit", note: "Highly auspicious" },
  { period: "07:38 AM - 09:08 AM", type: "Kaal", note: "Avoid important work" },
  { period: "09:08 AM - 10:38 AM", type: "Shubh", note: "Good for starts" },
  { period: "10:38 AM - 12:08 PM", type: "Rog", note: "Not preferred" },
  { period: "12:08 PM - 01:38 PM", type: "Udveg", note: "Mixed outcomes" },
  { period: "01:38 PM - 03:08 PM", type: "Char", note: "Travel and movement" },
  { period: "03:08 PM - 04:38 PM", type: "Labh", note: "Good for gains" },
  { period: "04:38 PM - 06:09 PM", type: "Amrit", note: "Very favorable" },
];

export default function PanchangPage() {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0F2240] to-[#0A1A2F]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-3xl font-extrabold text-[#F5F1E8] sm:text-4xl">
            Today&apos;s Panchang
          </h1>
          <p className="mt-2 text-sm text-[#C7C2B4]">{today} | Delhi, India</p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Tithi", "Shukla Ekadashi"],
            ["Paksha", "Shukla Paksha"],
            ["Nakshatra", "Anuradha"],
            ["Yoga", "Siddhi"],
            ["Karan", "Bava"],
            ["Festivals / Vrats", "Ekadashi Vrat"],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-[#E0C158]">{label}</p>
              <p className="mt-2 text-lg font-bold text-[#F5F1E8]">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#F5F1E8]">Inauspicious Timings</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#C7C2B4]">
              <li>
                <span className="font-semibold text-[#E0C158]">Rahukaal:</span> 10:30
                AM - 12:00 PM
              </li>
              <li>
                <span className="font-semibold text-[#E0C158]">Gulikaal:</span> 07:30
                AM - 09:00 AM
              </li>
              <li>
                <span className="font-semibold text-[#E0C158]">Yamghant:</span> 03:00
                PM - 04:30 PM
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#F5F1E8]">Sun Timings (Delhi)</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#C7C2B4]">
              <li>
                <span className="font-semibold text-[#E0C158]">Sunrise:</span> 06:08
                AM
              </li>
              <li>
                <span className="font-semibold text-[#E0C158]">Sunset:</span> 06:09 PM
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#F5F1E8]">Shubh Muhurat</h2>
          <div className="mt-3 grid gap-2 text-sm text-[#C7C2B4] sm:grid-cols-2">
            <p className="rounded-lg bg-[#0A1A2F] px-3 py-2">
              Abhijit Muhurat: 11:56 AM - 12:44 PM
            </p>
            <p className="rounded-lg bg-[#0A1A2F] px-3 py-2">
              Labh Choghadiya: 03:08 PM - 04:38 PM
            </p>
            <p className="rounded-lg bg-[#0A1A2F] px-3 py-2">
              Amrit Choghadiya: 06:08 AM - 07:38 AM
            </p>
            <p className="rounded-lg bg-[#0A1A2F] px-3 py-2">
              Evening Amrit: 04:38 PM - 06:09 PM
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#F5F1E8]">Day Choghadiya</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#0A1A2F] text-[#E0C158]">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {choghadiya.map((row) => (
                  <tr key={row.period} className="border-b border-[#C9A227]/10">
                    <td className="px-3 py-2">{row.period}</td>
                    <td className="px-3 py-2 font-semibold text-[#F5F1E8]">{row.type}</td>
                    <td className="px-3 py-2 text-[#C7C2B4]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
