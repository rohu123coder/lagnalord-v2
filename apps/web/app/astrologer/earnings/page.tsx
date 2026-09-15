"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AstrologerNavbar } from "@/components/AstrologerNavbar";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

import { EarningsChart } from "./EarningsChart";
import { EarningsSessionTable, type HistorySession } from "./EarningsSessionTable";
import { EarningsStatCards } from "./EarningsStatCards";

type DashboardData = {
  earnings_total: number;
  earnings_this_month: number;
  total_sessions: number;
  rating: number | null;
  last_7_days_earnings: Array<{ date: string; amount: number }>;
};

export default function AstrologerEarningsPage() {
  const router = useRouter();
  const { user, token, isLoggedIn } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, hRes] = await Promise.all([
        api.get(`/api/astrologers/dashboard`),
        api.get(`/api/chat/history`, { params: { page: 1, limit: 100 } }),
      ]);
      setDash(dRes.data?.data as DashboardData);
      const rows = hRes.data?.data?.sessions as HistorySession[] | undefined;
      setSessions(rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (!isLoggedIn || !token) {
      router.replace("/astrologer/login");
      return;
    }
    if (user?.role !== "astrologer") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [mounted, isLoggedIn, token, user?.role, router, load]);

  if (!mounted || !isLoggedIn || user?.role !== "astrologer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#b18d4f] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AstrologerNavbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">My Earnings</h1>

        {loading || !dash ? (
          <div className="mt-12 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#b18d4f] border-t-transparent" />
          </div>
        ) : (
          <>
            <EarningsStatCards
              earnings_total={dash.earnings_total}
              earnings_this_month={dash.earnings_this_month}
              total_sessions={dash.total_sessions}
              rating={dash.rating}
            />
            <EarningsChart last7Days={dash.last_7_days_earnings ?? []} />
            <EarningsSessionTable sessions={sessions} />
          </>
        )}
      </main>
    </div>
  );
}
