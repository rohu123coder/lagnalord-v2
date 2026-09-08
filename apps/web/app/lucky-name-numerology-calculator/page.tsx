import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { LuckyNameClient } from "./LuckyNameClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Lucky Name Numerology Calculator"),
  description:
    "Test a name’s Chaldean number and, with a birth date, see a simple favourable / neutral / avoid note against your Mulank.",
};

export default function LuckyNameNumerologyPage() {
  return <LuckyNameClient />;
}
