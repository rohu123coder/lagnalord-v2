"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getTenant } from "@/lib/tenants";
import { AIAstrologerChat } from "./components/AIAstrologerChat";
import { KundliChart, type KundliChartVariant } from "./components/KundliChart";
import { KundliDashaDosha } from "./components/KundliDashaDosha";
import { KundliForm } from "./components/KundliForm";
import { KundliInsights } from "./components/KundliInsights";
import { KundliInterpretations } from "./components/KundliInterpretations";
import { KundliLifeRatings } from "./components/KundliLifeRatings";
import { KundliPlanetTable } from "./components/KundliPlanetTable";
import { KundliShareBar } from "./components/KundliShareBar";
import { KundliYogas } from "./components/KundliYogas";
import { SectionTitle } from "./components/SectionTitle";
import type { KundliCalculateResponse } from "./types";

function AIAstrologerChatFromQuery({
  kundliData,
}: {
  kundliData: KundliCalculateResponse;
}) {
  const searchParams = useSearchParams();
  const preselectedAstrologerId = searchParams.get("aiAstrologer");
  return (
    <AIAstrologerChat
      kundliData={kundliData}
      preselectedPersonaId={preselectedAstrologerId}
    />
  );
}

export default function KundliPage() {
  const tenant = getTenant();
  const [result, setResult] = useState<KundliCalculateResponse | null>(null);
  const [chartVariant, setChartVariant] = useState<KundliChartVariant>("dark");

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="print:hidden">
        <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-[#C7C2B4]">Loading form...</div>}>
          <KundliForm onSuccess={setResult} />
        </Suspense>
      </div>

      {result ? (
        <div className="mx-auto max-w-6xl space-y-12 px-4 pb-20 sm:px-6">
          {result.birthTimeApproximate ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
              Birth time approximated to noon — ascendant &amp; houses are
              indicative; enter exact time for precision.
            </p>
          ) : null}

          <section className="print:break-inside-avoid print:mb-6">
            <SectionTitle subtitle="Lagna chart with signs & planets by house">
              Your birth chart
            </SectionTitle>
            <KundliShareBar
              result={result}
              tenantName={tenant.name}
              chartVariant={chartVariant}
              onChartVariantChange={setChartVariant}
            />
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <KundliChart
                chartData={result.chartData}
                planets={result.planets}
                variant={chartVariant}
              />
              <div className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-lg shadow-black/30">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#C8AC80]">
                  Snapshot
                </h3>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-[#b18d4f]/10 pb-2">
                    <dt className="text-[#C7C2B4]">Ascendant</dt>
                    <dd className="font-medium text-[#F5F1E8]">
                      {result.basicInfo.ascendant.rashi}{" "}
                      <span className="text-[#C8AC80]">
                        {result.basicInfo.ascendant.degree}°
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#b18d4f]/10 pb-2">
                    <dt className="text-[#C7C2B4]">Moon sign</dt>
                    <dd className="font-medium text-[#F5F1E8]">
                      {result.basicInfo.moonSign.rashi}{" "}
                      <span className="text-[#C8AC80]">
                        {result.basicInfo.moonSign.degree}°
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#b18d4f]/10 pb-2">
                    <dt className="text-[#C7C2B4]">Sun sign</dt>
                    <dd className="font-medium text-[#F5F1E8]">
                      {result.basicInfo.sunSign.rashi}{" "}
                      <span className="text-[#C8AC80]">
                        {result.basicInfo.sunSign.degree}°{" "}
                        {result.basicInfo.sunSign.minutes}′
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#b18d4f]/10 pb-2">
                    <dt className="text-[#C7C2B4]">Nakshatra</dt>
                    <dd className="font-medium text-[#F5F1E8]">
                      {result.basicInfo.nakshatra.name}{" "}
                      <span className="text-[#C7C2B4]">
                        (Pada {result.basicInfo.nakshatra.pada}, lord{" "}
                        {result.basicInfo.nakshatra.lord})
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#C7C2B4]">Name number</dt>
                    <dd className="font-medium text-[#C8AC80]">
                      {result.basicInfo.numerologyNumber}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <KundliLifeRatings result={result} />
          <KundliPlanetTable result={result} />
          <KundliDashaDosha result={result} />
          <KundliYogas result={result} />
          <KundliInterpretations result={result} />
          <KundliInsights result={result} />

          <Suspense fallback={null}>
            <AIAstrologerChatFromQuery kundliData={result} />
          </Suspense>

          <section className="rounded-2xl border border-[#b18d4f]/20 bg-gradient-to-r from-[#0E1C3B] to-[#122352] p-6 shadow-sm print:break-inside-avoid print:mb-6 print:hidden">
            <SectionTitle>Compatibility</SectionTitle>
            <p className="text-sm text-[#C7C2B4]">
              Match your Kundli with your partner to check guna milan, dosha compatibility, and marriage timing.
            </p>
            <Link
              href="/kundli/match"
              className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2 text-sm font-medium text-[#09142a] transition hover:opacity-95"
            >
              Match your Kundli with your partner
            </Link>
          </section>

          <section className="rounded-2xl border border-[#b18d4f]/30 bg-[#b18d4f]/10 p-6 text-center shadow-sm print:break-inside-avoid print:mb-6 print:hidden">
            <p className="text-sm text-[#C7C2B4]">
              Need deeper personalized guidance beyond algorithmic predictions?
            </p>
            <Link
              href="/astrologers"
              className="mt-3 inline-flex rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2 text-sm font-semibold text-[#09142a] transition hover:opacity-90"
            >
              Consult an Astrologer
            </Link>
          </section>
        </div>
      ) : null}

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
