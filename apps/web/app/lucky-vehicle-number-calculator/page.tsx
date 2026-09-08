import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { LuckyVehicleClient } from "./LuckyVehicleClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Lucky Vehicle Number Calculator"),
  description:
    "Add the digits in a vehicle registration, reduce to 1–9, and read a light informational note.",
};

export default function LuckyVehicleNumberPage() {
  return <LuckyVehicleClient />;
}
