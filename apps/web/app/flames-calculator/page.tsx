import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { FlamesClient } from "./FlamesClient";

export const metadata: Metadata = {
  title: tenantPageTitle("FLAMES Calculator"),
  description:
    "Classic FLAMES from two names: cancel matching letters, count what remains, and walk Friends / Lovers / Affectionate / Marriage / Enemies / Siblings.",
};

export default function FlamesCalculatorPage() {
  return <FlamesClient />;
}
