"use client";

import { Bell, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SepayIncomingTransfer } from "@/lib/data/admin-sepay-transfers";
import {
  formatSepayTransactionDateVn,
  sepayTransactionInstantMs,
} from "@/lib/sepay/sepay-datetime";
import { cn } from "@/lib/utils";

const POLL_MS = 45_000;
const SEEN_KEY_PREFIX = "sineart-sepay-tuvan-seen-at";
const HISTORY_PAGE_SIZE = 20;

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")} ₫`;
}

function relativeVi(tx: SepayIncomingTransfer): string {
  const t = sepayTransactionInstantMs(tx.transactionDate, tx.sepayTransactionDateLocal);
  if (!Number.isFinite(t) || t <= 0) return "";
  const diffMin = Math.round((Date.now() - t) / 60_000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} giờ trước`;
  return formatSepayTransactionDateVn(tx.transactionDate, tx.sepayTransactionDateLocal);
}

function orderLabel(tx: SepayIncomingTransfer): string | null {
  return tx.maDonTrichXuat ?? tx.content.match(/SA\d{6}/i)?.[0]?.toUpperCase() ?? null;
}

function isUnread(tx: SepayIncomingTransfer, lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true;
  const seenMs = Date.parse(lastSeenAt);
  if (!Number.isFinite(seenMs)) return true;
  return sepayTransactionInstantMs(tx.transactionDate, tx.sepayTransactionDateLocal) > seenMs;
}

function seenStorageKey(staffId: number): string {
  return `${SEEN_KEY_PREFIX}-${staffId}`;
}

function readLastSeenAt(staffId: number): string | null {
  try {
    return localStorage.getItem(seenStorageKey(staffId));
  } catch {
    return null;
  }
}

function writeLastSeenAt(staffId: number, iso: string): void {
  try {
    localStorage.setItem(seenStorageKey(staffId), iso);
  } catch {
    /* ignore quota */
  }
}

function TransferRow({ tx, compact }: { tx: SepayIncomingTransfer; compact?: boolean }) {
  const label = orderLabel(tx);
  return (
    <div className={cn("min-w-0", compact ? "py-2" : "py-2.5")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold tabular-nums text-emerald-800">+{formatVnd(tx.transferAmount)}</span>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-slate-500">
          {relativeVi(tx)}
        </span>
      </div>
      {label ? <p className="m-0 mt-0.5 text-[11px] font-semibold text-[#323232]">{label}</p> : null}
      <p className="m-0 mt-0.5 truncate text-[10px] text-slate-500" title={tx.content}>
        {tx.content || "—"}
      </p>
    </div>
  );
}

type HistoryModalProps = {
  open: boolean;
  onClose: () => void;
};

function SepayHistoryModal({ open, onClose }: HistoryModalProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<SepayIncomingTransfer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        scope: "history",
        page: String(p),
        pageSize: String(HISTORY_PAGE_SIZE),
      });
      const trimmed = q.trim();
      if (trimmed) qs.set("q", trimmed);
      const res = await fetch(`/admin/api/sepay-recent-transfers?${qs}`, { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        items?: SepayIncomingTransfer[];
        total?: number;
        page?: number;
        totalPages?: number;
        search?: string;
      };
      if (!res.ok || !json.ok || !json.items) {
        throw new Error(json.error ?? "Không tải được lịch sử.");
      }
      setItems(json.items);
      setTotal(json.total ?? json.items.length);
      setPage(json.page ?? p);
      setTotalPages(json.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setSearchInput("");
    setSearchQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 320);
    return () => window.clearTimeout(t);
  }, [searchInput, open]);

  useEffect(() => {
    if (!open) return;
    void fetchPage(page, searchQuery);
  }, [open, page, searchQuery, fetchPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_10px_32px_rgba(45,32,32,0.12)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EDE8E9] px-4 py-3 sm:px-5">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#EE5CA2]">SePay</p>
            <h2 className="m-0 text-base font-bold text-[#323232]">Lịch sử chuyển khoản</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-slate-500 hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="border-b border-[#F3EEEF] px-4 py-2.5 sm:px-5">
          <label className="relative block">
            <Search
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã đơn SA… hoặc nội dung chuyển khoản"
              className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white py-0 pl-8 pr-8 text-[12px] text-[#323232] shadow-sm outline-none placeholder:text-slate-400 focus:border-[#BC8AF9] focus:ring-2 focus:ring-[#BC8AF9]/20"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Xóa tìm kiếm"
              >
                <X size={14} strokeWidth={2} />
              </button>
            ) : null}
          </label>
          {searchQuery ? (
            <p className="m-0 mt-1.5 text-[10px] text-slate-500">
              Đang lọc: <span className="font-semibold text-[#323232]">{searchQuery}</span>
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-2 sm:px-5">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              Đang tải…
            </div>
          ) : null}
          {error ? <p className="py-6 text-center text-sm text-red-700">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              {searchQuery
                ? `Không tìm thấy giao dịch khớp «${searchQuery}».`
                : "Chưa có giao dịch chuyển khoản đến."}
            </p>
          ) : null}
          {items.length > 0 ? (
            <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#EDE8E9] text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-extrabold">Thời gian</th>
                  <th className="py-2 pr-3 font-extrabold">Số tiền</th>
                  <th className="py-2 pr-3 font-extrabold">Mã đơn</th>
                  <th className="py-2 font-extrabold">Nội dung CK</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#F3EEEF] last:border-0">
                    <td className="py-2.5 pr-3 align-top tabular-nums text-slate-600">
                      {formatSepayTransactionDateVn(tx.transactionDate, tx.sepayTransactionDateLocal)}
                    </td>
                    <td className="py-2.5 pr-3 align-top font-bold tabular-nums text-emerald-800">
                      +{formatVnd(tx.transferAmount)}
                    </td>
                    <td className="py-2.5 pr-3 align-top font-semibold text-[#323232]">
                      {orderLabel(tx) ?? "—"}
                    </td>
                    <td className="max-w-[220px] py-2.5 align-top text-slate-600">
                      <span className="line-clamp-2 break-words" title={tx.content}>
                        {tx.content || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDE8E9] px-4 py-3 sm:px-5">
          <p className="m-0 text-[11px] text-slate-500">
            {total > 0
              ? `${total.toLocaleString("vi-VN")} giao dịch${searchQuery ? " khớp" : ""}`
              : searchQuery
                ? "0 kết quả"
                : "—"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 text-[11px] font-semibold text-[#323232] disabled:opacity-40"
            >
              <ChevronLeft size={14} aria-hidden />
              Trước
            </button>
            <span className="min-w-[4.5rem] text-center text-[11px] font-semibold tabular-nums text-[#323232]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2.5 text-[11px] font-semibold text-[#323232] disabled:opacity-40"
            >
              Sau
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  staffId: number;
};

export default function SepayTransferNotification({ staffId }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<SepayIncomingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    setLastSeenAt(readLastSeenAt(staffId));
  }, [staffId]);

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await fetch("/admin/api/sepay-recent-transfers", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        items?: SepayIncomingTransfer[];
      };
      if (!res.ok || !json.ok || !json.items) {
        throw new Error(json.error ?? "Không tải được giao dịch SePay.");
      }
      setItems(json.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTransfers();
    const id = window.setInterval(() => void fetchTransfers(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchTransfers]);

  const unreadItems = useMemo(
    () => items.filter((tx) => isUnread(tx, lastSeenAt)),
    [items, lastSeenAt],
  );

  const unreadCount = unreadItems.length;

  const markAllSeen = useCallback(() => {
    const newest = items[0];
    const newestIso = newest
      ? new Date(
          sepayTransactionInstantMs(newest.transactionDate, newest.sepayTransactionDateLocal),
        ).toISOString()
      : new Date().toISOString();
    writeLastSeenAt(staffId, newestIso);
    setLastSeenAt(newestIso);
  }, [items, staffId]);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((open) => {
      if (open) return false;
      return true;
    });
  }, []);

  const openHistory = useCallback(() => {
    setDropdownOpen(false);
    markAllSeen();
    setHistoryOpen(true);
  }, [markAllSeen]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [dropdownOpen]);

  return (
    <>
      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          onClick={toggleDropdown}
          title="Chuyển khoản SePay mới"
          aria-label={
            unreadCount > 0
              ? `Chuyển khoản mới: ${unreadCount} tin chưa đọc`
              : "Chuyển khoản SePay — không có tin mới"
          }
          aria-expanded={dropdownOpen}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition",
            unreadCount > 0
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-[#EAEAEA] bg-white text-slate-500 hover:bg-slate-50",
          )}
        >
          <Bell size={18} strokeWidth={2} aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EE5CA2] px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        {dropdownOpen ? (
          <div
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#EDE8E9] bg-white shadow-[0_10px_32px_rgba(45,32,32,0.12)]"
            role="dialog"
            aria-label="Tin chuyển khoản chưa đọc"
          >
            <div className="border-b border-[#F3EEEF] px-3 py-2.5">
              <p className="m-0 text-[12px] font-bold text-[#323232]">Chuyển khoản chưa đọc</p>
              <p className="m-0 text-[10px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} tin mới từ SePay` : "Không có tin mới"}
              </p>
            </div>

            <div className="max-h-[min(280px,50vh)] overflow-y-auto px-3">
              {loading && unreadItems.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-slate-500">
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  Đang tải…
                </div>
              ) : null}
              {error ? <p className="py-4 text-[11px] text-red-700">{error}</p> : null}
              {!loading && !error && unreadItems.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-slate-500">Bạn đã xem hết tin mới.</p>
              ) : null}
              {unreadItems.length > 0 ? (
                <ul className="m-0 list-none divide-y divide-[#F3EEEF] p-0">
                  {unreadItems.map((tx) => (
                    <li key={tx.id}>
                      <TransferRow tx={tx} compact />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#F3EEEF] bg-slate-50/80 px-3 py-2">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllSeen}
                  className="text-[10px] font-semibold text-emerald-800 hover:underline"
                >
                  Đánh dấu đã đọc
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={openHistory}
                className="rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#323232] hover:bg-white/90"
              >
                Xem tất cả
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <SepayHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
