"use client";

import { useCallback, useEffect, useState } from "react";

import ClientWrapper from "../ClientWrapper";
import api from "@/lib/api";

type AiAstrologerRow = {
  id: string;
  name: string;
  photo_url: string | null;
  emoji: string;
  tagline: string;
  rate_per_min: number;
  personality_prompt: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type FormState = {
  name: string;
  photo_url: string;
  emoji: string;
  tagline: string;
  rate_per_min: string;
  personality_prompt: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: FormState = {
  name: "",
  photo_url: "",
  emoji: "🔮",
  tagline: "",
  rate_per_min: "5",
  personality_prompt: "",
  is_active: true,
  sort_order: "0",
};

function AiAstrologersPageContent() {
  const [items, setItems] = useState<AiAstrologerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: { astrologers: AiAstrologerRow[] };
      }>("/api/admin/ai-astrologers");
      if (res.data.success) {
        setItems(res.data.data.astrologers);
      }
    } catch {
      setErr("Could not load AI astrologers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(row: AiAstrologerRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      photo_url: row.photo_url ?? "",
      emoji: row.emoji,
      tagline: row.tagline,
      rate_per_min: String(row.rate_per_min),
      personality_prompt: row.personality_prompt,
      is_active: row.is_active,
      sort_order: String(row.sort_order),
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        name: form.name,
        photo_url: form.photo_url.trim() ? form.photo_url.trim() : null,
        emoji: form.emoji,
        tagline: form.tagline,
        rate_per_min: Number(form.rate_per_min),
        personality_prompt: form.personality_prompt,
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
      };
      if (editingId) {
        await api.put(`/api/admin/ai-astrologers/${editingId}`, payload);
      } else {
        await api.post("/api/admin/ai-astrologers", payload);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch {
      setErr("Could not save AI astrologer");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this AI astrologer? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/ai-astrologers/${id}`);
      await load();
    } catch {
      setErr("Could not delete AI astrologer");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Astrologers</h1>
          <p className="text-sm text-slate-500">
            Manage the AI astrologer personas shown to users
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add AI Astrologer
        </button>
      </div>

      {err ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? "Edit AI Astrologer" : "New AI Astrologer"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Emoji
              </label>
              <input
                required
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tagline
              </label>
              <input
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Photo URL (optional)
              </label>
              <input
                value={form.photo_url}
                onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Rate per minute (₹)
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.rate_per_min}
                onChange={(e) => setForm((f) => ({ ...f, rate_per_min: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Sort order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">
                Active (visible to users)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Personality prompt (defines tone, style, specialty)
              </label>
              <textarea
                required
                minLength={20}
                rows={5}
                value={form.personality_prompt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, personality_prompt: e.target.value }))
                }
                placeholder="You are [Name], an astrologer who... Describe tone, specialty, language style."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Astrologer</th>
                <th className="px-4 py-3">Tagline</th>
                <th className="px-4 py-3">Rate/min</th>
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
                    No AI astrologers yet
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className="mr-2">{a.emoji}</span>
                      {a.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.tagline}</td>
                    <td className="px-4 py-3 text-slate-600">
                      ₹{a.rate_per_min.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {a.is_active ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(a.id)}
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
      </div>
    </div>
  );
}

export default function AiAstrologersPage() {
  return (
    <ClientWrapper>
      <AiAstrologersPageContent />
    </ClientWrapper>
  );
}
