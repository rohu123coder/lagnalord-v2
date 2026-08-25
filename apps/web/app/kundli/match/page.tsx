import type { Metadata } from "next";
import { Suspense } from "react";

import { tenantPageTitle } from "@/lib/tenantBranding";

import KundliMatchClient from "./KundliMatchClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Kundli Matching - Ashtakoot Score"),
  description:
    "Check kundli compatibility with Ashtakoot score, koot-wise points, Mangal Dosha check, and marriage recommendation.",
};

export default function KundliMatchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-[#C7C2B4]">Loading form...</div>}>
      <KundliMatchClient />
    </Suspense>
  );
}
