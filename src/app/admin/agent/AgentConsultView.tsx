"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  fetchActiveKnowledgeExportAction,
  insertKnowledgeAction,
  softDeleteKnowledgeAction,
  updateKnowledgeAction,
} from "@/app/admin/agent/actions";
import {
  KB_CATEGORY_LABEL_VI,
  KB_CATEGORY_ORDER,
  PRIORITY_OPTIONS,
  type KbCategorySlug,
  isKbCategorySlug,
} from "@/app/admin/agent/knowledge-categories";
import { KnowledgeKbImageAttachments } from "@/app/admin/agent/KnowledgeKbImageAttachments";
import {
  buildKbAttachmentsForSave,
  type KbDraftLinkRow,
} from "@/app/admin/agent/knowledge-attachments";
import AgentTrainingPanel from "@/app/admin/agent/AgentTrainingPanel";
import type { AgKnowledgeRow } from "@/app/admin/agent/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Cùng Worker sine-art-api (gộp upload + Messenger). Ghi đè bằng NEXT_PUBLIC_AGENT_WORKER_URL nếu deploy khác domain. */
const META_AGENT_BASE = (
  typeof process.env.NEXT_PUBLIC_AGENT_WORKER_URL === "string" && process.env.NEXT_PUBLIC_AGENT_WORKER_URL.trim()
    ? process.env.NEXT_PUBLIC_AGENT_WORKER_URL.trim().replace(/\/$/, "")
    : "https://sine-art-api.nguyenthanhtu-nkl.workers.dev"
);

type TabKey = "conversations" | "knowledge" | "training";

/** Tin nhận từ GET /agent/conversations (flat). */
type RawAgentMessage = {
  sender_id: string;
  message: string;
  created_at: string;
  agent_active: boolean;
};

/** Một hội thoại — tin mới nhất theo sender. */
type ConversationSummary = {
  sender_id: string;
  message: string;
  created_at: string;
};

function truncate(s: string, max: number): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function senderTail(id: string): string {
  const s = String(id ?? "").trim();
  if (s.length <= 6) return s || "—";
  return s.slice(-6);
}

function relativeTimeVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

