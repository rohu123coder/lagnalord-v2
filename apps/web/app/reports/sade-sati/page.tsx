import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import SadeSatiClient from "./SadeSatiClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Sade Sati Report"),
  description:
    "Check whether Saturn’s current transit is in Sade Sati or Dhaiya relative to your natal Moon, and read steady, practical guidance for the phase.",
};

export default function SadeSatiPage() {
  return <SadeSatiClient />;
}
