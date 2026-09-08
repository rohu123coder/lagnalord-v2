import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { MobileNumberClient } from "./MobileNumberClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Mobile Number Numerology Calculator"),
  description:
    "Reduce a 10-digit Indian mobile number to a single digit and read a light, informational note — not a prediction.",
};

export default function MobileNumberNumerologyPage() {
  return <MobileNumberClient />;
}
