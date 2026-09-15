"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

import api from "@/lib/api";
import { firstName } from "@/lib/utils";
import { getSocketApiBase } from "@/lib/socketBase";
import { useAuthStore } from "@/lib/store";

import type { HomepageAstro } from "@/components/FeaturedAstrologers";

export function LiveAstrologersIsland({ initial }: { initial: HomepageAstro[] }) {
  const { token, isLoggedIn } = useAuthStore();
  const [liveAstrologers, setLiveAstrologers] = useState<HomepageAstro[]>(initial);

  useEffect(() => {
    setLiveAstrologers(initial);
  }, [initial]);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      return;
    }
    const socket: Socket = io(getSocketApiBase(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on(
      "astrologer_status_changed",
      async (payload: { astrologerId: string; is_online: boolean }) => {
        if (!payload.is_online) {
          setLiveAstrologers((prev) =>
            prev.filter((astro) => astro.id !== payload.astrologerId)
          );
          return;
        }
        try {
          const res = await api.get(`/api/astrologers`, {
            params: { online: true, limit: 10, page: 1 },
          });
          setLiveAstrologers((res.data?.data?.astrologers as HomepageAstro[] | undefined) ?? []);
        } catch {
          // no-op for live refresh errors
        }
      }
    );

    return () => {
      socket.off("astrologer_status_changed");
      socket.disconnect();
    };
  }, [isLoggedIn, token]);

  if (liveAstrologers.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#C8AC80]">Live Astrologers</h2>
        <Link href="/astrologers" className="text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80] hover:underline">
          View all
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {liveAstrologers.map((astrologer) => (
          <article
            key={`live-${astrologer.id}`}
            className="min-w-[240px] rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {astrologer.profile_photo_url || astrologer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={astrologer.profile_photo_url ?? astrologer.avatar_url ?? ""}
                    alt={firstName(astrologer.name)}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#b18d4f] to-[#A6745A] text-sm font-bold text-[#09142a]">
                    {firstName(astrologer.name).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="animate-online-pulse absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0E1C3B] bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F5F1E8]">
                  {firstName(astrologer.name)}
                </p>
                <p className="text-xs text-[#C7C2B4]">
                  ₹{astrologer.price_per_minute ?? 0}/min
                </p>
              </div>
            </div>
            <Link
              href={`/astrologers/${astrologer.id}`}
              className="mt-4 block rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-2 text-center text-sm font-semibold text-[#09142a] hover:opacity-95"
            >
              Chat Now
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
