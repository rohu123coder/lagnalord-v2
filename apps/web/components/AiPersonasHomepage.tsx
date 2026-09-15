import Link from "next/link";

type AiAstrologerCard = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  photo_url: string | null;
  rate_per_min: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

async function fetchPersonas(): Promise<AiAstrologerCard[]> {
  try {
    const res = await fetch(`${API_BASE}/api/ai-astrologer/personas`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const json = (await res.json()) as { personas?: AiAstrologerCard[] };
    return json.personas ?? [];
  } catch {
    return [];
  }
}

export async function AiPersonasHomepage() {
  const aiAstrologers = await fetchPersonas();

  if (aiAstrologers.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#F5F1E8] sm:text-3xl">
            🔮 AI Astrologers
          </h2>
          <p className="mt-1 text-sm text-[#C7C2B4]">
            Instant answers powered by AI — chat now
          </p>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {aiAstrologers.map((a) => (
          <Link
            key={a.id}
            href={`/ai-astrologers/${a.id}`}
            className="flex flex-col items-center rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-4 text-center transition duration-200 hover:-translate-y-1 hover:border-[#b18d4f]/50 hover:shadow-md"
          >
            {a.photo_url ? (
              <img
                src={a.photo_url}
                alt={a.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#09142a] text-3xl">
                {a.emoji}
              </span>
            )}
            <p className="mt-3 text-sm font-semibold text-[#F5F1E8]">{a.name}</p>
            <p className="mt-1 line-clamp-1 text-xs text-[#C7C2B4]">{a.tagline}</p>
            <p className="mt-2 text-xs font-medium text-[#C8AC80]">
              ₹{a.rate_per_min}/message
            </p>
            <span className="mt-3 w-full rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-3 py-1.5 text-xs font-semibold text-[#09142a] hover:opacity-95">
              Chat karein
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
