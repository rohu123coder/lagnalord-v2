"use client";

type ChatHistoryMessage = {
  sender_role: "user" | "astrologer";
  content: string;
  created_at: string;
};

type ChatHistoryModalProps = {
  open: boolean;
  astrologerName: string;
  sessionId: string;
  messages: ChatHistoryMessage[];
  loading: boolean;
  rated: boolean;
  onClose: () => void;
  onChatAgain: () => void;
  onRateSession: () => void;
};

export function ChatHistoryModal({
  open,
  astrologerName,
  sessionId,
  messages,
  loading,
  rated,
  onClose,
  onChatAgain,
  onRateSession,
}: ChatHistoryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[min(86vh,760px)] w-full max-w-3xl flex-col rounded-2xl bg-[#0E1C3B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#b18d4f]/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#F5F1E8]">Chat History</h2>
            <p className="text-sm text-[#C7C2B4]">
              {astrologerName} · Session {sessionId.slice(0, 8)}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[#C7C2B4] hover:bg-[#09142a]"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#09142a] px-4 py-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-[#0E1C3B]" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#C7C2B4]">
              No archived messages found.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((m, idx) => {
                const mine = m.sender_role === "user";
                return (
                  <div
                    key={`${m.created_at}-${idx}`}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "rounded-br-md bg-[#b18d4f] text-[#09142a]"
                          : "rounded-bl-md bg-[#0E1C3B] text-[#F5F1E8]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          mine ? "text-[#09142a]/70" : "text-[#C7C2B4]/60"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#b18d4f]/10 px-5 py-4">
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-4 py-2.5 text-sm font-semibold text-[#09142a] hover:opacity-95"
            onClick={onChatAgain}
          >
            Chat Again
          </button>
          {!rated ? (
            <button
              type="button"
              className="rounded-xl border border-[#b18d4f]/30 px-4 py-2.5 text-sm font-semibold text-[#C7C2B4]"
              onClick={onRateSession}
            >
              Rate Session
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
