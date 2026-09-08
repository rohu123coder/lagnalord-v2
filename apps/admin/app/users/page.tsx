"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import ClientWrapper from "../ClientWrapper";
import api from "@/lib/api";

type UserRow = {
  id: string;
  name: string;
  phone: string;
  wallet_balance: number;
  total_spent: number;
  is_suspended: boolean;
  join_date: string;
};

function formatInr(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

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

function UsersPageContent() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adjustUser, setAdjustUser] = useState<UserRow | null>(null);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [modalOk, setModalOk] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: { users: UserRow[]; total: number };
      }>("/api/admin/users", {
        params: {
          page,
          limit,
          ...(debounced ? { search: debounced } : {}),
        },
      });
      if (res.data.success) {
        setItems(res.data.data.users);
        setTotal(res.data.data.total);
      }
    } catch {
      setErr("Could not load users");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdjust(user: UserRow) {
    setAdjustUser(user);
    setDirection("credit");
    setAmount("");
    setReason("");
    setModalErr(null);
    setModalOk(null);
  }

  function closeAdjust() {
    if (submitting) {
      return;
    }
    setAdjustUser(null);
    setModalErr(null);
    setModalOk(null);
  }

  async function suspendUser(id: string) {
    if (!confirm("Suspend this user?")) return;
    try {
      await api.post(`/api/admin/users/${id}/suspend`);
      await load();
    } catch {
      setErr("Suspend failed");
    }
  }

  async function submitAdjustment(e: FormEvent) {
    e.preventDefault();
    if (!adjustUser) {
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setModalErr("Enter an amount greater than 0.");
      return;
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10 || trimmedReason.length > 500) {
      setModalErr("Reason must be 10–500 characters.");
      return;
    }

    setSubmitting(true);
    setModalErr(null);
    setModalOk(null);
    try {
      const res = await api.post<{
        success: boolean;
        data: { wallet_balance: number; amount: number; direction: string };
      }>(`/api/admin/users/${adjustUser.id}/wallet-adjustment`, {
        amount: parsedAmount,
        direction,
        reason: trimmedReason,
      });
      const nextBalance = res.data.data.wallet_balance;
      setItems((rows) =>
        rows.map((row) =>
          row.id === adjustUser.id ? { ...row, wallet_balance: nextBalance } : row
        )
      );
      setAdjustUser((current) =>
        current ? { ...current, wallet_balance: nextBalance } : current
      );
      setModalOk(
        `${direction === "credit" ? "Credited" : "Debited"} ₹${formatInr(res.data.data.amount)}. New balance: ₹${formatInr(nextBalance)}.`
      );
      setAmount("");
      setReason("");
    } catch (error) {
      setModalErr(apiErrorMessage(error, "Wallet adjustment failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Customers on the platform</p>
        </div>
        <input
          type="search"
          placeholder="Search by phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 sm:w-72"
        />
      </div>

      {err ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Total spent</th>
                <th className="px-4 py-3">Join date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={6}>
                    No users found
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.name}
                      {u.is_suspended ? (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Suspended
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.phone}</td>
                    <td className="px-4 py-3">₹{formatInr(u.wallet_balance)}</td>
                    <td className="px-4 py-3">₹{formatInr(u.total_spent)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(u.join_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openAdjust(u)}
                          className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          Adjust wallet
                        </button>
                        <button
                          type="button"
                          disabled={u.is_suspended}
                          onClick={() => void suspendUser(u.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                        >
                          Suspend
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

      {adjustUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeAdjust}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">Adjust wallet</h2>
            <p className="mt-1 text-sm text-slate-500">
              {adjustUser.name} · {adjustUser.phone}
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Current balance:{" "}
              <span className="font-semibold">₹{formatInr(adjustUser.wallet_balance)}</span>
            </p>

            <form onSubmit={(e) => void submitAdjustment(e)} className="mt-4 space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Direction
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("credit")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      direction === "credit"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("debit")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      direction === "debit"
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Debit
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount (₹)
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason (required, 10–500 characters)
                </span>
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                  placeholder="Why this adjustment is being made"
                />
              </label>

              {modalErr ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{modalErr}</p>
              ) : null}
              {modalOk ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {modalOk}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAdjust}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {submitting ? "Saving…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ClientWrapper>
      <UsersPageContent />
    </ClientWrapper>
  );
}
