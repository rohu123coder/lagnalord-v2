"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/store";

const PENDING_KEY = "divinemarg_astrologer_pending";

export default function AstrologerPendingPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<{ name: string; email: string } | null>(
    null
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: string; email?: string };
      if (parsed?.name && parsed?.email) {
        setDetails({ name: parsed.name, email: parsed.email });
      }
    } catch {
      // Ignore malformed localStorage.
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (isLoggedIn && user?.role === "astrologer" && user?.isApproved) {
      router.replace("/astrologer/dashboard");
    }
  }, [mounted, isLoggedIn, user?.role, user?.isApproved, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#b18d4f] border-t-transparent" />
      </div>
    );
  }

  const name = details?.name ?? "Astrologer";
  const email = details?.email ?? "your email";

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-xl flex-col px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-[#F5F1E8]">
          Application Submitted
        </h1>

        <p className="mt-3 text-sm text-[#C7C2B4]">
          Your application is under review. We&apos;ll notify you at{" "}
          <span className="font-semibold text-[#F5F1E8]">{email}</span> once approved.
          This usually takes 24-48 hours.
        </p>

        <div className="mt-8 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#F5F1E8]">
            Submitted details
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#C7C2B4]">
                Name
              </p>
              <p className="mt-1 text-sm font-semibold text-[#F5F1E8]">
                {name}
              </p>
            </div>
            <div className="rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#C7C2B4]">
                Email
              </p>
              <p className="mt-1 text-sm font-semibold text-[#F5F1E8]">
                {email}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-6 py-3 text-sm font-semibold text-[#09142a] shadow-md transition hover:opacity-95"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

