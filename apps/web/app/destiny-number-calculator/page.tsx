import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { DestinyClient } from "./DestinyClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Destiny Number Calculator"),
  description:
    "Calculate a Chaldean Destiny (Expression) number from a name, plus Soul Urge and Personality totals.",
};

export default function DestinyNumberCalculatorPage() {
  return <DestinyClient />;
}
