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

type SessionRow = {
  id: string;
  astrologer_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  total_minutes: number | null;
  total_charged: number | null;
  astrologer_name: string;
  astrologer_photo: string | null;
  rating: number | null;
  session_type: "chat" | "voice" | "video" | null;
};

type ArchivedMessage = {
  sender_role: "user" | "astrologer";
  content: string;
  created_at: string;
};

type AiChatSession = {
  id: string;
  astrologerId: string;
  astrologerName: string;
  astrologerEmoji: string;
  astrologerPhotoUrl: string | null;
  totalCharged: number;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  rating: number | null;
};
type AiChatMessage = {
  role: "user" | "model";
  text: string;
  createdAt: string;
};

function renderSessionTypeIcon(type: SessionRow["session_type"]): string {
  if (type === "voice") {
    return "📞";
  }
  if (type === "video") {
    return "📹";
  }
  return "💬";
}

function renderStars(rating: number | null): string {
  if (rating == null) {
    return "—";
  }
  const rounded = Math.max(1, Math.min(5, Math.round(rating)));
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
}

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
  const [openAiSession, setOpenAiSession] = useState<{
    session: AiChatSession;
    messages: AiChatMessage[];
  } | null>(null);
  const [aiSessionLoading, setAiSessionLoading] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);

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
      <div className="min-h-screen bg-[#0A1A2F]">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="h-40 animate-pulse rounded-2xl bg-[#0F2240]" />
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

  async function openAiSessionHistory(session: AiChatSession) {
    setAiSessionLoading(true);
    setRatingValue(session.rating ?? 0);
    setRatingSaved(false);
    try {
      const res = await fetch(`/api/ai-astrologer/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.messages) {
        setOpenAiSession({ session, messages: json.messages });
      }
    } catch {
      // silently ignore — user can retry
    } finally {
      setAiSessionLoading(false);
    }
  }

  async function submitRating(value: number) {
    if (!openAiSession || !token) return;
    setRatingValue(value);
    setRatingSaving(true);
    try {
      const res = await fetch(
        `/api/ai-astrologer/sessions/${openAiSession.session.id}/rate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating: value }),
        }
      );
      if (res.ok) {
        setRatingSaved(true);
        setAiSessions((prev) =>
          prev.map((s) =>
            s.id === openAiSession.session.id ? { ...s, rating: value } : s
          )
        );
      }
    } catch {
      // ignore — user can retry by clicking a star again
    } finally {
      setRatingSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1A2F]">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[#F5F1E8] sm:text-3xl">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-[#C7C2B4]">
          Manage your wallet and continue conversations with astrologers.
        </p>

        <div className="mt-8 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-6 shadow-sm">
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
            className="inline-flex rounded-xl bg-gradient-to-r from-[#2A7D7B] to-[#3A9D9B] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
          >
            Browse Astrologers
          </Link>
          <Link
            href="/profile/birth-details"
            className="inline-flex rounded-xl border border-[#C9A227]/40 bg-[#0A1A2F] px-5 py-2.5 text-sm font-semibold text-[#E0C158] shadow-sm transition hover:bg-[#C9A227]/10"
          >
            My Birth Details
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] shadow-sm">
          <div className="border-b border-[#C9A227]/10 px-6 py-4">
            <h2 className="text-lg font-bold text-[#F5F1E8]">Recent chats</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-2 p-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded bg-[#0A1A2F]"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="p-6 text-sm text-[#C7C2B4]">
                No chats yet. Browse an astrologer to get started.
              </p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#C9A227]/10 bg-[#0A1A2F] text-xs uppercase tracking-wide text-[#C7C2B4]">
                    <th className="px-4 py-3 font-medium">Astrologer</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Charged</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A227]/10">
                  {sessions.map((s) => {
                    const dateSrc = s.ended_at ?? s.started_at;
                    return (
                      <tr
                        key={s.id}
                        className="cursor-pointer text-[#F5F1E8] hover:bg-[#0A1A2F]/50"
                        onClick={() => {
                          void openHistory(s);
                        }}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {s.astrologer_photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.astrologer_photo}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A227]/20 text-xs font-bold text-[#E0C158]">
                                {firstName(s.astrologer_name).slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span>{firstName(s.astrologer_name)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span title={s.session_type ?? "chat"}>
                            {renderSessionTypeIcon(s.session_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#C7C2B4]">
                          {dateSrc
                            ? new Date(dateSrc).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {s.total_minutes != null
                            ? `${s.total_minutes} min`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {s.total_charged != null
                            ? `₹${Number(s.total_charged).toFixed(0)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-amber-500">
                          {renderStars(s.rating)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              s.status === "ended"
                                ? "bg-[#0F2240] text-[#C7C2B4]"
                                : s.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                  : "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {aiSessions.length > 0 ? (
          <div className="mt-10 rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] shadow-sm">
            <div className="border-b border-[#C9A227]/10 px-6 py-4">
              <h2 className="text-lg font-bold text-[#F5F1E8]">🔮 Recent AI Chats</h2>
            </div>
            <div className="divide-y divide-[#C9A227]/10">
              {aiSessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void openAiSessionHistory(s)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-[#0A1A2F]/50"
                >
                  {s.astrologerPhotoUrl ? (
                    <img
                      src={s.astrologerPhotoUrl}
                      alt={s.astrologerName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A1A2F] text-xl">
                      {s.astrologerEmoji}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#F5F1E8]">{s.astrologerName}</p>
                    <p className="text-xs text-[#C7C2B4]">
                      {new Date(s.lastMessageAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {s.messageCount} messages
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#E0C158]">
                    ₹{s.totalCharged.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {openAiSession ? (
          <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#0F2240] p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#F5F1E8]">Chat History</h2>
                  <p className="text-sm text-[#C7C2B4]">
                    {openAiSession.session.astrologerName} · ₹
                    {openAiSession.session.totalCharged.toFixed(2)} charged
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenAiSession(null)}
                  className="text-[#C7C2B4] hover:text-[#E0C158]"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {openAiSession.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                        m.role === "user"
                          ? "rounded-br-md bg-gradient-to-br from-[#2A7D7B] to-[#3A9D9B] text-white"
                          : "rounded-bl-md bg-[#0A1A2F] text-[#F5F1E8]"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-[#C9A227]/10 pt-4">
                <Link
                  href={`/ai-astrologers/${openAiSession.session.astrologerId}`}
                  onClick={() => setOpenAiSession(null)}
                  className="w-full rounded-xl bg-gradient-to-r from-[#2A7D7B] to-[#3A9D9B] py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Chat Again
                </Link>
                <div className="text-center">
                  <p className="mb-2 text-xs font-medium text-[#C7C2B4]">
                    {ratingSaved ? "Thanks for rating!" : "Rate this session"}
                  </p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={ratingSaving}
                        onClick={() => void submitRating(star)}
                        className="text-2xl transition disabled:opacity-50"
                        aria-label={`Rate ${star} stars`}
                      >
                        <span className={star <= ratingValue ? "text-amber-400" : "text-[#3a3f52]"}>
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
