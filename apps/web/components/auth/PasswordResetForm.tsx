"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import api from "@/lib/api";

type PasswordResetFormProps = {
  heading: string;
  submitEndpoint: string;
  loginHref: string;
  expiredBackHref: string;
};

export function PasswordResetForm({
  heading,
  submitEndpoint,
  loginHref,
  expiredBackHref,
}: PasswordResetFormProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    if (!token) {
      setError("This link has expired. Request a new one.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post(submitEndpoint, { token, newPassword });
      setSuccess(true);
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
          : "This link has expired. Request a new one.";
      setError(
        msg === "Invalid or expired token"
          ? "This link has expired. Request a new one."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const expired = error === "This link has expired. Request a new one.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09142a] to-[#0E1C3B]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-[#F5F1E8]">{heading}</h1>

          {success ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-emerald-600">
                Password reset successfully!
              </p>
              <Link
                href={loginHref}
                className="block text-sm font-semibold text-[#C8AC80] hover:underline"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <input
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] outline-none focus:ring-2 focus:ring-[#b18d4f]"
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3 text-[#F5F1E8] outline-none focus:ring-2 focus:ring-[#b18d4f]"
              />

              {error ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                  {expired ? (
                    <Link
                      href={expiredBackHref}
                      className="block text-sm text-[#C8AC80] hover:underline"
                    >
                      Request a new reset link
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                disabled={loading}
                onClick={() => void submit()}
                className="w-full rounded-xl bg-[#b18d4f] hover:bg-[#8E713F] hover:text-white py-3 text-sm font-semibold text-[#09142a] disabled:opacity-60"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
