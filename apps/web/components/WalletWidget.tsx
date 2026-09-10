"use client";

import { useCallback, useState } from "react";

import api from "@/lib/api";
import { getTenant } from "@/lib/tenants";
import { useAuthStore } from "@/lib/store";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const PRESETS = [99, 199, 499, 999];

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

type WalletWidgetProps = {
  className?: string;
};

export function WalletWidget({ className = "" }: WalletWidgetProps) {
  const tenant = getTenant();
  const { user, updateWalletBalance, isWalletRefreshing } = useAuthStore();
  const balance = user?.wallet_balance ?? 0;
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount =
    selected ?? (custom.trim() ? Number(custom) : NaN);

  const startCheckout = useCallback(async () => {
    const amount = effectiveAmount;
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Enter a valid amount (min ₹1)");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loadRazorpayScript();
      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error("Razorpay unavailable");
      }

      const orderRes = await api.post(`/api/wallet/create-order`, {
        amount,
        currency: "INR",
      });

      const d = orderRes.data?.data as {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };

      if (!d?.orderId || !d.keyId) {
        throw new Error("Could not create order");
      }

      const rzp = new Razorpay({
        key: d.keyId,
        amount: d.amount,
        currency: d.currency,
        name: tenant.name,
        description: "Wallet recharge",
        order_id: d.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setLoading(true);
          try {
            const verify = await api.post(`/api/wallet/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const bal = verify.data?.data?.wallet_balance as number | undefined;
            if (typeof bal === "number") {
              updateWalletBalance(bal);
            }
            setOpen(false);
            setSelected(null);
            setCustom("");
          } catch (e: unknown) {
            const msg =
              e &&
              typeof e === "object" &&
              "response" in e &&
              e.response &&
              typeof e.response === "object" &&
              "data" in e.response &&
              e.response.data &&
              typeof e.response.data === "object" &&
              "error" in e.response.data
                ? String((e.response.data as { error?: string }).error)
                : "Payment verification failed";
            setError(msg);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      setLoading(false);
      rzp.open();
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "response" in e &&
        e.response &&
        typeof e.response === "object" &&
        "data" in e.response &&
        e.response.data &&
        typeof e.response.data === "object" &&
        "error" in e.response.data
          ? String((e.response.data as { error?: string }).error)
          : e instanceof Error
            ? e.message
            : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveAmount, updateWalletBalance]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#b18d4f]/20 bg-[#0E1C3B] px-3 py-2 text-[#F5F1E8]">
          <WalletIcon className="h-5 w-5 text-[#C8AC80]" />
          <span className="text-sm font-semibold">
            {isWalletRefreshing ? "Updating..." : formatMoney(balance)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
            setSelected(null);
            setCustom("");
          }}
          className="rounded-full bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2 text-sm font-semibold text-[#09142a] shadow-sm transition hover:opacity-95"
        >
          Recharge
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#F5F1E8]">
                  Recharge wallet
                </h2>
                <p className="text-sm text-[#C7C2B4]">
                  Choose an amount to add to your balance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[#C7C2B4] hover:bg-[#09142a]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelected(amt);
                    setCustom("");
                    setError(null);
                  }}
                  className={`rounded-xl border-2 py-3 text-center text-sm font-semibold transition ${
                    selected === amt
                      ? "border-[#b18d4f] bg-[#b18d4f]/10 text-[#C8AC80]"
                      : "border-[#b18d4f]/10 bg-[#09142a] text-[#C7C2B4] hover:border-[#b18d4f]/40"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-[#C7C2B4]">
                Custom amount (₹)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setSelected(null);
                  setError(null);
                }}
                placeholder="e.g. 250"
                className="mt-1 w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2 text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
              />
            </div>

            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={() => void startCheckout()}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-3 text-sm font-semibold text-[#09142a] shadow-md transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Pay with Razorpay"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 7.5V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.5" />
      <path d="M3 12h18" />
      <path d="M7 15h1" />
    </svg>
  );
}
