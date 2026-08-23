"use client";

import Link from "next/link";
import { useState } from "react";

import api from "@/lib/api";

type PasswordResetRequestFormProps = {
  heading: string;
  subtext: string;
  submitEndpoint: string;
  backHref: string;
};

export function PasswordResetRequestForm({
  heading,
  subtext,
  submitEndpoint,
  backHref,
}: PasswordResetRequestFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmedEmail = email.trim();

    setError(null);
    if (!trimmedEmail) {
      setError("Enter your registered email");
      return;
    }

    setLoading(true);
    try {
      await api.post(submitEndpoint, { email: trimmedEmail });
      setSuccessEmail(trimmedEmail);
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "response" in e &&
        e.response &&
        typeof e.response === "object" &&
        "status" in e.response &&
        e.response.status === 404
          ? "No account found with this email"
          : "Failed to send reset link";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] to-[#0F2240]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-2xl border border-[#C9A227]/20 bg-[#0F2240] p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-[#F5F1E8]">{heading}</h1>
          <p className="mt-2 text-sm text-[#C7C2B4]">{subtext}</p>

          <div className="mt-8 space-y-4">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#C9A227]/20 bg-[#0A1A2F] px-4 py-3 text-[#F5F1E8] outline-none focus:ring-2 focus:ring-[#C9A227]"
            />

            {successEmail ? (
              <p className="text-sm text-emerald-600">
                Reset link sent to {successEmail}. Check your inbox.
              </p>
            ) : null}

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="w-full rounded-xl bg-gradient-to-r from-[#2A7D7B] to-[#3A9D9B] py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>

          <Link
            href={backHref}
            className="mt-6 block text-center text-sm text-[#E0C158] hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
