"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import { AstrologerCard } from "@/components/AstrologerCard";
import api from "@/lib/api";
import { getSocketApiBase } from "@/lib/socketBase";
import { useAuthStore } from "@/lib/store";

import { CATEGORY_PILLS } from "./AstrologersControls";

export type Astro = {
  id: string;
  name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
  specializations: string[];
  languages: string[];
  rating: number | null;
  total_reviews: number;
  price_per_minute: number | null;
  is_available: boolean;
  is_online: boolean;
  is_verified?: boolean;
  chat_available: boolean;
  voice_available: boolean;
  video_available: boolean;
  is_busy: boolean;
  waiting_count: number;
  avg_session_duration: number | null;
  estimated_wait: number;
  experience_years: number | null;
};

const PAGE_SIZE = 9;

export function SkeletonGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl bg-[#0E1C3B]/80" />
      ))}
    </div>
  );
}

function matchesCategory(a: Astro, category: string): boolean {
  if (category === "All") {
    return true;
  }
  const lowered = category.toLowerCase();
  return a.specializations.some((spec) => {
    const s = spec.toLowerCase();
    if (lowered === "love" || lowered === "marriage") {
      return s.includes("love") || s.includes("relationship") || s.includes("marriage");
    }
    return s.includes(lowered);
  });
}

function matchesFilters(a: Astro, specs: string[], langs: string[]): boolean {
  if (specs.length > 0 && !specs.some((s) => a.specializations.includes(s))) {
    return false;
  }
  if (langs.length > 0 && !langs.some((l) => a.languages.includes(l))) {
    return false;
  }
  return true;
}

export function AstrologerDirectory({ astrologers }: { astrologers: Astro[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, user, token } = useAuthStore();
  const [rows, setRows] = useState<Astro[]>(astrologers);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    astrologer: Astro;
    callType: "voice" | "video";
    required: number;
  } | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    setRows(astrologers);
  }, [astrologers]);

  useEffect(() => {
    if (!token || !isLoggedIn) {
      return;
    }
    const socket: Socket = io(getSocketApiBase(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socket.on(
      "astrologer_status_changed",
      (payload: { astrologerId: string; is_online: boolean }) => {
        setRows((prev) =>
          prev.map((astro) =>
            astro.id === payload.astrologerId
              ? { ...astro, is_online: payload.is_online }
              : astro
          )
        );
      }
    );
    return () => {
      socket.off("astrologer_status_changed");
      socket.disconnect();
    };
  }, [isLoggedIn, token]);

  const specs = searchParams.getAll("spec");
  const langs = searchParams.getAll("lang");
  const categoryParam = searchParams.get("category");
  const category = CATEGORY_PILLS.includes(
    categoryParam as (typeof CATEGORY_PILLS)[number]
  )
    ? (categoryParam as (typeof CATEGORY_PILLS)[number])
    : "All";
  const search = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((a) => matchesFilters(a, specs, langs))
      .filter((a) => matchesCategory(a, category))
      .filter((a) => (term ? a.name.toLowerCase().includes(term) : true));
  }, [category, langs, rows, search, specs]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(nextPage));
    }
    const qs = next.toString();
    router.replace(qs ? `/astrologers?${qs}` : "/astrologers", { scroll: false });
  };

  const startSession = useCallback(
    async (astrologer: Astro, callType: "chat" | "voice" | "video") => {
      const actionKey = `${astrologer.id}:${callType}`;
      setActionLoadingKey(actionKey);
      setError(null);
      try {
        let res;
        try {
          res = await api.post(`/api/sessions/request`, {
            astrologerId: astrologer.id,
            sessionType: callType === "chat" ? undefined : callType,
          });
        } catch (e: unknown) {
          const status =
            e &&
            typeof e === "object" &&
            "response" in e &&
            e.response &&
            typeof e.response === "object" &&
            "status" in e.response
              ? Number(e.response.status)
              : null;
          if (status !== 404) {
            throw e;
          }
          res = await api.post(`/api/chat/request`, {
            astrologer_id: astrologer.id,
          });
        }

        const sessionId = (res.data?.data?.session_id ??
          res.data?.data?.sessionId) as string | undefined;
        if (!sessionId) {
          throw new Error("No session returned");
        }

        const name = encodeURIComponent(astrologer.name);
        const autoCallQuery =
          callType === "voice" || callType === "video"
            ? `&autoCall=${callType}`
            : "";
        router.push(`/chat/${sessionId}?name=${name}${autoCallQuery}`);
      } catch {
        setError("Could not start session. Please try again.");
      } finally {
        setActionLoadingKey(null);
      }
    },
    [router]
  );

  const handleCardAction = useCallback(
    (astrologer: Astro, callType: "chat" | "voice" | "video") => {
      if (!isLoggedIn) {
        router.push(`/login?redirect=${encodeURIComponent("/astrologers")}`);
        return;
      }

      if (callType === "voice" || callType === "video") {
        const rate = Number(astrologer.price_per_minute ?? 0);
        const required = Math.max(0, rate * 3);
        const balance = Number(user?.wallet_balance ?? 0);
        if (balance < required) {
          setPendingAction({ astrologer, callType, required });
          return;
        }
      }

      void startSession(astrologer, callType);
    },
    [isLoggedIn, router, startSession, user?.wallet_balance]
  );

  return (
    <>
      <p className="mt-3 text-sm text-[#C7C2B4]">
        {`${totalFiltered} astrologer${totalFiltered === 1 ? "" : "s"} found`}
      </p>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {slice.map((a) => (
            <AstrologerCard
              key={a.id}
              {...a}
              languages={a.languages}
              total_reviews={a.total_reviews}
              is_online={a.is_online}
              is_verified={a.is_verified ?? false}
              estimated_wait={a.estimated_wait}
              actionLoading={actionLoadingKey?.startsWith(a.id) ?? false}
              onChatNow={() => handleCardAction(a, "chat")}
              onVoiceCall={() => handleCardAction(a, "voice")}
              onVideoCall={() => handleCardAction(a, "video")}
            />
          ))}
        </div>
      </div>

      {totalFiltered === 0 ? (
        <p className="mt-10 text-center text-[#C7C2B4]">
          No astrologers match these filters. Try adjusting your selection.
        </p>
      ) : null}

      {totalFiltered > 0 ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            className="rounded-lg border border-[#b18d4f]/30 bg-[#0E1C3B] px-4 py-2 text-sm font-medium text-[#C7C2B4] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#C7C2B4]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            className="rounded-lg border border-[#b18d4f]/30 bg-[#0E1C3B] px-4 py-2 text-sm font-medium text-[#C7C2B4] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#F5F1E8]">Wallet balance low</h2>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              Minimum ₹{pendingAction.required.toFixed(0)} required to start a{" "}
              {pendingAction.callType} call. Recharge now?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[#b18d4f]/30 py-2.5 text-sm font-semibold text-[#C7C2B4]"
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-2.5 text-sm font-semibold text-[#09142a] hover:opacity-95"
                onClick={() => {
                  setPendingAction(null);
                  router.push("/dashboard");
                }}
              >
                Recharge
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
