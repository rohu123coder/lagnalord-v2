"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import ClientWrapper from "../ClientWrapper";
import api from "@/lib/api";

type OfferStatus = "inactive" | "scheduled" | "live" | "expired";
type AppliesTo = "ai_chat" | "human_chat" | "both";
type UnitType = "minutes" | "messages";

type Offer = {
  id: string;
  name: string;
  applies_to: AppliesTo;
  unit_type: UnitType;
  unit_value: number;
  start_at: string;
  end_at: string;
  per_user_limit: number;
  active: boolean;
  created_at: string;
  claim_count: number;
  status: OfferStatus;
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

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

const emptyForm = {
  name: "",
  applies_to: "ai_chat" as AppliesTo,
  unit_type: "messages" as UnitType,
  unit_value: "10",
  start_at: "",
  end_at: "",
  per_user_limit: "1",
  active: true,
};

const statusClass: Record<OfferStatus, string> = {
  live: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-sky-100 text-sky-800",
  expired: "bg-slate-200 text-slate-700",
  inactive: "bg-amber-100 text-amber-800",
};

function OffersPageContent() {
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: { offers: Offer[] };
      }>("/api/admin/offers");
      if (res.data.success) {
        setItems(res.data.data.offers);
      }
    } catch (error) {
      setErr(apiErrorMessage(error, "Could not load offers"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(offer: Offer) {
    setEditing(offer);
    setForm({
      name: offer.name,
      applies_to: offer.applies_to,
      unit_type: offer.unit_type,
      unit_value: String(offer.unit_value),
      start_at: toLocalInput(offer.start_at),
      end_at: toLocalInput(offer.end_at),
      per_user_limit: String(offer.per_user_limit),
      active: offer.active,
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
    const payload = {
      name: form.name.trim(),
      applies_to: form.applies_to,
      unit_type: form.unit_type,
      unit_value: Number(form.unit_value),
      start_at: toIso(form.start_at),
      end_at: toIso(form.end_at),
      per_user_limit: Number(form.per_user_limit),
      active: form.active,
    };
    try {
      if (editing) {
        await api.patch(`/api/admin/offers/${editing.id}`, payload);
      } else {
        await api.post("/api/admin/offers", payload);
      }
      resetForm();
      await load();
    } catch (error) {
      setErr(apiErrorMessage(error, "Could not save offer"));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(offer: Offer) {
    if (!confirm(`Deactivate “${offer.name}”?`)) return;
    try {
      await api.patch(`/api/admin/offers/${offer.id}`, { active: false });
      if (editing?.id === offer.id) {
        setForm((f) => ({ ...f, active: false }));
      }
      await load();
    } catch (error) {
      setErr(apiErrorMessage(error, "Could not deactivate offer"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Promotional Offers</h1>
        <p className="text-sm text-slate-500">
          Grant free AI or human-chat units before wallet debit. One claim per user per offer.
        </p>
      </div>

      {err ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          {editing ? "Edit offer" : "Create offer"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Launch week — 10 free AI messages"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Applies to
            </span>
            <select
              value={form.applies_to}
              onChange={(e) =>
                setForm((f) => ({ ...f, applies_to: e.target.value as AppliesTo }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            >
              <option value="ai_chat">AI chat</option>
              <option value="human_chat">Human chat</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unit type
            </span>
            <select
              value={form.unit_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit_type: e.target.value as UnitType }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            >
              <option value="messages">Messages</option>
              <option value="minutes">Minutes</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unit value
            </span>
            <input
              required
              type="number"
              min={1}
              value={form.unit_value}
              onChange={(e) => setForm((f) => ({ ...f, unit_value: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Per-user limit
            </span>
            <input
              required
              type="number"
              min={1}
              value={form.per_user_limit}
              onChange={(e) =>
                setForm((f) => ({ ...f, per_user_limit: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Starts
            </span>
            <input
              required
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ends
            </span>
            <input
              required
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-slate-700">Active</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? "Saving…" : editing ? "Update offer" : "Create offer"}
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Applies</th>
                <th className="px-4 py-3">Grant</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Claims</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={7}>
                    No offers yet
                  </td>
                </tr>
              ) : (
                items.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{offer.name}</td>
                    <td className="px-4 py-3 text-slate-700">{offer.applies_to}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {offer.unit_value} {offer.unit_type}
                      <span className="block text-xs text-slate-400">
                        limit {offer.per_user_limit}/user
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(offer.start_at).toLocaleString()}
                      <br />
                      {new Date(offer.end_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[offer.status]}`}
                      >
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{offer.claim_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(offer)}
                          className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        {offer.active ? (
                          <button
                            type="button"
                            onClick={() => void deactivate(offer)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Deactivate
                          </button>
                        ) : null}
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

export default function OffersPage() {
  return (
    <ClientWrapper>
      <OffersPageContent />
    </ClientWrapper>
  );
}
