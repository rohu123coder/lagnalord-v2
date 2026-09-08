import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { AgeClient } from "./AgeClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Age Calculator"),
  description:
    "Exact age in years, months, and days, total days lived, and next-birthday countdown — the civil age a horoscope or dasha reading actually needs.",
};

export default function AgeCalculatorPage() {
  return <AgeClient />;
}
