"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

import api from "@/lib/api";
import { getTenant } from "@/lib/tenants";
import { getSocketApiBase } from "@/lib/socketBase";
import { useAuthStore } from "@/lib/store";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function Navbar() {
  const tenant = getTenant();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, logout, isWalletRefreshing, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calculatorsOpen, setCalculatorsOpen] = useState(false);
  const [hasOnlineAstrologers, setHasOnlineAstrologers] = useState(false);

  const centerLinks = [
    { label: "Free Kundli", href: "/kundli" },
    { label: "Horoscope", href: "/horoscope" },
    { label: "Astrology", href: "/astrology" },
    { label: "2026", href: "/horoscope?year=2026" },
    { label: "Remedies", href: "/remedies" },
    { label: "Free Reports", href: "/reports" },
    { label: "Panchang", href: "/panchang" },
  ];

  const calculatorLinks = [
    { label: "Mulank Calculator", href: "/mulank-calculator" },
    { label: "Destiny Number Calculator", href: "/destiny-number-calculator" },
    { label: "Lucky Name Numerology Calculator", href: "/lucky-name-numerology-calculator" },
    { label: "Mobile Number Numerology Calculator", href: "/mobile-number-numerology-calculator" },
    { label: "Lucky Vehicle Number Calculator", href: "/lucky-vehicle-number-calculator" },
    { label: "Love Calculator", href: "/love-calculator" },
    { label: "FLAMES Calculator", href: "/flames-calculator" },
    { label: "Friendship Calculator", href: "/friendship-calculator" },
    { label: "Name Compatibility Calculator", href: "/name-compatibility-calculator" },
    { label: "Age Calculator", href: "/age-calculator" },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      setCalculatorsOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get("/api/astrologers", {
          params: { online: true, limit: 1, page: 1 },
        });
        const total = Number(res.data?.data?.total ?? 0);
        if (!cancelled) {
          setHasOnlineAstrologers(total > 0);
        }
      } catch {
        if (!cancelled) {
          setHasOnlineAstrologers(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !isLoggedIn) {
      return;
    }
    const socket: Socket = io(getSocketApiBase(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socket.on("astrologer_status_changed", (payload: { is_online: boolean }) => {
      if (payload.is_online) {
        setHasOnlineAstrologers(true);
      } else {
        void (async () => {
          try {
            const res = await api.get("/api/astrologers", {
              params: { online: true, limit: 1, page: 1 },
            });
            const total = Number(res.data?.data?.total ?? 0);
            setHasOnlineAstrologers(total > 0);
          } catch {
            setHasOnlineAstrologers(false);
          }
        })();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, token]);

  const balance = user?.wallet_balance ?? 0;
  const role = user?.role;
  const dashboardHref =
    role === "astrologer" ? "/astrologer/dashboard" : "/dashboard";

  const isActive = useMemo(
    () => (href: string) => {
      const cleanHref = href.split("?")[0];
      if (cleanHref === "/") {
        return pathname === "/";
      }
      return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
    },
    [pathname]
  );

  const isCalculatorActive = calculatorLinks.some((link) => isActive(link.href));

  // Astrologer pages use their own dedicated navbar component.
  if (mounted && isLoggedIn && role === "astrologer") {
    return null;
  }

  const chatCta = (
    <Link
      href="/astrologers"
      className="inline-flex items-center gap-2 rounded-full bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
      onClick={() => setMenuOpen(false)}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          hasOnlineAstrologers ? "animate-online-pulse bg-emerald-200" : "bg-emerald-100"
        }`}
      />
      Chat with Astrologer
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#b18d4f]/20 bg-[#09142a]">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 min-[1600px]:max-w-[100rem]">
        <Link
          href="/"
          className="shrink-0"
          onClick={() => setMenuOpen(false)}
          aria-label={`${tenant.name} home`}
        >
          <div className="flex items-center gap-2">
            {tenant.logo.imageUrl ? (
              <Image
                src={tenant.logo.imageUrl}
                alt={tenant.name}
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : null}
            <span
              className={`text-[22px] font-bold text-[#C8AC80] ${
                tenant.logo.imageUrl ? "md:hidden" : ""
              }`}
            >
              {tenant.logo.text}
            </span>
          </div>
        </Link>

        <nav
          className="ml-4 hidden min-w-0 flex-1 items-center justify-center md:flex min-[1600px]:ml-10"
          aria-label="Main navigation"
        >
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-hidden text-sm font-medium text-[#C7C2B4] min-[1600px]:gap-4">
            {centerLinks.map((link, idx) => (
              <Fragment key={link.label}>
                {idx > 0 ? (
                  <span className="text-[#b18d4f]/20" aria-hidden="true">
                    |
                  </span>
                ) : null}
                <Link
                  href={link.href}
                  className={`whitespace-nowrap border-b-2 pb-0.5 text-[13px] font-medium transition ${
                    isActive(link.href)
                      ? "border-[#b18d4f] text-[#C8AC80]"
                      : "border-transparent text-[#C7C2B4] hover:text-[#C8AC80]"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </Fragment>
            ))}
          </div>
          <span className="shrink-0 px-1 text-[#b18d4f]/20" aria-hidden="true">
            |
          </span>
          <div className="group relative shrink-0">
            <button
              type="button"
              aria-haspopup="true"
              className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 pb-0.5 text-[13px] font-medium transition ${
                isCalculatorActive
                  ? "border-[#b18d4f] text-[#C8AC80]"
                  : "border-transparent text-[#C7C2B4] hover:text-[#C8AC80]"
              }`}
            >
                Calculators
                <svg
                  className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="invisible absolute right-0 top-full z-50 w-[36rem] pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="grid grid-cols-2 gap-x-1 rounded-xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-2 shadow-lg shadow-black/40">
                  <div className="flex flex-col">
                    {calculatorLinks.slice(0, 5).map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`rounded-md px-3 py-2 text-[13px] leading-5 transition ${
                          isActive(link.href)
                            ? "bg-[#b18d4f]/10 text-[#C8AC80]"
                            : "text-[#F5F1E8] hover:bg-[#09142a] hover:text-[#C8AC80]"
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  <div className="flex flex-col">
                    {calculatorLinks.slice(5).map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`rounded-md px-3 py-2 text-[13px] leading-5 transition ${
                          isActive(link.href)
                            ? "bg-[#b18d4f]/10 text-[#C8AC80]"
                            : "text-[#F5F1E8] hover:bg-[#09142a] hover:text-[#C8AC80]"
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </nav>

        <div className="relative z-20 hidden shrink-0 items-center gap-3 self-stretch bg-[#09142a] pl-4 md:flex min-[1600px]:gap-4">
          {!mounted ? (
            <div className="h-9 w-44 animate-pulse rounded-full bg-[#0E1C3B]" />
          ) : isLoggedIn ? (
            <>
              {role !== "astrologer" ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 sm:text-sm">
                  {isWalletRefreshing ? "Updating..." : formatMoney(balance)}
                </span>
              ) : null}
              {chatCta}
              <Link
                href={dashboardHref}
                className={`rounded-md px-2 py-1 text-sm font-semibold transition ${
                  isActive(dashboardHref)
                    ? "text-[#C8AC80]"
                    : "text-[#C7C2B4] hover:text-[#C8AC80]"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm font-semibold text-[#C7C2B4] transition hover:text-red-400"
                onClick={() => logout()}
              >
                Logout
              </button>
              <Link
                href="/astrologer/login"
                className="ml-2 hidden text-xs text-[#C7C2B4]/60 transition hover:text-[#F5F1E8] min-[1600px]:inline"
              >
                Astrologer Login
              </Link>
            </>
          ) : (
            <>
              {chatCta}
              <Link
                href="/login"
                className="rounded-full border border-transparent px-3 py-2 text-sm font-semibold text-[#C7C2B4] transition hover:text-[#C8AC80]"
                onClick={(event) => {
                  event.preventDefault();
                  router.push("/login");
                }}
              >
                Sign In
              </Link>
              <Link
                href="/login?tab=register"
                className="rounded-full bg-[#b18d4f] px-4 py-2 text-sm font-semibold text-[#09142a] transition hover:bg-[#B8960C]"
                onClick={(event) => {
                  event.preventDefault();
                  router.push("/login?tab=register");
                }}
              >
                Sign Up
              </Link>
              <Link
                href="/astrologer/login"
                className="ml-2 hidden text-xs text-[#C7C2B4]/60 transition hover:text-[#F5F1E8] min-[1600px]:inline"
                onClick={() => setMenuOpen(false)}
              >
                Astrologer Login
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {!mounted ? null : isLoggedIn && role === "user" ? (
            <span className="max-w-[6.5rem] truncate rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
              {isWalletRefreshing ? "Updating..." : formatMoney(balance)}
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#b18d4f]/40 text-[#b18d4f]"
            aria-label="Open menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && mounted ? (
        <div className="border-t border-[#b18d4f]/20 bg-[#09142a] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <div>
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[#C7C2B4]/70">
                Nav links
              </p>
              <div className="mt-2 space-y-1">
                {centerLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`block rounded-md px-3 py-2 text-sm font-medium ${
                      isActive(link.href)
                        ? "bg-[#b18d4f]/10 text-[#C8AC80]"
                        : "text-[#C7C2B4] hover:bg-[#0E1C3B]"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div>
                  <button
                    type="button"
                    aria-expanded={calculatorsOpen}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                      isCalculatorActive
                        ? "bg-[#b18d4f]/10 text-[#C8AC80]"
                        : "text-[#C7C2B4] hover:bg-[#0E1C3B]"
                    }`}
                    onClick={() => setCalculatorsOpen((open) => !open)}
                  >
                    Calculators
                    <svg
                      className={`h-4 w-4 transition ${calculatorsOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {calculatorsOpen ? (
                    <div className="mt-1 space-y-1 border-l border-[#b18d4f]/20 pl-2">
                      {calculatorLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block rounded-md px-3 py-2 text-sm font-medium ${
                            isActive(link.href)
                              ? "bg-[#b18d4f]/10 text-[#C8AC80]"
                              : "text-[#F5F1E8] hover:bg-[#0E1C3B] hover:text-[#C8AC80]"
                          }`}
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#b18d4f]/30 pt-4">
              <div className="w-full">{chatCta}</div>

              {isLoggedIn ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="block rounded-full border border-[#b18d4f]/30 px-4 py-2.5 text-center text-sm font-semibold text-[#C7C2B4] transition hover:bg-[#0E1C3B]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="block w-full rounded-full border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      className="rounded-full border border-[#b18d4f]/30 px-3 py-2.5 text-center text-sm font-semibold text-[#C7C2B4]"
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpen(false);
                        router.push("/login");
                      }}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/login?tab=register"
                      className="rounded-full bg-[#b18d4f] px-3 py-2.5 text-center text-sm font-semibold text-[#09142a]"
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpen(false);
                        router.push("/login?tab=register");
                      }}
                    >
                      Sign Up
                    </Link>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/astrologer/login"
                      className="block text-center text-xs text-[#C7C2B4]/60 transition hover:text-[#F5F1E8]"
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpen(false);
                        router.push("/astrologer/login");
                      }}
                    >
                      Astrologer Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
