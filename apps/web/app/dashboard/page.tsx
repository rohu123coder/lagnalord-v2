"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ChatHistoryModal } from "@/components/ChatHistoryModal";
import { Navbar } from "@/components/Navbar";
import { RatingModal } from "@/components/RatingModal";
import { WalletWidget } from "@/components/WalletWidget";
import api from "@/lib/api";
import { firstName } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

import { AiSessionList, type AiChatSession } from "./AiSessionList";
import { RecentChatsTable, type SessionRow } from "./RecentChatsTable";

type ArchivedMessage = {
  sender_role: "user" | "astrologer";
  content: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, token, refreshWalletBalance } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [messages, setMessages] = useState<ArchivedMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [rateTarget, setRateTarget] = useState<SessionRow | null>(null);
  const [aiSessions, setAiSessions] = useState<AiChatSession[]>([]);
  const [aiSessionsLoading, setAiSessionsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (!isLoggedIn || !token) {
      router.replace("/login");
      return;
    }
    if (user?.role === "astrologer") {
      router.replace("/astrologer/dashboard");
      return;
    }
    void refreshWalletBalance();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/chat/history`, {
          params: { page: 1, limit: 20 },
        });
        const list = res.data?.data?.sessions as SessionRow[] | undefined;
        if (!cancelled && list) {
          setSessions(list);
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, isLoggedIn, token, router, user?.role, refreshWalletBalance]);

  useEffect(() => {
    if (!mounted || !isLoggedIn || !token) {
      return;
    }
    if (pathname === "/dashboard") {
      void refreshWalletBalance();
    }
  }, [mounted, isLoggedIn, token, pathname, refreshWalletBalance]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-astrologer/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json?.sessions) {
          setAiSessions(json.sessions);
        }
      } catch {
        if (!cancelled) setAiSessions([]);
      } finally {
        if (!cancelled) setAiSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="h-40 animate-pulse rounded-2xl bg-[#0E1C3B]" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const openHistory = async (session: SessionRow) => {
    setSelectedSession(session);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const res = await api.get(`/api/chat/history/${session.id}/messages`);
      setMessages((res.data?.data?.messages as ArchivedMessage[] | undefined) ?? []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[#F5F1E8] sm:text-3xl">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-[#C7C2B4]">
          Manage your wallet and continue conversations with astrologers.
        </p>

        <div className="mt-8 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#F5F1E8]">Wallet</h2>
          <p className="mt-1 text-sm text-[#C7C2B4]">
            Recharge securely to start new chat sessions.
          </p>
          <div className="mt-4">
            <WalletWidget />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/astrologers"
            className="inline-flex rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] shadow-md transition hover:opacity-95"
          >
            Browse Astrologers
          </Link>
          <Link
            href="/profile/birth-details"
            className="inline-flex rounded-xl border border-[#b18d4f]/40 bg-[#09142a] px-5 py-2.5 text-sm font-semibold text-[#C8AC80] shadow-sm transition hover:bg-[#b18d4f]/10"
          >
            My Birth Details
          </Link>
        </div>

        <RecentChatsTable
          sessions={sessions}
          loading={loading}
          onRowClick={(session) => {
            void openHistory(session);
          }}
        />

        <AiSessionList
          sessions={aiSessions}
          token={token}
          onRated={(sessionId, rating) => {
            setAiSessions((prev) =>
              prev.map((s) => (s.id === sessionId ? { ...s, rating } : s))
            );
          }}
        />
      </div>

      <ChatHistoryModal
        open={Boolean(selectedSession)}
        sessionId={selectedSession?.id ?? ""}
        astrologerName={firstName(selectedSession?.astrologer_name)}
        messages={messages}
        loading={messagesLoading}
        rated={selectedSession?.rating != null}
        onClose={() => setSelectedSession(null)}
        onChatAgain={() => {
          if (!selectedSession) {
            return;
          }
          router.push(`/astrologers/${selectedSession.astrologer_id}`);
        }}
        onRateSession={() => {
          if (selectedSession) {
            setRateTarget(selectedSession);
          }
        }}
      />

      <RatingModal
        open={Boolean(rateTarget)}
        astrologerName={firstName(rateTarget?.astrologer_name)}
        onClose={() => setRateTarget(null)}
        onSkip={() => setRateTarget(null)}
        onSubmitRating={async ({ rating, reviewText }) => {
          if (!rateTarget) {
            return;
          }
          await api.post(`/api/sessions/${rateTarget.id}/rate`, {
            rating,
            reviewText: reviewText || undefined,
          });
          setSessions((prev) =>
            prev.map((session) =>
              session.id === rateTarget.id ? { ...session, rating } : session
            )
          );
          setSelectedSession((prev) =>
            prev && prev.id === rateTarget.id ? { ...prev, rating } : prev
          );
        }}
      />
    </div>
  );
}
