"use client";

import { RefreshCw, Send, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { PickedFaqAttachments } from "@/app/admin/agent/knowledge-attachments";
import { cn } from "@/lib/utils";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  attachments?: PickedFaqAttachments;
};

const SUGGESTED_QUESTIONS = [
  "Học phí Bố cục màu?",
  "Còn chỗ lớp tối không?",
  "Thi khối V cần học gì?",
  "Cho link đăng ký",
];

type ContextInfo = {
  updated: string;
  faqCount: number;
  classesCount: number;
};

function formatContextTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentTrainingPanel() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ctx, setCtx] = useState<ContextInfo | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxRefreshNote, setCtxRefreshNote] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadContext = useCallback(async () => {
    setCtxLoading(true);
    setCtxRefreshNote(null);
    try {
      const res = await fetch("/api/agent-context", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        updated?: string;
        faq?: unknown[];
        available_classes?: unknown[];
      };
      setCtx({
        updated: data.updated ?? new Date().toISOString(),
        faqCount: Array.isArray(data.faq) ? data.faq.length : 0,
        classesCount: Array.isArray(data.available_classes)
          ? data.available_classes.length
          : 0,
      });
    } catch {
      setCtx(null);
      setCtxRefreshNote("Không tải được context.");
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  async function sendMessage(text: string) {
    const t = text.trim();
    if (!t || sending) return;

    const userTurn: ChatTurn = { role: "user", content: t };
    setMessages((m) => [...m, userTurn]);
    setInput("");
    setSending(true);
    setTyping(true);

    const historyPayload = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const res = await fetch("/admin/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: t,
          history: historyPayload,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        attachments?: PickedFaqAttachments;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const reply = data.reply?.trim() || "…";
      const att = data.attachments;
      const hasAtt =
        att &&
        ((att.images?.length ?? 0) > 0 || (att.links?.length ?? 0) > 0);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: reply,
          ...(hasAtt ? { attachments: att } : {}),
        },
      ]);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Không gửi được tin. Thử lại.";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ ${msg}`,
        },
      ]);
    } finally {
      setTyping(false);
      setSending(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setTyping(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
      {/* Chat — 60% */}
      <section className="flex min-h-[min(520px,75vh)] min-w-0 flex-[0_0_100%] flex-col rounded-xl border border-black/[0.08] bg-white shadow-sm lg:flex-[0_0_60%]">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#1a1a1a]">Chat thử với Agent</h2>
            <p className="text-[11px] text-black/45">Mô phỏng học viên — không gửi lên Messenger</p>
          </div>
          <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
            Đang mô phỏng
          </span>
        </header>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && !typing ? (
            <p className="text-center text-[13px] text-black/45">
              Gõ câu hỏi hoặc chọn gợi ý bên phải để bắt đầu.
            </p>
          ) : null}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div
                  className="max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-sm"
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/[0.08] bg-gradient-to-br from-[#f8a668] to-[#ee5b9f] text-[11px] font-bold text-white shadow-sm"
                  aria-hidden
                >
                  S
                </div>
                <div className="min-w-0 max-w-[88%]">
                  <div className="mb-1 text-[11px] font-semibold text-black/50">Sơn</div>
                  <div className="rounded-2xl rounded-tl-md border border-black/[0.08] bg-[#f6f6f7] px-4 py-2.5 text-[13px] leading-relaxed text-black/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.attachments?.images?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.attachments.images.map((src, idx) => (
                          <a
                            key={`${src}-${idx}`}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block max-w-full"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- remote KB URLs */}
                            <img
                              src={src}
                              alt=""
                              className="max-h-44 max-w-full rounded-lg border border-black/[0.08] object-contain"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {m.attachments?.links?.length ? (
                      <ul className="mt-3 space-y-1.5 border-t border-black/[0.06] pt-3">
                        {m.attachments.links.map((link, idx) => (
                          <li key={`${link.url}-${idx}`}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-[12px] font-semibold text-[#BB89F8] underline decoration-[#BB89F8]/45 underline-offset-2 hover:text-[#a06fe8]"
                            >
                              {link.label?.trim() || link.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            ),
          )}

          {typing ? (
            <div className="flex justify-start gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-gradient-to-br from-[#f8a668] to-[#ee5b9f] text-[11px] font-bold text-white"
                aria-hidden
              >
                S
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-black/[0.08] bg-[#f6f6f7] px-4 py-3">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-black/35 [animation-delay:0ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-black/35 [animation-delay:150ms]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-black/35 [animation-delay:300ms]" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/[0.06] p-3">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[12px] font-semibold text-black/65 hover:bg-black/[0.03]"
            >
              <Trash2 size={14} aria-hidden />
              Xóa hội thoại
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Nhập tin nhắn… (Enter để gửi)"
              rows={2}
              disabled={sending}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={sending || !input.trim()}
              onClick={() => void sendMessage(input)}
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-sm",
                "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] hover:opacity-95 disabled:opacity-45",
              )}
            >
              <Send size={18} aria-hidden />
              Gửi
            </button>
          </div>
        </div>
      </section>

      {/* Context — 40% */}
      <aside className="flex min-w-0 flex-[0_0_100%] flex-col gap-3 lg:flex-[0_0_40%]">
        <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
          <h3 className="text-[13px] font-bold text-black/85">Context đang dùng</h3>
          <p className="mt-1 text-[11px] text-black/45">
            Cùng nguồn với Worker (<code className="rounded bg-black/[0.06] px-1 text-[10px]">/api/agent-context</code>)
          </p>

          {ctxLoading ? (
            <p className="mt-3 text-[12px] text-black/45">Đang tải…</p>
          ) : ctx ? (
            <ul className="mt-3 space-y-2 text-[13px] text-black/75">
              <li>
                <span className="font-semibold text-black/55">Q&A (KB):</span>{" "}
                <span className="font-bold text-black">{ctx.faqCount}</span>
              </li>
              <li>
                <span className="font-semibold text-black/55">Lớp còn chỗ:</span>{" "}
                <span className="font-bold text-black">{ctx.classesCount}</span>
              </li>
              <li>
                <span className="font-semibold text-black/55">Cập nhật context:</span>{" "}
                {formatContextTime(ctx.updated)}
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-[12px] text-amber-800">Không đọc được context.</p>
          )}

          {ctxRefreshNote ? (
            <p className="mt-2 text-[12px] text-red-700">{ctxRefreshNote}</p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void loadContext().then(() => {
                setCtxRefreshNote("Đã làm mới — gửi tin tiếp theo sẽ dùng KB mới.");
                window.setTimeout(() => setCtxRefreshNote(null), 4000);
              });
            }}
            disabled={ctxLoading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-black/[0.1] bg-white py-2.5 text-[12px] font-semibold text-black/75 hover:bg-black/[0.03] disabled:opacity-50"
          >
            <RefreshCw size={14} className={ctxLoading ? "animate-spin" : ""} aria-hidden />
            Làm mới context
          </button>
        </div>

        <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
          <h3 className="text-[13px] font-bold text-black/85">Gợi ý câu hỏi test</h3>
          <p className="mt-1 text-[11px] text-black/45">Bấm để điền và gửi ngay</p>
          <ul className="mt-3 space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void sendMessage(q)}
                  className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-left text-[12px] font-medium text-black/80 transition hover:border-[#f8a668]/50 hover:bg-[#fff8f3] disabled:opacity-50"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
