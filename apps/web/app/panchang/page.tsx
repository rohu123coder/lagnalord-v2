import type { Metadata } from "next";
import { Suspense } from "react";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { PanchangClient } from "./PanchangClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Today's Panchang"),
  description:
    "View today's Panchang with tithi, nakshatra, yoga, rahukaal, sunrise, shubh muhurat, and choghadiya timings.",
};

export default function PanchangPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#09142a] via-[#0E1C3B] to-[#09142a]">
          <p className="px-4 py-16 text-center text-sm text-[#C7C2B4]">Loading Panchang…</p>
        </div>
      }
    >
      <PanchangClient />
    </Suspense>
  );
}
