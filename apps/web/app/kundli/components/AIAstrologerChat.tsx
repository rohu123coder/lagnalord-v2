"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store";
import type { KundliCalculateResponse } from "../types";

type Persona = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
};

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export function AIAstrologerChat({
  kundliData,
  preselectedPersonaId,
}: {
  kundliData: KundliCalculateResponse;
  preselectedPersonaId?: string | null;
}) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-astrologer/personas");
        const json = await res.json();
        if (!cancelled && json?.personas) {
          setPersonas(json.personas);
        }
      } catch {
        if (!cancelled) setPersonas([]);
      } finally {
        if (!cancelled) setPersonasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!preselectedPersonaId || activePersona || personas.length === 0) return;
    const match = personas.find((p) => p.id === preselectedPersonaId);
    if (!match) return;
    setActivePersona(match);
    setMessages([
      {
        role: "model",
        text: `${match.emoji} Namaste! Main ${match.name} hoon. Aapki kundli mere saamne hai — poochiye jo bhi jaanna chahte hain aapke career, love, health, ya kisi bhi cheez ke baare mein.`,
      },
    ]);
    setError(null);
  }, [preselectedPersonaId, personas, activePersona]);

  const selectPersona = (p: Persona) => {
    setActivePersona(p);
    setSessionId(null);
    setMessages([
      {
        role: "model",
        text: `${p.emoji} Namaste! Main ${p.name} hoon. Aapki kundli mere saamne hai — poochiye jo bhi jaanna chahte hain aapke career, love, health, ya kisi bhi cheez ke baare mein.`,
      },
    ]);
    setError(null);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activePersona || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-astrologer/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          personaId: activePersona.id,
          kundliData,
          history: messages,
          message: trimmed,
          sessionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 400 && json?.data?.required != null) {
          setError(
            `Insufficient wallet balance. ₹${json.data.required} required. Please recharge your wallet.`
          );
        } else if (res.status === 401) {
          setError("Please log in to continue chatting.");
        } else {
          setError(json?.error ?? "Kuch dikkat aa gayi. Dobara try karein.");
        }
        return;
      }
      setMessages((prev) => [...prev, { role: "model", text: json.reply }]);
      if (json.sessionId && !sessionId) {
        setSessionId(json.sessionId);
      }
    } catch {
      setError("Network error. Kripya dobara try karein.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#b18d4f]/20 bg-[#0E1C3B] p-6 shadow-md print:hidden">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#F5F1E8]">🔮 AI Astrologer</h2>
        <p className="mt-1 text-sm text-[#C7C2B4]">
          Apne pasandeeda astrologer se apni kundli ke baare mein poochiye
        </p>
      </div>

      {!user ? (
        <div className="rounded-xl border border-[#b18d4f]/20 bg-[#09142a] p-6 text-center">
          <p className="text-sm text-[#C7C2B4]">
            AI Astrologer se baat karne ke liye login karna zaroori hai.
          </p>
          <a
            href="/login"
            className="mt-3 inline-block rounded-lg bg-gradient-to-r from-[#b18d4f] to-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95"
          >
            Login karein
          </a>
        </div>
      ) : !activePersona ? (
        personasLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#09142a]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPersona(p)}
                className="rounded-xl border border-[#b18d4f]/20 bg-[#09142a] p-4 text-left transition hover:border-[#b18d4f] hover:bg-[#09142a]/70"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F5F1E8]">{p.name}</p>
                    <p className="text-xs text-[#C7C2B4]">{p.tagline}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activePersona.emoji}</span>
              <span className="font-semibold text-[#C8AC80]">{activePersona.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePersona(null);
                setMessages([]);
              }}
              className="text-xs font-medium text-[#C7C2B4] hover:text-[#C8AC80]"
            >
              Change astrologer
            </button>
          </div>

          <div
            ref={scrollRef}
            className="mb-3 flex max-h-[420px] min-h-[240px] flex-col gap-3 overflow-y-auto rounded-xl border border-[#b18d4f]/10 bg-[#09142a] p-4"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-md bg-[#b18d4f] text-[#09142a]"
                      : "rounded-bl-md bg-[#0E1C3B] text-[#F5F1E8]"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-[#0E1C3B] px-4 py-2 text-sm text-[#C7C2B4]">
                  {activePersona.name} type kar rahe hain…
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mb-2 text-sm text-red-400">{error}</p>
          ) : null}

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Apna sawaal poochiye…"
              disabled={sending}
              className="flex-1 rounded-xl border border-[#b18d4f]/20 bg-[#09142a] px-4 py-2.5 text-sm text-[#F5F1E8] outline-none focus:border-[#b18d4f] focus:ring-2 focus:ring-[#b18d4f]/30 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="rounded-xl bg-[#b18d4f] hover:bg-[#C8AC80] px-5 py-2.5 text-sm font-semibold text-[#09142a] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
