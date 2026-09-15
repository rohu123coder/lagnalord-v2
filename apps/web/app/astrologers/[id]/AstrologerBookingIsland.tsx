"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { WalletWidget } from "@/components/WalletWidget";
import api from "@/lib/api";
import { getSocketApiBase } from "@/lib/socketBase";
import { useAuthStore } from "@/lib/store";

export type BookingAstrologer = {
  id: string;
  bio: string | null;
  specializations: string[];
  languages: string[];
  rating: number | null;
  total_reviews: number;
  price_per_minute: number | null;
  is_available: boolean;
  is_busy: boolean;
  waiting_count: number;
  profile_photo_url?: string | null;
  experience_years: number | null;
  user: {
    name: string;
    avatar_url: string | null;
    profile_photo_url?: string | null;
  };
};

function StarRow({ value }: { value: number | null }) {
  const count = Math.max(0, Math.min(5, Math.round(value ?? 0)));
  return (
    <span className="text-amber-500" aria-hidden>
      {"★".repeat(count)}
      <span className="text-slate-200">
        {"★".repeat(Math.max(0, 5 - count))}
      </span>
    </span>
  );
}

function formatK(n: number): string {
  if (n >= 1000) {
    return `${Math.round(n / 100) / 10}K`;
  }
  return String(n);
}

/** At most one profile-page socket. Replacing it disconnects the previous. */
let activeIslandSocket: Socket | null = null;

function tearDownSocket(socket: Socket | null) {
  if (!socket) {
    return;
  }
  socket.removeAllListeners();
  socket.disconnect();
  if (activeIslandSocket === socket) {
    activeIslandSocket = null;
  }
}

