"use client";

import { firstName } from "@/lib/utils";

export type SessionRow = {
  id: string;
  astrologer_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  total_minutes: number | null;
  total_charged: number | null;
  astrologer_name: string;
  astrologer_photo: string | null;
  rating: number | null;
  session_type: "chat" | "voice" | "video" | null;
};

function renderSessionTypeIcon(type: SessionRow["session_type"]): string {
  if (type === "voice") {
    return "📞";
  }
  if (type === "video") {
    return "📹";
  }
  return "💬";
}

function renderStars(rating: number | null): string {
  if (rating == null) {
    return "—";
  }
  const rounded = Math.max(1, Math.min(5, Math.round(rating)));
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
}

export function RecentChatsTable({
  sessions,
  loading,
  onRowClick,
}: {
  sessions: SessionRow[];
  loading: boolean;
  onRowClick: (session: SessionRow) => void;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] shadow-sm">
      <div className="border-b border-[#b18d4f]/10 px-6 py-4">
        <h2 className="text-lg font-bold text-[#F5F1E8]">Recent chats</h2>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded bg-[#09142a]"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-sm text-[#C7C2B4]">
            No chats yet. Browse an astrologer to get started.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#b18d4f]/10 bg-[#09142a] text-xs uppercase tracking-wide text-[#C7C2B4]">
                <th className="px-4 py-3 font-medium">Astrologer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Charged</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#b18d4f]/10">
              {sessions.map((s) => {
                const dateSrc = s.ended_at ?? s.started_at;
                return (
                  <tr
                    key={s.id}
                    className="cursor-pointer text-[#F5F1E8] hover:bg-[#09142a]/50"
                    onClick={() => {
                      onRowClick(s);
                    }}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {s.astrologer_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.astrologer_photo}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b18d4f]/20 text-xs font-bold text-[#C8AC80]">
                            {firstName(s.astrologer_name).slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span>{firstName(s.astrologer_name)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span title={s.session_type ?? "chat"}>
                        {renderSessionTypeIcon(s.session_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#C7C2B4]">
                      {dateSrc
                        ? new Date(dateSrc).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.total_minutes != null ? `${s.total_minutes} min` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.total_charged != null
                        ? `₹${Number(s.total_charged).toFixed(0)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-amber-500">
                      {renderStars(s.rating)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.status === "ended"
                            ? "bg-[#0E1C3B] text-[#C7C2B4]"
                            : s.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
