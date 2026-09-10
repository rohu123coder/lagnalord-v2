"use client";

import { useEffect, useMemo, useState } from "react";

type RatingModalProps = {
  open: boolean;
  astrologerName: string;
  onClose: () => void;
  onSubmitRating: (payload: { rating: number; reviewText: string }) => Promise<void>;
  onSkip?: () => void;
};

export function RatingModal({
  open,
  astrologerName,
  onClose,
  onSubmitRating,
  onSkip,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const starsToShow = hovered || rating;

  useEffect(() => {
    if (!open) {
      return;
    }
    setRating(0);
    setHovered(0);
    setReviewText("");
    setSubmitted(false);
  }, [open]);

  const title = useMemo(
    () => `How was your session with ${astrologerName}?`,
    [astrologerName]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0E1C3B] p-6 shadow-2xl">
        {submitted ? (
          <>
            <h2 className="text-lg font-bold text-[#F5F1E8]">Thank you!</h2>
            <p className="mt-2 text-sm text-[#C7C2B4]">
              Your review helps us improve future sessions.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-3 text-sm font-semibold text-[#09142a] hover:opacity-95"
              onClick={onClose}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-[#F5F1E8]">{title}</h2>
            <div
              className="mt-4 flex items-center gap-1"
              onMouseLeave={() => setHovered(0)}
            >
              {Array.from({ length: 5 }).map((_, idx) => {
                const value = idx + 1;
                const active = value <= starsToShow;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Rate ${value} stars`}
                    onMouseEnter={() => setHovered(value)}
                    onClick={() => setRating(value)}
                    className={`text-3xl leading-none transition ${
                      active ? "text-amber-400" : "text-[#C7C2B4]/30"
                    }`}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              className="mt-4 min-h-28 w-full rounded-xl border border-[#b18d4f]/40 bg-white px-3 py-2 text-sm text-[#09142a] outline-none placeholder:text-slate-400 focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30"
            />
            <button
              type="button"
              disabled={submitting || rating < 1}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] py-3 text-sm font-semibold text-[#09142a] disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-95"
              onClick={async () => {
                if (rating < 1) {
                  return;
                }
                setSubmitting(true);
                try {
                  await onSubmitRating({ rating, reviewText: reviewText.trim() });
                  setSubmitted(true);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
            {onSkip ? (
              <button
                type="button"
                className="mt-3 w-full text-sm font-semibold text-[#C7C2B4] hover:text-[#C8AC80]"
                onClick={onSkip}
              >
                Skip
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