export function AstrologerBookingIsland({
  astrologer,
}: {
  astrologer: BookingAstrologer;
}) {
  const router = useRouter();
  const { isLoggedIn, user, token } = useAuthStore();
  const [chatLoading, setChatLoading] = useState(false);
  const [joinWaitlistLoading, setJoinWaitlistLoading] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [busyPromptOpen, setBusyPromptOpen] = useState(false);
  const [busyQueueLength, setBusyQueueLength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waitlistState, setWaitlistState] = useState<{
    waitlistId: string;
    position: number;
    queueLength: number;
  } | null>(null);
  const [queueTurn, setQueueTurn] = useState<{
    sessionId: string;
    astrologerName: string;
    countdown: number;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const id = astrologer.id;
  const astrologerName = astrologer.user.name;
  const price = astrologer.price_per_minute ?? 0;

  const goToChat = useCallback(
    (sessionId: string, name: string, callType?: "voice" | "video") => {
      const current = socketRef.current;
      socketRef.current = null;
      tearDownSocket(current);
      const encoded = encodeURIComponent(name);
      router.push(
        `/chat/${sessionId}?name=${encoded}${callType ? `&autoCall=${callType}` : ""}`
      );
    },
    [router]
  );

  useEffect(() => {
    if (!token || !isLoggedIn || user?.role === "astrologer") {
      return;
    }

    tearDownSocket(activeIslandSocket);

    const socket = io(getSocketApiBase(), {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ["websocket", "polling"],
    });
    activeIslandSocket = socket;
    socketRef.current = socket;

    socket.on(
      "waitlist_joined",
      (payload: {
        waitlistId: string;
        position: number;
        queueLength: number;
        astrologerId: string;
      }) => {
        if (payload.astrologerId !== id) {
          return;
        }
        setBusyPromptOpen(false);
        setWaitlistState({
          waitlistId: payload.waitlistId,
          position: payload.position,
          queueLength: payload.queueLength,
        });
      }
    );

    socket.on(
      "queue_position_update",
      (payload: {
        waitlistId?: string;
        astrologerId: string;
        newPosition: number;
        queueLength: number;
      }) => {
        if (payload.astrologerId !== id) {
          return;
        }
        setWaitlistState((prev) => {
          if (!prev) {
            return prev;
          }
          if (payload.waitlistId && payload.waitlistId !== prev.waitlistId) {
            return prev;
          }
          return {
            ...prev,
            position: payload.newPosition,
            queueLength: payload.queueLength,
          };
        });
      }
    );

    socket.on(
      "waitlist_declined",
      (payload: { waitlistId?: string; astrologerId?: string }) => {
        if (payload.astrologerId && payload.astrologerId !== id) {
          return;
        }
        setWaitlistState((prev) => {
          if (!prev) {
            return prev;
          }
          if (payload.waitlistId && payload.waitlistId !== prev.waitlistId) {
            return prev;
          }
          return null;
        });
        setError("Astrologer is unavailable. Try another astrologer.");
      }
    );

    socket.on(
      "waitlist_cancelled",
      (payload: { waitlistId?: string; astrologerId?: string; ok?: boolean }) => {
        if (payload.astrologerId && payload.astrologerId !== id) {
          return;
        }
        setWaitlistState((prev) => {
          if (!prev) {
            return prev;
          }
          if (payload.waitlistId && payload.waitlistId !== prev.waitlistId) {
            return prev;
          }
          return null;
        });
      }
    );

    socket.on(
      "session_starting",
      (payload: { sessionId: string; astrologerName?: string; astrologerId?: string }) => {
        if (payload.astrologerId && payload.astrologerId !== id) {
          return;
        }
        goToChat(payload.sessionId, payload.astrologerName ?? astrologerName);
      }
    );

    socket.on(
      "queue_your_turn",
      (payload: { sessionId: string; astrologerName?: string; astrologerId?: string }) => {
        if (payload.astrologerId && payload.astrologerId !== id) {
          return;
        }
        setQueueTurn({
          sessionId: payload.sessionId,
          astrologerName: payload.astrologerName ?? astrologerName,
          countdown: 3,
        });
      }
    );

    socket.on(
      "waitlist_updated",
      (payload: {
        astrologerId?: string;
        queue?: Array<{ waitlistId: string; userId: string; position: number }>;
      }) => {
        if (payload.astrologerId && payload.astrologerId !== id) {
          return;
        }
        if (!payload.queue) {
          return;
        }
        setWaitlistState((prev) =>
          prev
            ? (() => {
                const mine = payload.queue?.find(
                  (entry) => entry.waitlistId === prev.waitlistId
                );
                if (!mine) {
                  return null;
                }
                return {
                  ...prev,
                  position: mine.position,
                  queueLength: payload.queue?.length ?? prev.queueLength,
                };
              })()
            : prev
        );
      }
    );

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      tearDownSocket(socket);
    };
  }, [astrologerName, goToChat, id, isLoggedIn, token, user?.role]);

  useEffect(() => {
    if (!queueTurn) {
      return;
    }
    if (queueTurn.countdown <= 0) {
      goToChat(queueTurn.sessionId, queueTurn.astrologerName);
      return;
    }
    const t = setTimeout(() => {
      setQueueTurn((prev) =>
        prev ? { ...prev, countdown: prev.countdown - 1 } : prev
      );
    }, 1000);
    return () => clearTimeout(t);
  }, [goToChat, queueTurn]);

  const startChat = useCallback(
    async (callType?: "voice" | "video") => {
      if (!isLoggedIn) {
        router.push(`/login?redirect=${encodeURIComponent(`/astrologers/${id}`)}`);
        return;
      }
      const min = price * 5;
      const bal = user?.wallet_balance ?? 0;
      if (bal < min) {
        setRechargeOpen(true);
        return;
      }
      setChatLoading(true);
      try {
        const res = await api.post(`/api/chat/request`, {
          astrologer_id: id,
        });
        const sessionId = (res.data?.data?.session_id ??
          res.data?.data?.sessionId) as string | undefined;
        if (!sessionId) {
          throw new Error("No session");
        }
        goToChat(sessionId, astrologerName, callType);
      } catch (e: unknown) {
        const maybeStatus =
          e &&
          typeof e === "object" &&
          "response" in e &&
          e.response &&
          typeof e.response === "object" &&
          "status" in e.response
            ? Number(e.response.status)
            : null;
        const responseData =
          e &&
          typeof e === "object" &&
          "response" in e &&
          e.response &&
          typeof e.response === "object" &&
          "data" in e.response &&
          e.response.data &&
          typeof e.response.data === "object"
            ? (e.response.data as {
                data?: { queue_length?: number };
                error?: string;
              })
            : undefined;
        if (maybeStatus === 409 && responseData?.data) {
          setBusyQueueLength(Number(responseData.data.queue_length ?? 0));
          setBusyPromptOpen(true);
          setError(null);
          return;
        }
        const msg =
          e &&
          typeof e === "object" &&
          "response" in e &&
          e.response &&
          typeof e.response === "object" &&
          "data" in e.response &&
          e.response.data &&
          typeof e.response.data === "object" &&
          "error" in e.response.data
            ? String((e.response.data as { error?: string }).error)
            : "Could not start chat";
        setError(msg);
      } finally {
        setChatLoading(false);
      }
    },
    [astrologerName, goToChat, id, isLoggedIn, price, router, user?.wallet_balance]
  );

  const joinWaitlist = useCallback(() => {
    if (!socketRef.current) {
      setError("Could not connect to waitlist. Please refresh and try again.");
      return;
    }
    setJoinWaitlistLoading(true);
    socketRef.current.emit("join_waitlist", {
      astrologerId: id,
    });
    setTimeout(() => setJoinWaitlistLoading(false), 800);
  }, [id]);

  const cancelWaitlist = useCallback(() => {
    if (!waitlistState || !socketRef.current) {
      return;
    }
    socketRef.current.emit("cancel_waitlist", {
      waitlistId: waitlistState.waitlistId,
      astrologerId: id,
    });
  }, [id, waitlistState]);

  const displayPhoto =
    astrologer.profile_photo_url ??
    astrologer.user.profile_photo_url ??
    astrologer.user.avatar_url ??
    null;
  const chatMinutes = formatK((astrologer.total_reviews || 1) * 18);
  const callMinutes = formatK((astrologer.total_reviews || 1) * 24);
  const specializationText = astrologer.specializations.join(", ");
  const languagesText = astrologer.languages.join(", ");
  const headerRating = astrologer.rating ?? 0;

  const runStart = (callType?: "voice" | "video") => {
    if (!astrologer.is_available && !astrologer.is_busy) {
      setError("Astrologer is offline");
      return;
    }
    void startChat(callType);
  };

  return (
    <>
      {waitlistState ? (
        <section className="mb-6 rounded-2xl border border-[#b18d4f]/30 bg-[#b18d4f]/10 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#C8AC80]">You are in queue</h2>
          <p className="mt-2 text-sm text-[#C7C2B4]">
            You are #{waitlistState.position} in queue for {astrologer.user.name}.
            Estimated wait: ~{Math.max(1, waitlistState.position * 5)} min.
          </p>
          <p className="mt-1 text-xs text-[#C7C2B4]/70">
            Queue length: {waitlistState.queueLength}
          </p>
          <button
            type="button"
            onClick={cancelWaitlist}
            className="mt-4 rounded-xl border border-[#b18d4f]/40 bg-[#09142a] px-4 py-2 text-sm font-semibold text-[#C8AC80] hover:bg-[#b18d4f]/10"
          >
            Cancel Request
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="shrink-0">
            {displayPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayPhoto}
                alt=""
                className="h-[200px] w-[200px] rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl bg-[#09142a] text-4xl font-bold text-[#C8AC80]">
                {astrologer.user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-[#F5F1E8]">
                {astrologer.user.name}
              </h1>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                ✓
              </span>
            </div>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              {specializationText || "Astrologer"}
            </p>
            <p className="mt-1 text-sm text-[#C7C2B4]">{languagesText}</p>
            <p className="mt-1 text-sm text-[#C7C2B4]">
              Exp: {astrologer.experience_years ?? 0} Years
            </p>
            <p className="mt-2 text-lg font-bold text-[#F5F1E8]">
              ₹{price.toFixed(0)}/min
            </p>
            <div className="mt-2 flex items-center gap-3 text-sm text-[#C7C2B4]">
              <StarRow value={headerRating} />
              <span>{headerRating.toFixed(2)}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#C7C2B4]">
              <span>💬 {chatMinutes} mins</span>
              <span>📞 {callMinutes} mins</span>
              {astrologer.is_busy ? (
                <span className="font-semibold text-red-600">
                  Busy · {astrologer.waiting_count} in queue
                </span>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={chatLoading}
                onClick={() => runStart()}
                className="rounded-full bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-6 py-2.5 text-sm font-semibold text-[#09142a] transition disabled:opacity-60 hover:opacity-95"
              >
                Start Chat
              </button>
              <button
                type="button"
                disabled={chatLoading}
                onClick={() => runStart("voice")}
                className="rounded-full border border-[#b18d4f]/40 bg-[#09142a] px-6 py-2.5 text-sm font-semibold text-[#C8AC80] disabled:opacity-60"
              >
                Start Call
              </button>
              <button
                type="button"
                disabled={chatLoading}
                onClick={() => runStart("video")}
                className="rounded-full border border-[#b18d4f]/40 bg-[#09142a] px-6 py-2.5 text-sm font-semibold text-[#C8AC80] disabled:opacity-60"
              >
                Start Video
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#b18d4f]/20 bg-[#0E1C3B]/95 p-4 backdrop-blur lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={chatLoading}
            onClick={() => runStart()}
            className="rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-3.5 text-sm font-bold text-[#09142a] shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chatLoading ? "…" : "Chat"}
          </button>
          <button
            type="button"
            disabled={chatLoading}
            onClick={() => runStart("voice")}
            className="rounded-xl border border-[#b18d4f]/30 bg-[#09142a]/70 py-3.5 text-sm font-bold text-[#C8AC80] shadow-sm transition hover:bg-[#09142a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chatLoading ? "…" : "Voice"}
          </button>
          <button
            type="button"
            disabled={chatLoading}
            onClick={() => runStart("video")}
            className="rounded-xl border border-[#b18d4f]/30 bg-[#09142a]/70 py-3.5 text-sm font-bold text-[#C8AC80] shadow-sm transition hover:bg-[#09142a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chatLoading ? "…" : "Video"}
          </button>
        </div>
      </div>

      {busyPromptOpen ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#F5F1E8]">Astrologer is busy</h2>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              This astrologer is in another active session.
              <span className="font-semibold">
                {" "}
                {busyQueueLength} users already waiting.
              </span>
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[#b18d4f]/30 py-2.5 text-sm font-semibold text-[#C7C2B4]"
                onClick={() => setBusyPromptOpen(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-2.5 text-sm font-semibold text-[#09142a] disabled:opacity-60 hover:opacity-95"
                onClick={joinWaitlist}
                disabled={joinWaitlistLoading}
              >
                {joinWaitlistLoading ? "Joining…" : "Join Waitlist"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rechargeOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-[#F5F1E8]">Wallet balance low</h2>
              <button
                type="button"
                className="text-[#C7C2B4] hover:text-[#C8AC80]"
                onClick={() => setRechargeOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              You need at least{" "}
              <span className="font-semibold">₹{(price * 5).toFixed(0)}</span> for
              a minimum chat ({`5 × ₹${price.toFixed(0)}`} per minute rate).
              Recharge to continue.
            </p>
            <div className="mt-5">
              <WalletWidget />
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-[#b18d4f]/30 py-2 text-sm font-semibold text-[#C7C2B4]"
              onClick={() => setRechargeOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {queueTurn ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#F5F1E8]">Your turn!</h2>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              Connecting to {queueTurn.astrologerName}...
            </p>
            <p className="mt-4 text-center text-3xl font-bold text-[#C8AC80]">
              {queueTurn.countdown}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-2.5 text-sm font-semibold text-[#09142a] hover:opacity-95"
              onClick={() => {
                goToChat(queueTurn.sessionId, queueTurn.astrologerName);
              }}
            >
              Connect Now
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
