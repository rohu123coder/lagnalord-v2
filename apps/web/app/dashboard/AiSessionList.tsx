"use client";

import Link from "next/link";
import { useState } from "react";

export type AiChatSession = {
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

export function AiSessionList({
  sessions,
  token,
  onRated,
}: {
  sessions: AiChatSession[];
  token: string | null;
  onRated: (sessionId: string, rating: number) => void;
}) {
  const [openAiSession, setOpenAiSession] = useState<{
    session: AiChatSession;
    messages: AiChatMessage[];
  } | null>(null);
  const [aiSessionLoading, setAiSessionLoading] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);

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
        onRated(openAiSession.session.id, value);
      }
    } catch {
      // ignore — user can retry by clicking a star again
    } finally {
      setRatingSaving(false);
    }
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-10 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] shadow-sm">
        <div className="border-b border-[#b18d4f]/10 px-6 py-4">
          <h2 className="text-lg font-bold text-[#F5F1E8]">🔮 Recent AI Chats</h2>
        </div>
        <div className="divide-y divide-[#b18d4f]/10">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void openAiSessionHistory(s)}
              className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-[#09142a]/50"
            >
              {s.astrologerPhotoUrl ? (
                <img
                  src={s.astrologerPhotoUrl}
                  alt={s.astrologerName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#09142a] text-xl">
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
              <p className="text-sm font-semibold text-[#C8AC80]">
                ₹{s.totalCharged.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {openAiSession ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl">
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
                className="text-[#C7C2B4] hover:text-[#C8AC80]"
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
                        ? "rounded-br-md bg-[#b18d4f] text-[#09142a]"
                        : "rounded-bl-md bg-[#09142a] text-[#F5F1E8]"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-[#b18d4f]/10 pt-4">
              <Link
                href={`/ai-astrologers/${openAiSession.session.astrologerId}`}
                onClick={() => setOpenAiSession(null)}
                className="w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-2.5 text-center text-sm font-semibold text-[#09142a] transition hover:opacity-95"
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
                      <span
                        className={
                          star <= ratingValue ? "text-amber-400" : "text-[#3a3f52]"
                        }
                      >
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
    </>
  );
}
