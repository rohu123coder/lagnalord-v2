import Link from "next/link";
import { Suspense } from "react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

import { AstrologerBookingIsland } from "./AstrologerBookingIsland";
import {
  SimilarAstrologers,
  SimilarAstrologersFallback,
} from "./SimilarAstrologers";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
};

type RatingBreakdown = {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
};

type AstrologerDetail = {
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
    email: string;
    phone: string;
    avatar_url: string | null;
    profile_photo_url?: string | null;
  };
};

type ProfilePayload = {
  astrologer: AstrologerDetail;
  reviews: Review[];
  rating_breakdown: RatingBreakdown;
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

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-40 rounded-2xl bg-[#0E1C3B]" />
      <div className="mt-8 h-64 rounded-2xl bg-[#0E1C3B]" />
    </div>
  );
}

function NotFoundBlock({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <p className="text-[#C7C2B4]">{message}</p>
      <Link
        href="/astrologers"
        className="mt-6 inline-block font-semibold text-[#C8AC80]"
      >
        ← Back to astrologers
      </Link>
    </div>
  );
}

async function fetchProfile(id: string): Promise<ProfilePayload | null> {
  const res = await fetch(`${API_BASE}/api/astrologers/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as { data?: ProfilePayload };
  return json.data ?? null;
}

async function AstrologerProfile({ id }: { id: string }) {
  const data = await fetchProfile(id);
  if (!data) {
    return <NotFoundBlock message="Astrologer not found" />;
  }

  const { astrologer, reviews } = data;
  const ratingBreakdown = data.rating_breakdown;
  const ratingTotal = Math.max(
    1,
    ratingBreakdown[5] +
      ratingBreakdown[4] +
      ratingBreakdown[3] +
      ratingBreakdown[2] +
      ratingBreakdown[1]
  );

  return (
    <>
      <div className="mb-4 text-sm text-[#C7C2B4]">
        <Link href="/" className="hover:text-[#B8960C]">
          Home
        </Link>{" "}
        &gt;{" "}
        <Link href="/astrologers" className="hover:text-[#B8960C]">
          Astrologers
        </Link>{" "}
        &gt; <span>{astrologer.user.name}&apos;s Profile</span>
      </div>

      <AstrologerBookingIsland key={id} astrologer={astrologer} />

      <section className="mt-8 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#F5F1E8]">About me</h2>
        <p className="mt-3 whitespace-pre-wrap text-[#C7C2B4]">
          {astrologer.bio?.trim()
            ? astrologer.bio
            : "This astrologer hasn’t added a bio yet."}
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#F5F1E8]">Rating & Reviews</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-[340px,1fr]">
          <div className="rounded-xl border border-[#b18d4f]/20 p-4">
            <p className="text-4xl font-bold text-[#F5F1E8]">
              {(astrologer.rating ?? 0).toFixed(2)}
            </p>
            <p className="mt-2">
              <StarRow value={astrologer.rating} />
            </p>
            <p className="mt-1 text-sm text-[#C7C2B4]">
              {astrologer.total_reviews} total reviews
            </p>

            <div className="mt-5 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingBreakdown[star as 5 | 4 | 3 | 2 | 1] ?? 0;
                const width = (count / ratingTotal) * 100;
                return (
                  <div
                    key={star}
                    className="flex items-center gap-2 text-xs text-[#C7C2B4]"
                  >
                    <span className="w-4">{star}★</span>
                    <div className="h-2.5 flex-1 rounded-full bg-[#09142a]">
                      <div
                        className="h-2.5 rounded-full bg-amber-400"
                        style={{ width: `${Math.max(3, width)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            {reviews.length === 0 ? (
              <p className="text-sm text-[#C7C2B4]">No reviews yet.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.slice(0, 8).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[#b18d4f]/20 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#F5F1E8]">
                        {r.user_name}
                      </span>
                      <StarRow value={r.rating} />
                      <span className="text-xs text-[#C7C2B4]/70">
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#C7C2B4]">
                      {r.comment || "Great consultation and accurate guidance."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default async function AstrologerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="min-h-screen pb-28 lg:pb-10">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Suspense key={id} fallback={<ProfileSkeleton />}>
          <AstrologerProfile id={id} />
        </Suspense>
        <Suspense key={`similar-${id}`} fallback={<SimilarAstrologersFallback />}>
          <SimilarAstrologers id={id} />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
