import Link from "next/link";

import { firstName } from "@/lib/utils";

export type HomepageAstro = {
  id: string;
  name: string;
  avatar_url: string | null;
  profile_photo_url?: string | null;
  specializations: string[];
  languages: string[];
  rating: number | null;
  price_per_minute: number | null;
  is_available: boolean;
  is_online?: boolean;
  experience_years: number | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

async function fetchFeaturedAstrologers(): Promise<HomepageAstro[]> {
  const url = new URL(`${API_BASE}/api/astrologers`);
  url.searchParams.set("limit", "6");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as {
    data?: { astrologers: HomepageAstro[] };
  };
  return json.data?.astrologers ?? [];
}

export function FeaturedAstrologersSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Consult Astrologer on Call &amp; Chat</h2>
          <p className="mt-1 text-sm text-[#C7C2B4]">
            Verified experts available now for instant call and chat sessions.
          </p>
        </div>
        <Link href="/astrologers" className="text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80] hover:underline">
          View all astrologers
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-52 animate-pulse rounded-2xl bg-[#0E1C3B]/60" />
        ))}
      </div>
    </section>
  );
}

export async function FeaturedAstrologers() {
  let featured: HomepageAstro[] = [];
  try {
    featured = await fetchFeaturedAstrologers();
  } catch {
    featured = [];
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Consult Astrologer on Call &amp; Chat</h2>
          <p className="mt-1 text-sm text-[#C7C2B4]">
            Verified experts available now for instant call and chat sessions.
          </p>
        </div>
        <Link href="/astrologers" className="text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80] hover:underline">
          View all astrologers
        </Link>
      </div>
      <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
        {featured.map((astrologer) => (
          <article
            key={astrologer.id}
            className="min-w-[270px] snap-start rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 shadow-sm transition hover:shadow-md md:min-w-[320px]"
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                {astrologer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={astrologer.avatar_url}
                    alt={firstName(astrologer.name)}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#b18d4f] to-[#A6745A] text-lg font-bold text-[#09142a]">
                    {firstName(astrologer.name).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-1 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0E1C3B] bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-bold text-[#F5F1E8]">{firstName(astrologer.name)}</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Verified
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#C7C2B4]">
                  {astrologer.experience_years ?? 0}+ years experience
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(astrologer.specializations ?? []).slice(0, 3).map((specialization) => (
                <span
                  key={`${astrologer.id}-${specialization}`}
                  className="rounded-full bg-[#0E1C3B]/40 px-2 py-1 text-xs font-medium text-[#C8AC80]"
                >
                  {specialization}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="font-semibold text-[#C8AC80]">
                ₹{astrologer.price_per_minute ?? 0}/min
              </p>
              <p className="text-amber-500">
                {"★".repeat(Math.max(1, Math.round(astrologer.rating ?? 4)))}
                <span className="text-[#C7C2B4]/30">
                  {"★".repeat(5 - Math.max(1, Math.round(astrologer.rating ?? 4)))}
                </span>
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/astrologers/${astrologer.id}`}
                className="rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-3 py-2 text-center text-sm font-semibold text-[#09142a] transition hover:opacity-95"
              >
                Call
              </Link>
              <Link
                href={`/astrologers/${astrologer.id}`}
                className="rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-3 py-2 text-center text-sm font-semibold text-[#09142a] transition hover:opacity-95"
              >
                Chat
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