function asRecord(x: unknown): Record<string, unknown> | null {
  return x != null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

function parseRawMessages(json: unknown): RawAgentMessage[] {
  let arr: unknown[] = [];
  if (Array.isArray(json)) arr = json;
  else {
    const o = asRecord(json);
    if (o) {
      const c = o.conversations ?? o.data ?? o.items;
      if (Array.isArray(c)) arr = c;
    }
  }

  const out: RawAgentMessage[] = [];
  for (const raw of arr) {
    const r = asRecord(raw);
    if (!r) continue;
    const sender_id =
      typeof r.sender_id === "string"
        ? r.sender_id
        : typeof r.senderId === "string"
          ? r.senderId
          : "";
    const message =
      typeof r.message === "string"
        ? r.message
        : typeof r.last_message === "string"
          ? r.last_message
          : typeof r.text === "string"
            ? r.text
            : "";
    const created_at =
      typeof r.created_at === "string"
        ? r.created_at
        : typeof r.createdAt === "string"
          ? r.createdAt
          : "";
    let agent_active = false;
    if (typeof r.agent_active === "boolean") agent_active = r.agent_active;
    else if (typeof r.agentActive === "boolean") agent_active = r.agentActive;

    if (!sender_id) continue;
    out.push({
      sender_id,
      message,
      created_at: created_at || new Date().toISOString(),
      agent_active,
    });
  }

  return out;
}

/** Ước lượng cờ Agent toàn hệ thống từ tin mới nhất (Worker không có endpoint GET riêng). */
function inferGlobalAgentFromMessages(messages: RawAgentMessage[]): boolean | null {
  if (!messages.length) return null;
  const newest = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  return newest.agent_active;
}

/** Gộp theo sender — giữ tin có `created_at` mới nhất. */
function summarizeConversations(messages: RawAgentMessage[]): ConversationSummary[] {
  const best = new Map<string, RawAgentMessage>();
  for (const m of messages) {
    const prev = best.get(m.sender_id);
    if (!prev || new Date(m.created_at).getTime() > new Date(prev.created_at).getTime()) {
      best.set(m.sender_id, m);
    }
  }
  return [...best.values()]
    .map((m) => ({
      sender_id: m.sender_id,
      message: m.message,
      created_at: m.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

type ToastState = { ok: boolean; msg: string } | null;

type PanelMode = "idle" | "create" | "edit";

export default function AgentConsultView({ initialRows }: { initialRows: AgKnowledgeRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("conversations");

  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------- Conversations ---------- */
  const [convLoading, setConvLoading] = useState(true);
  const [convRefreshing, setConvRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  /** Trạng thái Agent toàn hệ thống — đồng bộ Worker bằng POST /agent/toggle cho từng `sender_id`. */
  const [globalAgentEnabled, setGlobalAgentEnabled] = useState<boolean | null>(null);
  const [globalToggleBusy, setGlobalToggleBusy] = useState(false);
  const [convErr, setConvErr] = useState<string | null>(null);
  /** Chỉ đọc cờ Agent từ tin nhắn GET một lần đầu — tin cũ có thể giữ snapshot agent_active sai; sau đó chỉ tin POST toggle. */
  const globalAgentBootstrapped = useRef(false);

  const loadConversations = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (soft) setConvRefreshing(true);
    else setConvLoading(true);
    setConvErr(null);
    try {
      const res = await fetch(`${META_AGENT_BASE}/agent/conversations`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      const raw = parseRawMessages(json);
      setConversations(summarizeConversations(raw));
      const inferred = inferGlobalAgentFromMessages(raw);
      if (!globalAgentBootstrapped.current && inferred !== null) {
        globalAgentBootstrapped.current = true;
        setGlobalAgentEnabled(inferred);
      }
    } catch (e) {
      setConvErr(e instanceof Error ? e.message : "Không tải được hội thoại.");
      setConversations([]);
    } finally {
      setConvLoading(false);
      setConvRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadConversations({ soft: true });
    }, 30_000);
    return () => window.clearInterval(id);
  }, [loadConversations]);

  /** Bật/tắt Agent cho toàn hệ thống — gọi Worker POST `{ sender_id, active }` lần lượt cho mọi sender trong danh sách. */
  async function onToggleGlobal(nextEnabled: boolean) {
    const senderIds = [...new Set(conversations.map((c) => c.sender_id).filter(Boolean))];
    if (senderIds.length === 0) {
      setToast({
        ok: false,
        msg: "Chưa có hội thoại nào — không có sender_id để gọi API.",
      });
      return;
    }

    const prevGlobal = globalAgentEnabled;
    setGlobalToggleBusy(true);
    setGlobalAgentEnabled(nextEnabled);
    try {
      for (const sender_id of senderIds) {
        const res = await fetch(`${META_AGENT_BASE}/agent/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender_id, active: nextEnabled }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      globalAgentBootstrapped.current = true;
      setGlobalAgentEnabled(nextEnabled);
      setToast({
        ok: true,
        msg: nextEnabled
          ? "Đã bật trả lời tự động (Agent) cho toàn hệ thống"
          : "Đã tắt Agent — tư vấn viên trả lời trực tiếp",
      });
      void loadConversations({ soft: true });
    } catch {
      setGlobalAgentEnabled(prevGlobal);
      setToast({
        ok: false,
        msg: "Không cập nhật được chế độ Agent — đã khôi phục trạng thái.",
      });
    } finally {
      setGlobalToggleBusy(false);
    }
  }

  /* ---------- Knowledge Base ---------- */
  const [kbRows, setKbRows] = useState<AgKnowledgeRow[]>(initialRows);
  useEffect(() => {
    setKbRows(initialRows);
  }, [initialRows]);

  const [catFilter, setCatFilter] = useState<KbCategorySlug | "__all__">("__all__");
  const [kbSearch, setKbSearch] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>("idle");
  const [editId, setEditId] = useState<string | null>(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const [draftCat, setDraftCat] = useState<KbCategorySlug>("hoc_phi");
  const [draftPri, setDraftPri] = useState<(typeof PRIORITY_OPTIONS)[number]["value"]>("medium");
  const [draftImageUrls, setDraftImageUrls] = useState<string[]>([]);
  const [draftLinks, setDraftLinks] = useState<KbDraftLinkRow[]>([{ label: "", url: "" }]);
  const [kbSaving, setKbSaving] = useState(false);

  function addDraftLinkRow() {
    setDraftLinks((rows) => [...rows, { label: "", url: "" }]);
  }

  function removeDraftLinkRow(index: number) {
    setDraftLinks((rows) =>
      rows.length <= 1 ? [{ label: "", url: "" }] : rows.filter((_, j) => j !== index),
    );
  }

  function patchDraftLink(index: number, patch: Partial<KbDraftLinkRow>) {
    setDraftLinks((rows) => rows.map((r, j) => (j === index ? { ...r, ...patch } : r)));
  }

  const countsByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const slug of KB_CATEGORY_ORDER) m.set(slug, 0);
    for (const r of kbRows) {
      const raw = (r.category ?? "").trim();
      const slug = isKbCategorySlug(raw) ? raw : "khac";
      m.set(slug, (m.get(slug) ?? 0) + 1);
    }
    return m;
  }, [kbRows]);

  const filteredKb = useMemo(() => {
    const q = kbSearch.trim().toLowerCase();
    return kbRows.filter((r) => {
      if (catFilter !== "__all__") {
        const raw = (r.category ?? "").trim();
        const slug = isKbCategorySlug(raw) ? raw : "khac";
        if (slug !== catFilter) return false;
      }
      if (!q) return true;
      return (r.question ?? "").toLowerCase().includes(q);
    });
  }, [kbRows, catFilter, kbSearch]);

  function openCreate() {
    setPanelMode("create");
    setEditId(null);
    setDraftQ("");
    setDraftA("");
    setDraftCat("hoc_phi");
    setDraftPri("medium");
    setDraftImageUrls([]);
    setDraftLinks([{ label: "", url: "" }]);
  }

  function openEdit(row: AgKnowledgeRow) {
    setPanelMode("edit");
    setEditId(row.id);
    setDraftQ(row.question ?? "");
    setDraftA(row.answer ?? "");
    const raw = (row.category ?? "").trim();
    setDraftCat(isKbCategorySlug(raw) ? raw : "khac");
    const p = (row.priority ?? "medium").trim().toLowerCase();
    setDraftPri(p === "high" || p === "low" || p === "medium" ? p : "medium");
    setDraftImageUrls(row.attachments?.images?.length ? [...row.attachments.images] : []);
    setDraftLinks(
      row.attachments?.links?.length
        ? row.attachments.links.map((l) => ({
            label: l.label ?? "",
            url: l.url,
          }))
        : [{ label: "", url: "" }],
    );
  }

  function closePanel() {
    setPanelMode("idle");
    setEditId(null);
  }

  async function saveKb() {
    const q = draftQ.trim();
    const a = draftA.trim();
    if (!q || !a) {
      setToast({ ok: false, msg: "Vui lòng nhập đủ câu hỏi và câu trả lời." });
      return;
    }
    const builtAttachments = buildKbAttachmentsForSave({
      imageUrls: draftImageUrls,
      links: draftLinks,
    });

    setKbSaving(true);
    try {
      if (panelMode === "create") {
        const res = await insertKnowledgeAction({
          question: q,
          answer: a,
          category: draftCat,
          priority: draftPri,
          attachments: builtAttachments,
        });
        if (!res.ok) {
          setToast({ ok: false, msg: res.error });
          return;
        }
        setToast({ ok: true, msg: "Đã thêm Q&A." });
        closePanel();
        router.refresh();
      } else if (panelMode === "edit" && editId) {
        const res = await updateKnowledgeAction({
          id: editId,
          question: q,
          answer: a,
          category: draftCat,
          priority: draftPri,
          attachments: builtAttachments,
        });
        if (!res.ok) {
          setToast({ ok: false, msg: res.error });
          return;
        }
        setToast({ ok: true, msg: "Đã cập nhật Q&A." });
        closePanel();
        router.refresh();
      }
    } finally {
      setKbSaving(false);
    }
  }

  async function deleteKb(id: string) {
    if (!window.confirm("Gỡ Q&A này khỏi knowledge base? (có thể khôi phục trong DB)")) return;
    const res = await softDeleteKnowledgeAction(id);
    if (!res.ok) {
      setToast({ ok: false, msg: res.error });
      return;
    }
    setToast({ ok: true, msg: "Đã gỡ Q&A." });
    router.refresh();
  }

  async function exportJson() {
    const res = await fetchActiveKnowledgeExportAction();
    if (!res.ok) {
      setToast({ ok: false, msg: res.error });
      return;
    }
    const blob = new Blob([JSON.stringify(res.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge_base.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast({ ok: true, msg: "Đã tải knowledge_base.json" });
  }

  function onKeyCancel(e: ReactKeyboardEvent) {
    if (e.key === "Escape") closePanel();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" onKeyDown={panelMode !== "idle" ? onKeyCancel : undefined}>
      <div className="flex flex-col gap-1 border-b border-black/[0.08] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a] md:text-2xl">Agent tư vấn</h1>
            <p className="mt-0.5 text-[13px] text-black/50">
              Theo dõi hội thoại Messenger và quản lý Knowledge Base cho chatbot.
            </p>
            {tab === "conversations" ? (
              <p className="mt-2 max-w-3xl rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2 text-[12px] leading-snug text-black/55">
                <span className="font-semibold text-black/70">Gợi ý:</span> Dùng{" "}
                <strong className="font-semibold text-black/75">một công tắt duy nhất</strong> (phía trên bảng hội thoại)
                để bật/tắt <strong className="font-semibold text-black/75">Agent trả lời tự động cho toàn hệ thống</strong>{" "}
                (vd. bật ngoài giờ, tắt trong giờ làm việc để tư vấn viên trả lời trực tiếp).
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative mt-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl border border-black/[0.08] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setTab("conversations")}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-semibold transition",
                tab === "conversations"
                  ? "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] text-white shadow-sm"
                  : "text-black/65 hover:bg-black/[0.04]",
              )}
            >
              Conversations
            </button>
            <button
              type="button"
              onClick={() => setTab("knowledge")}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-semibold transition",
                tab === "knowledge"
                  ? "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] text-white shadow-sm"
                  : "text-black/65 hover:bg-black/[0.04]",
              )}
            >
              Knowledge Base
            </button>
            <button
              type="button"
              onClick={() => setTab("training")}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-semibold transition",
                tab === "training"
                  ? "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] text-white shadow-sm"
                  : "text-black/65 hover:bg-black/[0.04]",
              )}
            >
              Đào tạo Agent
            </button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {tab === "conversations" ? (
              <>
                <span className="flex items-center gap-2 text-[11px] font-semibold text-black/45">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {convRefreshing ? "Đang làm mới…" : "Làm mới mỗi 30s"}
                </span>
                <button
                  type="button"
                  onClick={() => void loadConversations({ soft: true })}
                  className="rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[12px] font-semibold text-black/70 hover:bg-black/[0.03]"
                >
                  Làm mới ngay
                </button>
              </>
            ) : tab === "knowledge" ? (
              <>
                <button
                  type="button"
                  onClick={() => void exportJson()}
                  className="rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[12px] font-semibold text-black/70 hover:bg-black/[0.03]"
                >
                  Xuất JSON
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
                >
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                  Thêm Q&A
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {tab === "conversations" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {convErr ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {convErr}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/[0.08] bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-black/85">Agent trả lời tự động (toàn hệ thống)</p>
                <p className="mt-0.5 text-[12px] text-black/50">
                  Một công tắt cho mọi hội thoại — bật khi để Agent trả lời (vd. ngoài giờ), tắt khi tư vấn viên trả lời
                  trực tiếp.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {globalAgentEnabled !== null ? (
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                      globalAgentEnabled
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                        : "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
                    )}
                  >
                    {globalAgentEnabled ? "Agent đang bật" : "TVV trả lời trực tiếp"}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-black/35">Đang đồng bộ…</span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={globalAgentEnabled ?? false}
                  aria-busy={globalToggleBusy || convLoading}
                  aria-label={
                    globalAgentEnabled
                      ? "Đang bật Agent toàn hệ thống — bấm để tắt"
                      : "Đang tắt Agent — bấm để bật trả lời tự động"
                  }
                  disabled={globalToggleBusy || convLoading}
                  title={
                    globalAgentEnabled
                      ? "Tắt Agent — chuyển sang tư vấn viên trả lời (giờ làm việc)"
                      : "Bật Agent — trả lời tự động cho mọi cuộc chat (vd. ngoài giờ)"
                  }
                  onClick={() =>
                    void onToggleGlobal(!(globalAgentEnabled ?? false))
                  }
                  className={cn(
                    "relative h-[28px] w-[52px] shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BC8AF9]/45 disabled:opacity-55",
                    globalAgentEnabled
                      ? "bg-gradient-to-r from-[#f8a668] to-[#ee5b9f]"
                      : "bg-[#E3E5E5]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] left-[3px] block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                      globalAgentEnabled ? "translate-x-[22px]" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </div>

          {convLoading ? (
            <div className="space-y-2 rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 border-b border-black/[0.06] pb-3 last:border-0">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.12] bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-[15px] font-semibold text-black/70">Chưa có hội thoại</p>
              <p className="mt-2 max-w-md text-[13px] text-black/45">
                Khi có tin nhắn từ Messenger, danh sách sẽ hiển thị tại đây. Trang tự làm mới mỗi 30 giây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-black/[0.08] bg-white shadow-sm">
              <table className="min-w-[560px] w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-black/[0.08] bg-black/[0.02] text-[11px] font-bold uppercase tracking-wide text-black/45">
                    <th className="px-4 py-3">Sender</th>
                    <th className="px-4 py-3">Tin nhắn cuối</th>
                    <th className="px-4 py-3 whitespace-nowrap">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((row) => (
                    <tr key={row.sender_id} className="border-b border-black/[0.06] last:border-0">
                      <td className="px-4 py-3 font-mono text-[12px] font-semibold text-black/80">
                        {senderTail(row.sender_id)}
                      </td>
                      <td className="max-w-[320px] px-4 py-3 text-black/75">{truncate(row.message, 40)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-black/55">{relativeTimeVi(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === "knowledge" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-[220px]">
            <div className="rounded-xl border border-black/[0.08] bg-white p-2 shadow-sm">
              <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-black/45">
                Danh mục
              </p>
              <ul className="space-y-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setCatFilter("__all__")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] transition",
                      catFilter === "__all__"
                        ? "bg-black/[0.06] font-semibold text-black"
                        : "text-black/75 hover:bg-black/[0.04]",
                    )}
                  >
                    <span>Tất cả</span>
                    <span className="text-[11px] text-black/40">{kbRows.length}</span>
                  </button>
                </li>
                {KB_CATEGORY_ORDER.map((slug) => (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => setCatFilter(slug)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[13px] transition",
                        catFilter === slug
                          ? "bg-black/[0.06] font-semibold text-black"
                          : "text-black/75 hover:bg-black/[0.04]",
                      )}
                    >
                      <span>{KB_CATEGORY_LABEL_VI[slug]}</span>
                      <span className="text-[11px] text-black/40">{countsByCat.get(slug) ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Tìm theo câu hỏi…"
                className="min-w-[200px] flex-1 rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none ring-[#BC8AF9]/30 focus:border-[#BC8AF9]/50 focus:ring-2"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-[min(280px,40vh)]">
              {filteredKb.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/[0.12] bg-white px-6 py-12 text-center text-[13px] text-black/50">
                  Không có Q&A trong mục này.
                </div>
              ) : (
                filteredKb.map((row) => {
                  const raw = (row.category ?? "").trim();
                  const slug = isKbCategorySlug(raw) ? raw : "khac";
                  const catLabel = KB_CATEGORY_LABEL_VI[slug];
                  const att = row.attachments;
                  const hasAttachments =
                    (att?.images?.length ?? 0) > 0 || (att?.links?.length ?? 0) > 0;
                  return (
                    <details
                      key={row.id}
                      className="group rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                    >
                      <summary className="flex cursor-pointer list-none items-start gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <ChevronDown
                          size={18}
                          className="mt-0.5 shrink-0 text-black/45 transition group-open:rotate-180"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-black/85">{row.question}</span>
                            <span className="rounded-md bg-black/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/45">
                              {catLabel}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-black/40">
                            <span>Ưu tiên: {(row.priority ?? "").trim() || "—"}</span>
                            {hasAttachments ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 font-semibold text-violet-800 ring-1 ring-violet-200">
                                <Link2 size={12} aria-hidden />
                                Đính kèm
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEdit(row);
                            }}
                            className="rounded-lg border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-semibold text-black/70 hover:bg-black/[0.04]"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void deleteKb(row.id);
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-100"
                          >
                            Xóa
                          </button>
                        </div>
                      </summary>
                      <div className="border-t border-black/[0.06] px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-black/75">
                        {row.answer}
                      </div>
                      {hasAttachments ? (
                        <div className="border-t border-black/[0.06] bg-gradient-to-b from-black/[0.02] to-transparent px-4 py-3">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black/45">
                            <Link2 size={14} className="text-[#BC8AF9]" aria-hidden />
                            Đính kèm
                          </p>
                          {att?.images?.length ? (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {att.images.map((src) => (
                                <a
                                  key={src}
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block max-w-full"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- URL ngoài (Cloudflare / CDN) */}
                                  <img
                                    src={src}
                                    alt=""
                                    className="max-h-40 max-w-full rounded-lg border border-black/[0.08] bg-white object-contain shadow-sm"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {att?.links?.length ? (
                            <ul className="space-y-1.5 text-[13px]">
                              {att.links.map((l, idx) => (
                                <li key={`${l.url}-${idx}`}>
                                  <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-[#8B5CF0] underline decoration-[#BC8AF9]/50 underline-offset-2 hover:text-[#6D28D9]"
                                  >
                                    {(l.label ?? "").trim() || l.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </details>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <AgentTrainingPanel />
      )}

      {tab === "knowledge" && panelMode !== "idle" ? (
        <div className="sticky bottom-0 z-30 mt-auto border-t border-black/[0.1] bg-[#FFFCFA] px-4 py-4 shadow-[0_-8px_28px_rgba(0,0,0,0.08)] md:rounded-t-2xl">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold text-black/85">
                {panelMode === "create" ? "Thêm Q&A" : "Sửa Q&A"}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                className="text-[12px] font-semibold text-black/45 hover:text-black/70"
              >
                Đóng (Esc)
              </button>
            </div>
            <label className="block text-[12px] font-semibold text-black/55">
              Câu hỏi
              <textarea
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-y rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2"
              />
            </label>
            <label className="block text-[12px] font-semibold text-black/55">
              Câu trả lời
              <textarea
                value={draftA}
                onChange={(e) => setDraftA(e.target.value)}
                rows={5}
                placeholder="Viết theo giọng thân thiện, dùng mình/bạn, kết thúc bằng câu hỏi..."
                className="mt-1 w-full resize-y rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2"
              />
            </label>

            <div className="rounded-xl border border-black/[0.08] bg-white/90 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="mb-2 text-[12px] font-bold text-black/65">Đính kèm (tuỳ chọn)</p>
              <KnowledgeKbImageAttachments
                urls={draftImageUrls}
                onUrlsChange={setDraftImageUrls}
                disabled={kbSaving}
              />
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-black/45">Link tham chiếu</span>
                  <button
                    type="button"
                    onClick={addDraftLinkRow}
                    className="inline-flex items-center gap-1 rounded-lg border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-bold text-black/70 hover:bg-black/[0.03]"
                  >
                    <Plus size={14} strokeWidth={2.5} aria-hidden />
                    Thêm link
                  </button>
                </div>
                {draftLinks.map((linkRow, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={linkRow.label}
                      onChange={(e) => patchDraftLink(i, { label: e.target.value })}
                      placeholder="Nhãn hiển thị (tuỳ chọn)"
                      className="min-w-[120px] flex-[0_1_140px] rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2"
                    />
                    <input
                      type="url"
                      value={linkRow.url}
                      onChange={(e) => patchDraftLink(i, { url: e.target.value })}
                      placeholder="https://…"
                      className="min-w-[180px] flex-1 rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2"
                    />
                    <button
                      type="button"
                      aria-label="Xóa dòng link"
                      onClick={() => removeDraftLinkRow(i)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.1] bg-white text-black/55 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-[160px] flex-1 flex-col text-[12px] font-semibold text-black/55">
                Danh mục
                <select
                  value={draftCat}
                  onChange={(e) => setDraftCat(e.target.value as KbCategorySlug)}
                  className="mt-1 h-10 rounded-xl border border-black/[0.1] bg-white px-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2"
                >
                  {KB_CATEGORY_ORDER.map((slug) => (
                    <option key={slug} value={slug}>
                      {KB_CATEGORY_LABEL_VI[slug]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[160px] flex-1 flex-col text-[12px] font-semibold text-black/55">
                Độ ưu tiên
                <select
                  value={draftPri}
                  onChange={(e) =>
                    setDraftPri(e.target.value as (typeof PRIORITY_OPTIONS)[number]["value"])
                  }
                  className="mt-1 h-10 rounded-xl border border-black/[0.1] bg-white px-2 text-[13px] outline-none ring-[#BC8AF9]/25 focus:border-[#BC8AF9]/45 focus:ring-2"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={kbSaving}
                onClick={() => void saveKb()}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-5 py-2 text-[13px] font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {kbSaving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                disabled={kbSaving}
                onClick={closePanel}
                className="rounded-lg border border-black/[0.12] bg-white px-4 py-2 text-[13px] font-semibold text-black/70 hover:bg-black/[0.03]"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[120] flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold shadow-[0_12px_32px_rgba(45,32,32,.18)]",
            toast.ok ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "border border-red-200 bg-red-50 text-red-900",
          )}
          role="status"
        >
          {toast.ok ? <Check size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
          <span>{toast.msg}</span>
        </div>
      ) : null}
    </div>
  );
}
