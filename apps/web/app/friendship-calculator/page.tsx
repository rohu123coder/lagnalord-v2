import type { Metadata } from "next";

import { tenantPageTitle } from "@/lib/tenantBranding";

import { FriendshipClient } from "./FriendshipClient";

export const metadata: Metadata = {
  title: tenantPageTitle("Friendship Calculator"),
  description:
    "Friendship compatibility from how much two names share unique letters (Jaccard overlap), scaled to a 35–95% score. Not a romance tool.",
};

export default function FriendshipCalculatorPage() {
  return <FriendshipClient />;
}
