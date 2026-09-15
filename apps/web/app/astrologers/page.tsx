import { Suspense } from "react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

import { AiAstrologerGrid } from "./AiAstrologerGrid";
import { AstrologerDirectory, SkeletonGrid, type Astro } from "./AstrologerDirectory";
import {
  AstrologersControls,
  CATEGORY_PILLS,
  type ApiSort,
  type AstrologersView,
  type CategoryPill,
} from "./AstrologersControls";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

const SORTS: ApiSort[] = ["rating_desc", "price_asc", "price_desc"];

function toList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseView(value: string | string[] | undefined): AstrologersView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "ai" ? "ai" : "human";
}

function parseSort(value: string | string[] | undefined): ApiSort {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && SORTS.includes(raw as ApiSort) ? (raw as ApiSort) : "rating_desc";
}

function parseCategory(value: string | string[] | undefined): CategoryPill {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && CATEGORY_PILLS.includes(raw as CategoryPill)
    ? (raw as CategoryPill)
    : "All";
}

function parseQ(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? "";
}

async function fetchAstrologersPage(page: number, sort: ApiSort) {
  const url = new URL(`${API_BASE}/api/astrologers`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "50");
  url.searchParams.set("sort", sort);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Could not fetch astrologers");
  }
  const json = (await res.json()) as {
    data?: { astrologers: Astro[]; page: number; limit: number; total: number };
  };
  return (
    json.data ?? {
      astrologers: [] as Astro[],
      page,
      limit: 50,
      total: 0,
    }
  );
}

async function fetchAllAstrologers(sort: ApiSort): Promise<Astro[]> {
  const first = await fetchAstrologersPage(1, sort);
  const all = [...first.astrologers];
  const totalPages = Math.ceil(first.total / first.limit);
  let p = 2;
  while (p <= totalPages && p <= 30) {
    const next = await fetchAstrologersPage(p, sort);
    all.push(...next.astrologers);
    p++;
  }
  return all.map((a) => ({
    ...a,
    profile_photo_url: a.profile_photo_url ?? null,
    chat_available: a.chat_available ?? true,
    voice_available: a.voice_available ?? false,
    video_available: a.video_available ?? false,
  }));
}

async function HumanAstrologerList({ sort }: { sort: ApiSort }) {
  let astrologers: Astro[] = [];
  try {
    astrologers = await fetchAllAstrologers(sort);
  } catch {
    astrologers = [];
  }
  return <AstrologerDirectory astrologers={astrologers} />;
}

export default async function AstrologersPage({
  searchParams,
}: {
  searchParams: {
    view?: string | string[];
    sort?: string | string[];
    spec?: string | string[];
    lang?: string | string[];
    category?: string | string[];
    q?: string | string[];
  };
}) {
  const view = parseView(searchParams.view);
  const sort = parseSort(searchParams.sort);
  const specs = toList(searchParams.spec);
  const langs = toList(searchParams.lang);
  const category = parseCategory(searchParams.category);
  const q = parseQ(searchParams.q);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:flex lg:gap-8 lg:py-10">
        <AstrologersControls
          view={view}
          sort={sort}
          specs={specs}
          langs={langs}
          category={category}
          q={q}
        >
          {view === "human" ? (
            <Suspense
              key={`human-${sort}-${view}`}
              fallback={
                <div className="mt-8">
                  <p className="mt-3 text-sm text-[#C7C2B4]">Loading…</p>
                  <div className="mt-8">
                    <SkeletonGrid />
                  </div>
                </div>
              }
            >
              <HumanAstrologerList sort={sort} />
            </Suspense>
          ) : (
            <Suspense
              key={`ai-${view}`}
              fallback={
                <div className="mt-8">
                  <p className="text-center text-sm text-[#C7C2B4]">Loading…</p>
                </div>
              }
            >
              <AiAstrologerGrid />
            </Suspense>
          )}
        </AstrologersControls>
      </div>
      <Footer />
    </div>
  );
}
