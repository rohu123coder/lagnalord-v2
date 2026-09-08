import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { LoveClient } from "./LoveClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Love Calculator"),
  description:
    "A light two-name love calculator: classic FLAMES category plus a Love Percentage built from Chaldean Destiny digits. Entertainment only.",
};

export default function LoveCalculatorPage() {
  return <LoveClient />;
}
