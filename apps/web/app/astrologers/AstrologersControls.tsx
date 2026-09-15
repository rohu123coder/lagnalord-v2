"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type ApiSort = "rating_desc" | "price_asc" | "price_desc";
export type AstrologersView = "human" | "ai";

export const SPEC_OPTIONS = [
  "Love & Relationship",
  "Career",
  "Finance",
  "Vastu",
  "Numerology",
  "Tarot",
  "Palmistry",
] as const;

export const LANG_OPTIONS = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Bengali",
] as const;

export const SORT_OPTIONS: { label: string; value: ApiSort }[] = [
  { label: "Top Rated", value: "rating_desc" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

export const CATEGORY_PILLS = [
  "All",
  "Love",
  "Career",
  "Finance",
  "Marriage",
  "Health",
  "Vastu",
  "Numerology",
  "Tarot",
] as const;

export type CategoryPill = (typeof CATEGORY_PILLS)[number];

function FilterSidebar(props: {
  specs: Set<string>;
  langs: Set<string>;
  sort: ApiSort;
  toggleSpec: (s: string) => void;
  toggleLang: (s: string) => void;
  setSort: (s: ApiSort) => void;
  className?: string;
}) {
  const {
    specs,
    langs,
    sort,
    toggleSpec,
    toggleLang,
    setSort,
    className = "",
  } = props;
  return (
    <aside className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-[#F5F1E8]">Specialization</h3>
        <div className="mt-3 space-y-2">
          {SPEC_OPTIONS.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={specs.has(s)}
                onChange={() => toggleSpec(s)}
                className="rounded border-[#b18d4f]/40 text-[#b18d4f] focus:ring-[#b18d4f]"
              />
              <span className="text-sm text-[#C7C2B4]">{s}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#F5F1E8]">Language</h3>
        <div className="mt-3 space-y-2">
          {LANG_OPTIONS.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={langs.has(s)}
                onChange={() => toggleLang(s)}
                className="rounded border-[#b18d4f]/40 text-[#b18d4f] focus:ring-[#b18d4f]"
              />
              <span className="text-sm text-[#C7C2B4]">{s}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-bold text-[#F5F1E8]" htmlFor="sort">
          Sort
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as ApiSort)}
          className="mt-2 w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}

export function AstrologersControls({
  view,
  sort,
  specs,
  langs,
  category,
  q,
  children,
}: {
  view: AstrologersView;
  sort: ApiSort;
  specs: string[];
  langs: string[];
  category: CategoryPill;
  q: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(q);
  const specSet = new Set(specs);
  const langSet = new Set(langs);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  const replaceQuery = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `/astrologers?${qs}` : "/astrologers", { scroll: false });
  };

  const setView = (nextView: AstrologersView) => {
    replaceQuery((next) => {
      if (nextView === "human") {
        next.delete("view");
      } else {
        next.set("view", nextView);
      }
    });
  };

  const toggleSpec = (s: string) => {
    replaceQuery((next) => {
      next.delete("spec");
      const set = new Set(specs);
      if (set.has(s)) {
        set.delete(s);
      } else {
        set.add(s);
      }
      for (const value of Array.from(set)) {
        next.append("spec", value);
      }
      next.set("page", "1");
    });
  };

  const toggleLang = (s: string) => {
    replaceQuery((next) => {
      next.delete("lang");
      const set = new Set(langs);
      if (set.has(s)) {
        set.delete(s);
      } else {
        set.add(s);
      }
      for (const value of Array.from(set)) {
        next.append("lang", value);
      }
      next.set("page", "1");
    });
  };

  const setSort = (nextSort: ApiSort) => {
    replaceQuery((next) => {
      if (nextSort === "rating_desc") {
        next.delete("sort");
      } else {
        next.set("sort", nextSort);
      }
      next.set("page", "1");
    });
  };

  const setCategory = (nextCategory: CategoryPill) => {
    replaceQuery((next) => {
      if (nextCategory === "All") {
        next.delete("category");
      } else {
        next.set("category", nextCategory);
      }
      next.set("page", "1");
    });
  };

  const setSearch = (value: string) => {
    replaceQuery((next) => {
      if (!value) {
        next.delete("q");
      } else {
        next.set("q", value);
      }
      next.set("page", "1");
    });
  };

  return (
    <>
      {view === "human" ? (
        <FilterSidebar
          specs={specSet}
          langs={langSet}
          sort={sort}
          toggleSpec={toggleSpec}
          toggleLang={toggleLang}
          setSort={setSort}
          className="hidden w-64 shrink-0 lg:block"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        {view === "human" ? (
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-[#b18d4f]/30 bg-[#0E1C3B] px-3 py-2 text-sm font-semibold text-[#C7C2B4] shadow-sm lg:hidden"
              onClick={() => setSheetOpen(true)}
            >
              Filters
            </button>
          </div>
        ) : null}
        <h1 className="text-center text-3xl font-bold text-[#F5F1E8] sm:text-4xl">
          Chat with Astrologer
        </h1>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setView("human")}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
              view === "human"
                ? "border-[#b18d4f] bg-[#b18d4f] text-[#09142a]"
                : "border-[#b18d4f]/20 bg-[#0E1C3B] text-[#C7C2B4] hover:border-[#b18d4f] hover:text-[#C8AC80]"
            }`}
          >
            Human Astrologers
          </button>
          <button
            type="button"
            onClick={() => setView("ai")}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
              view === "ai"
                ? "border-[#b18d4f] bg-[#b18d4f] text-[#09142a]"
                : "border-[#b18d4f]/20 bg-[#0E1C3B] text-[#C7C2B4] hover:border-[#b18d4f] hover:text-[#C8AC80]"
            }`}
          >
            🔮 AI Astrologers
          </button>
        </div>
        {view === "human" ? (
          <>
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2">
                {CATEGORY_PILLS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      category === item
                        ? "border-[#b18d4f] bg-[#b18d4f] text-[#09142a]"
                        : "border-[#b18d4f]/20 bg-[#0E1C3B] text-[#C7C2B4] hover:border-[#b18d4f] hover:text-[#C8AC80]"
                    }`}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={searchDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchDraft(value);
                  setSearch(value);
                }}
                placeholder="Search name..."
                className="w-full rounded-xl border border-[#b18d4f]/40 bg-white px-4 py-2.5 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              />
            </div>
          </>
        ) : null}

        {children}
      </div>

      {sheetOpen && view === "human" ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#0E1C3B] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#F5F1E8]">Filters</h2>
              <button
                type="button"
                className="rounded-lg p-2 text-[#C7C2B4] hover:bg-[#09142a]"
                onClick={() => setSheetOpen(false)}
              >
                ✕
              </button>
            </div>
            <FilterSidebar
              specs={specSet}
              langs={langSet}
              sort={sort}
              toggleSpec={toggleSpec}
              toggleLang={toggleLang}
              setSort={setSort}
            />
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-3 text-sm font-semibold text-[#09142a] hover:opacity-95"
              onClick={() => setSheetOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
