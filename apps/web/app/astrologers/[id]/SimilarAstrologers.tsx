import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

type SimilarAstrologer = {
  id: string;
  name: string;
  profile_photo_url: string | null;
  avatar_url: string | null;
  specializations: string[];
  price_per_minute: number | null;
  rating: number | null;
};

async function fetchSimilar(id: string): Promise<SimilarAstrologer[]> {
  const url = new URL(`${API_BASE}/api/astrologers`);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", "12");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as {
    data?: { astrologers?: SimilarAstrologer[] };
  };
  const list = json.data?.astrologers ?? [];
  return list
    .filter((a) => a.id !== id)
    .slice(0, 6)
    .map((a) => ({
      ...a,
      profile_photo_url: a.profile_photo_url ?? null,
      avatar_url: a.avatar_url ?? null,
    }));
}

export function SimilarAstrologersFallback() {
  return (
    <section className="mt-8 h-40 animate-pulse rounded-2xl bg-[#0E1C3B]" />
  );
}

export async function SimilarAstrologers({ id }: { id: string }) {
  const similarAstrologers = await fetchSimilar(id);

  return (
    <section className="mt-8 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#F5F1E8]">Similar Astrologers</h2>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {similarAstrologers.map((a) => (
          <Link
            key={a.id}
            href={`/astrologers/${a.id}`}
            className="min-w-[220px] rounded-xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 text-left transition hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              {a.profile_photo_url || a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.profile_photo_url ?? a.avatar_url ?? ""}
                  alt={a.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#09142a] font-bold text-[#C8AC80]">
                  {a.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F5F1E8]">
                  {a.name}
                </p>
                <p className="truncate text-xs text-[#C7C2B4]">
                  {a.specializations.join(", ")}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-500">
              {"★".repeat(Math.max(1, Math.round(a.rating ?? 4)))}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#F5F1E8]">
              ₹{(a.price_per_minute ?? 0).toFixed(0)}/min
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
