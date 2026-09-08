"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import ClientWrapper from "../ClientWrapper";
import api from "@/lib/api";

const KEYS = {
  platformName: "platform_name",
  commissionPct: "commission_percentage",
  minRecharge: "minimum_recharge_amount",
  supportPhone: "support_phone",
} as const;

const POPUP_KEYS = {
  enabled: "popup_enabled",
  headline: "popup_headline",
  subtext: "popup_subtext",
  offerText: "popup_offer_text",
  button1: "popup_button1_label",
  button2: "popup_button2_label",
} as const;

type FormVals = {
  platformName: string;
  commissionPct: string;
  minRecharge: string;
  supportPhone: string;
};

type PopupFormVals = {
  popupEnabled: boolean;
  popupHeadline: string;
  popupSubtext: string;
  popupOfferText: string;
  popupButton1: string;
  popupButton2: string;
};

function SettingsPageContent() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormVals>({
    defaultValues: {
      platformName: "",
      commissionPct: "",
      minRecharge: "",
      supportPhone: "",
    },
  });

  const {
    register: registerPopup,
    handleSubmit: handlePopupSubmit,
    reset: resetPopup,
    formState: { isSubmitting: popupSubmitting },
  } = useForm<PopupFormVals>({
    defaultValues: {
      popupEnabled: false,
      popupHeadline: "",
      popupSubtext: "",
      popupOfferText: "",
      popupButton1: "",
      popupButton2: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: { settings: Record<string, string | null> };
        }>("/api/admin/settings");
        if (cancelled || !res.data.success) return;
        const s = res.data.data.settings;
        reset({
          platformName: s[KEYS.platformName] ?? "",
          commissionPct: s[KEYS.commissionPct] ?? "",
          minRecharge: s[KEYS.minRecharge] ?? "",
          supportPhone: s[KEYS.supportPhone] ?? "",
        });
        resetPopup({
          popupEnabled: s[POPUP_KEYS.enabled] === "true",
          popupHeadline: s[POPUP_KEYS.headline] ?? "",
          popupSubtext: s[POPUP_KEYS.subtext] ?? "",
          popupOfferText: s[POPUP_KEYS.offerText] ?? "",
          popupButton1: s[POPUP_KEYS.button1] ?? "",
          popupButton2: s[POPUP_KEYS.button2] ?? "",
        });
      } catch {
        if (!cancelled) setLoadError("Could not load settings");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset, resetPopup]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(t);
  }, [saved]);

  async function onSubmit(values: FormVals) {
    setLoadError(null);
    const commissionNum = Number(values.commissionPct);
    if (
      values.commissionPct !== "" &&
      (Number.isNaN(commissionNum) ||
        commissionNum < 0 ||
        commissionNum > 100)
    ) {
      setLoadError("Commission must be between 0 and 100");
      return;
    }
    try {
      await api.put("/api/admin/settings", {
        [KEYS.platformName]: values.platformName || null,
        [KEYS.commissionPct]: values.commissionPct || null,
        [KEYS.minRecharge]: values.minRecharge || null,
        [KEYS.supportPhone]: values.supportPhone || null,
      });
      setSaved(true);
    } catch {
      setLoadError("Save failed");
    }
  }

  async function onPopupSubmit(values: PopupFormVals) {
    setLoadError(null);
    try {
      await api.put("/api/admin/settings", {
        [POPUP_KEYS.enabled]: values.popupEnabled ? "true" : "false",
        [POPUP_KEYS.headline]: values.popupHeadline,
        [POPUP_KEYS.subtext]: values.popupSubtext,
        [POPUP_KEYS.offerText]: values.popupOfferText,
        [POPUP_KEYS.button1]: values.popupButton1,
        [POPUP_KEYS.button2]: values.popupButton2,
      });
      setSaved(true);
    } catch {
      setLoadError("Save failed");
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2";

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Platform-wide configuration</p>
      </div>

      {loadError ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {saved ? (
        <div
          className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Settings saved successfully.
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Platform name
          </label>
          <p className="text-xs text-slate-500">Shown for white-label branding</p>
          <input className={fieldClass} {...register("platformName")} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Commission percentage
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            className={fieldClass}
            {...register("commissionPct")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Minimum recharge amount (INR)
          </label>
          <input
            type="number"
            min={0}
            step="1"
            className={fieldClass}
            {...register("minRecharge")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Support phone number
          </label>
          <input className={fieldClass} {...register("supportPhone")} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save settings"}
        </button>
      </form>

      <form
        onSubmit={handlePopupSubmit(onPopupSubmit)}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Homepage Popup</h2>
          <p className="text-sm text-slate-500">
            Optional overlay on the public homepage. Off until you enable it. All
            copy comes from these fields — nothing is hardcoded on the site.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            {...registerPopup("popupEnabled")}
          />
          Show popup on homepage
        </label>

        <div>
          <label className="block text-sm font-medium text-slate-700">Headline</label>
          <input className={fieldClass} {...registerPopup("popupHeadline")} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Subtext / offer description
          </label>
          <textarea
            rows={3}
            className={fieldClass}
            {...registerPopup("popupSubtext")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Offer text</label>
          <p className="text-xs text-slate-500">Highlighted line, e.g. a promo phrase</p>
          <input className={fieldClass} {...registerPopup("popupOfferText")} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Button 1 label</label>
          <input className={fieldClass} {...registerPopup("popupButton1")} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Button 2 label</label>
          <input className={fieldClass} {...registerPopup("popupButton2")} />
        </div>

        <button
          type="submit"
          disabled={popupSubmitting}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {popupSubmitting ? "Saving…" : "Save popup"}
        </button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ClientWrapper>
      <SettingsPageContent />
    </ClientWrapper>
  );
}
