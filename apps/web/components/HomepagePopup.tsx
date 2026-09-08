"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getTenant } from "@/lib/tenants";

const STORAGE_KEY = "ll-homepage-popup-seen";

type PopupSettings = {
  popup_enabled: string;
  popup_headline: string;
  popup_subtext: string;
  popup_offer_text: string;
  popup_button1_label: string;
  popup_button2_label: string;
};

export function HomepagePopup() {
  const tenant = getTenant();
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<PopupSettings | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/settings/public", { cache: "no-store" });
        const json = (await res.json()) as { success?: boolean; data?: PopupSettings };
        if (cancelled || !res.ok || !json.data) {
          return;
        }
        if (json.data.popup_enabled !== "true") {
          return;
        }
        sessionStorage.setItem(STORAGE_KEY, "1");
        setCopy(json.data);
        setOpen(true);
      } catch {
        // Stay closed; homepage still works without the popup.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    setOpen(false);
  }

  if (!open || !copy) {
    return null;
  }

  const logoSrc = tenant.logo.imageUrl;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#09142a]/80 p-4"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="homepage-popup-headline"
        className="relative w-full max-w-md rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full px-2 py-1 text-sm text-[#C7C2B4] transition hover:text-[#C8AC80]"
        >
          ✕
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#b18d4f]/20 bg-[#09142a]">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={tenant.name}
              width={56}
              height={56}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <span className="px-1 text-center text-[10px] font-bold leading-tight text-[#C8AC80]">
              {tenant.logo.text}
            </span>
          )}
        </div>

        {copy.popup_headline ? (
          <h2
            id="homepage-popup-headline"
            className="mt-4 text-center text-2xl font-extrabold text-[#F5F1E8]"
          >
            {copy.popup_headline}
          </h2>
        ) : null}

        {copy.popup_offer_text ? (
          <p className="mt-2 text-center text-lg font-semibold text-[#C8AC80]">
            {copy.popup_offer_text}
          </p>
        ) : null}

        {copy.popup_subtext ? (
          <p className="mt-3 text-center text-sm leading-6 text-[#C7C2B4]">
            {copy.popup_subtext}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {copy.popup_button1_label ? (
            <Link
              href="/astrologers"
              onClick={close}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[#b18d4f] px-4 py-2.5 text-sm font-semibold text-[#09142a] transition hover:bg-[#C8AC80]"
            >
              {copy.popup_button1_label}
            </Link>
          ) : null}
          {copy.popup_button2_label ? (
            <Link
              href="/astrologers"
              onClick={close}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[#b18d4f]/20 bg-[#09142a] px-4 py-2.5 text-sm font-semibold text-[#F5F1E8] transition hover:border-[#b18d4f] hover:text-[#C8AC80]"
            >
              {copy.popup_button2_label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
