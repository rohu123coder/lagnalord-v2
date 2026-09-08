"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import ClientWrapper from "../ClientWrapper";
import api from "@/lib/api";

type KbEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
  is_active: boolean;
  has_embedding?: boolean;
  created_at: string;
  updated_at: string;
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { error?: string } } }).response
      ?.data;
    if (typeof data?.error === "string" && data.error) {
      return data.error;
    }
  }
  return fallback;
}

const emptyForm = {
  category: "",
  question: "",
  answer: "",
  is_active: true,
};

function KnowledgeBasePageContent() {
  const [items, setItems] = useState<KbEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<KbEntry | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, category]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: {
          entries: KbEntry[];
          categories: string[];
          total: number;
        };
      }>("/api/admin/knowledge-base", {
        params: {
          page,
          limit,
          ...(debounced ? { search: debounced } : {}),
          ...(category ? { category } : {}),
        },
      });
      if (res.data.success) {
        setItems(res.data.data.entries);
        setCategories(res.data.data.categories);
        setTotal(res.data.data.total);
      }
    } catch (error) {
      setErr(apiErrorMessage(error, "Could not load knowledge base"));
    } finally {
      setLoading(false);
    }
  }, [page, limit, debounced, category]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(entry: KbEntry) {
    setEditing(entry);
    setForm({
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      is_active: entry.is_active,
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await api.put(`/api/admin/knowledge-base/${editing.id}`, form);
      } else {
        await api.post("/api/admin/knowledge-base", form);
      }
      resetForm();
      await load();
    } catch (error) {
      setErr(apiErrorMessage(error, "Could not save entry"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this knowledge base entry?")) return;
    try {
      await api.delete(`/api/admin/knowledge-base/${id}`);
      if (editing?.id === id) {
        resetForm();
      }
      await load();
    } catch (error) {
      setErr(apiErrorMessage(error, "Delete failed"));
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));
  const tabs = ["All", ...categories];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500">
            FAQ-style answers retrieved before Gemini for AI Astrologer and WhatsApp Q&A
          </p>
        </div>
        <input
          type="search"
          placeholder="Search question, answer, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 sm:w-80"
        />
      </div>

      {err ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const value = tab === "All" ? "" : tab;
          const active = category === value;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = customCategory.trim();
            if (next) {
              setCategory(next);
              setForm((current) => ({
                ...current,
                category: current.category || next,
              }));
              setCustomCategory("");
            }
          }}
        >
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Filter / new category"
            className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none ring-indigo-500 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Apply
          </button>
        </form>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          {editing ? "Edit entry" : "Add entry"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </span>
            <input
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. astrology"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-slate-700">Active (included in retrieval)</span>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question
          </span>
          <input
            required
            minLength={3}
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Answer
          </span>
          <textarea
            required
            minLength={3}
            rows={4}
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? "Saving…" : editing ? "Update entry" : "Add entry"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Answer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={5}>
                    No entries yet
                  </td>
                </tr>
              ) : (
                items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.category}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">{entry.question}</td>
                    <td className="max-w-md px-4 py-3 text-slate-600">
                      <span className="line-clamp-3">{entry.answer}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {entry.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEntry(entry.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  return (
    <ClientWrapper>
      <KnowledgeBasePageContent />
    </ClientWrapper>
  );
}
