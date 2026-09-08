import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { MulankClient } from "./MulankClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Mulank Calculator"),
  description:
    "Find your Mulank from the day of birth, see the ruling planet, and read what each number 1–9 is said to describe.",
};

export default function MulankCalculatorPage() {
  return <MulankClient />;
}
