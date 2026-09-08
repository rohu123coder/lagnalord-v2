import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import KaalSarpDoshaClient from "./KaalSarpDoshaClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Kaal Sarp Dosha Checker"),
  description:
    "Check whether the seven classical planets sit on one side of the Rahu–Ketu axis, and read a measured note on what that pattern is — and is not.",
};

export default function KaalSarpDoshaPage() {
  return <KaalSarpDoshaClient />;
}
