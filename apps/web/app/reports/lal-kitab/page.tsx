import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import LalKitabClient from "./LalKitabClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Lal Kitab Report"),
  description:
    "A simple Kaal Purush (fixed-house) Lal Kitab snapshot: planet houses, Pakka Ghar, and a gentle sleeping-planet check — for learning, not a final reading.",
};

export default function LalKitabPage() {
  return <LalKitabClient />;
}
