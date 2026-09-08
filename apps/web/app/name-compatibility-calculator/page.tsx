import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { NameCompatibilityClient } from "./NameCompatibilityClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Name Compatibility Calculator"),
  description:
    "Compare two names’ Chaldean Destiny numbers using the same favourable / neutral / avoid grouping as the Lucky Name calculator.",
};

export default function NameCompatibilityCalculatorPage() {
  return <NameCompatibilityClient />;
}
