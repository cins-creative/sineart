"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Calendar, Download, GraduationCap, Hash, Layers, Search, Wallet, X } from "lucide-react";

import {
  THONG_KE_THU_CHI_INCLUDE_LUONG,
  type AdminThongKeThuChiRow,
  type ThongKeThuChiNguon,
} from "@/lib/data/admin-thong-ke-thu-chi";
import { cn } from "@/lib/utils";

const NGUON_LABEL: Record<ThongKeThuChiNguon, string> = {
  "hoc-phi": "Học phí",
  "hoa-cu": "Bán họa cụ",
  "hoa-cu-nhap": "Nhập họa cụ",
  "thu-chi-khac": "Thu chi khác",
  luong: "Lương",
};

const NGUON_BADGE: Record<ThongKeThuChiNguon, { bg: string; color: string }> = {
  "hoc-phi": { bg: "#eff6ff", color: "#2563eb" },
  "hoa-cu": { bg: "#fffbeb", color: "#d97706" },
  "hoa-cu-nhap": { bg: "#fff1f2", color: "#e11d48" },
  "thu-chi-khac": { bg: "#ecfdf5", color: "#059669" },
  luong: { bg: "#f5f3ff", color: "#7c3aed" },
};

const PAGE_SIZE = 50;

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n))) + " ₫";
}

function fmtDateTime(iso: string): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function s2l(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdStartMs(ymd: string): number | null {
  const s = ymd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function parseYmdEndMs(ymd: string): number | null {
  const s = ymd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T23:59:59.999`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

/** Lọc theo khoảng [từ ngày, đến ngày] — chuỗi rỗng = không giới hạn đầu/cuối. */
function rowMatchesDateRange(rowIso: string, fromYmd: string, toYmd: string): boolean {
  const t = new Date(rowIso).getTime();
  if (!Number.isFinite(t)) return false;

  let from = fromYmd.trim().slice(0, 10);
  let to = toYmd.trim().slice(0, 10);
  if (from && to && from > to) [from, to] = [to, from];

  const startMs = from ? parseYmdStartMs(from) : null;
  const endMs = to ? parseYmdEndMs(to) : null;
  if (startMs != null && t < startMs) return false;
  if (endMs != null && t > endMs) return false;
  return true;
}

function rangeForLastDays(days: number): { from: string; to: string } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - Math.max(0, days));
  return { from: localYmd(from), to: localYmd(to) };
}

const DATE_INPUT_CLS =
  "h-9 rounded-lg border border-[#EAEAEA] bg-white px-2.5 text-xs font-medium tabular-nums text-[#1a1a2e] outline-none focus:border-[#BC8AF9]";

function exportCsv(rows: AdminThongKeThuChiRow[]) {
  const cols = ["STT", "Ngày giờ", "Nguồn", "Mã GD", "Nội dung", "Thu (₫)", "Chi (₫)", "Trạng thái", "Ghi chú"];
  const escape = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    cols.map(escape).join(","),
    ...rows.map((r, i) =>
      [
        i + 1,
        r.datetime,
        NGUON_LABEL[r.nguon] ?? r.nguon,
        r.maDon,
        r.tieude,
        r.thu || 0,
        r.chi || 0,
        r.trangThai,
        r.ghiChu,
      ]
        .map(escape)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SineArt_ThongKeThuChi_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type SortField = "datetime" | "tieude" | "thu" | "chi" | "maDon" | "nguon";
type SortDir = "asc" | "desc";

type Props = {
  rows: AdminThongKeThuChiRow[];
};

export default function ThongKeThuChiView({ rows: initialRows }: Props) {
  const [query, setQuery] = useState("");
  const [filterNguon, setFilterNguon] = useState<"all" | ThongKeThuChiNguon>("all");
  const [filterLoai, setFilterLoai] = useState<"all" | "thu" | "chi">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("datetime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<AdminThongKeThuChiRow | null>(null);

  const dateFiltered = useMemo(() => {
    if (!dateFrom.trim() && !dateTo.trim()) return initialRows;
    return initialRows.filter((r) => rowMatchesDateRange(r.datetime, dateFrom, dateTo));
  }, [initialRows, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    let list = dateFiltered;
    if (filterNguon !== "all") list = list.filter((r) => r.nguon === filterNguon);
    if (filterLoai === "thu") list = list.filter((r) => r.thu > 0 && r.chi === 0);
    if (filterLoai === "chi") list = list.filter((r) => r.chi > 0);
    if (query.trim()) {
      const q = s2l(query);
      list = list.filter(
        (r) =>
          s2l(r.tieude).includes(q) ||
          s2l(r.maDon).includes(q) ||
          s2l(r.hinhThuc).includes(q) ||
          s2l(r.ghiChu).includes(q) ||
          s2l(r.lopHoc ?? "").includes(q) ||
          s2l(r.khoaHoc ?? "").includes(q) ||
          s2l(r.kyLuong ?? "").includes(q) ||
          s2l(NGUON_LABEL[r.nguon]).includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortField === "thu" || sortField === "chi") {
        const va = a[sortField];
        const vb = b[sortField];
        return va === vb ? 0 : va < vb ? -dir : dir;
      }
      if (sortField === "datetime") {
        const ta = new Date(a.datetime).getTime();
        const tb = new Date(b.datetime).getTime();
        const na = Number.isFinite(ta) ? ta : 0;
        const nb = Number.isFinite(tb) ? tb : 0;
        return na === nb ? 0 : na < nb ? -dir : dir;
      }
      const sa = String(a[sortField] ?? "");
      const sb = String(b[sortField] ?? "");
      return sa.localeCompare(sb, "vi") * (sortDir === "asc" ? 1 : -1);
    });
  }, [dateFiltered, filterNguon, filterLoai, query, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filterNguon, filterLoai, dateFrom, dateTo, query]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const tongThu = useMemo(() => dateFiltered.reduce((s, r) => s + r.thu, 0), [dateFiltered]);
  const tongChi = useMemo(() => dateFiltered.reduce((s, r) => s + r.chi, 0), [dateFiltered]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const applyQuickRange = useCallback((days: number | null) => {
    if (days == null) {
      setDateFrom("");
      setDateTo("");
    } else {
      const r = rangeForLastDays(days);
      setDateFrom(r.from);
      setDateTo(r.to);
    }
    setPage(1);
  }, []);

  const thHead = (label: string, field: SortField) => (
    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-black/[0.04]",
          sortField === field && "text-[#1a1a2e]",
        )}
      >
        {label}
        {sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <BarChart3 className="text-white" size={20} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Thống kê thu chi</div>
            <div className="text-xs text-[#AAAAAA]">
              {initialRows.length} dòng · học phí, họa cụ
              {THONG_KE_THU_CHI_INCLUDE_LUONG ? ", lương" : ""}, thu chi khác
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-sm hover:opacity-95"
          >
            <Download className="h-4 w-4" aria-hidden />
            Xuất CSV
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          <div className="mx-auto flex min-h-[min(56vh,480px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="shrink-0 space-y-3 border-b border-[#EAEAEA] bg-white px-6 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex min-w-[140px] flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-black/40">Từ ngày</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className={DATE_INPUT_CLS}
                  />
                </label>
                <label className="flex min-w-[140px] flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-black/40">Đến ngày</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className={DATE_INPUT_CLS}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-1 pb-0.5">
                  {(
                    [
                      { label: "Hôm nay", days: 0 },
                      { label: "7 ngày", days: 7 },
                      { label: "30 ngày", days: 30 },
                      { label: "90 ngày", days: 90 },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyQuickRange(p.days)}
                      className="rounded-full border border-[#EAEAEA] px-2.5 py-1 text-[11px] font-semibold text-black/50 transition-colors hover:border-[#BC8AF9]/40 hover:text-[#BC8AF9]"
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => applyQuickRange(null)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      !dateFrom && !dateTo
                        ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                        : "border-[#EAEAEA] text-black/50 hover:border-black/15 hover:text-black/70",
                    )}
                  >
                    Tất cả
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 max-w-md flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo nội dung, mã, ghi chú…"
                    className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white pl-9 pr-3 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterNguon}
                    onChange={(e) => {
                      setFilterNguon(e.target.value as typeof filterNguon);
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-[#EAEAEA] bg-white px-3 text-xs font-medium text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
                  >
                    <option value="all">Mọi nguồn</option>
                    <option value="hoc-phi">Học phí</option>
                    <option value="hoa-cu">Bán họa cụ</option>
                    <option value="hoa-cu-nhap">Nhập họa cụ</option>
                    {THONG_KE_THU_CHI_INCLUDE_LUONG ? <option value="luong">Lương</option> : null}
                    <option value="thu-chi-khac">Thu chi khác</option>
                  </select>
                  <select
                    value={filterLoai}
                    onChange={(e) => {
                      setFilterLoai(e.target.value as typeof filterLoai);
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-[#EAEAEA] bg-white px-3 text-xs font-medium text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
                  >
                    <option value="all">Thu + Chi</option>
                    <option value="thu">Chỉ thu</option>
                    <option value="chi">Chỉ chi</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-b border-[#EAEAEA] bg-white px-6 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  className="rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-4"
                  style={{ borderLeftWidth: 4, borderLeftColor: "#10b981" }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-black/45">
                    Tổng thu (theo bộ lọc ngày)
                  </div>
                  <div className="mt-1 text-xl font-bold text-[#059669]">{fmtVnd(tongThu)}</div>
                </div>
                <div
                  className="rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-4"
                  style={{ borderLeftWidth: 4, borderLeftColor: "#ef4444" }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-black/45">
                    Tổng chi (theo bộ lọc ngày)
                  </div>
                  <div className="mt-1 text-xl font-bold text-[#dc2626]">{fmtVnd(tongChi)}</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                    {thHead("Thời gian", "datetime")}
                    {thHead("Nguồn", "nguon")}
                    {thHead("Mã", "maDon")}
                    {thHead("Nội dung", "tieude")}
                    {thHead("Thu", "thu")}
                    {thHead("Chi", "chi")}
                    <th className="whitespace-nowrap px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-black/50">
                      TT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#888]">
                        Không có dòng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-[#F0F0F0] last:border-0 hover:bg-[#BC8AF9]/06"
                        onClick={() => setSelectedRow(r)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedRow(r);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết: ${r.tieude}`}
                      >
                        <td className="whitespace-nowrap px-6 py-2.5 text-black/80">{fmtDateTime(r.datetime)}</td>
                        <td className="px-6 py-2.5">
                          <span
                            className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: NGUON_BADGE[r.nguon].bg,
                              color: NGUON_BADGE[r.nguon].color,
                            }}
                          >
                            {NGUON_LABEL[r.nguon]}
                          </span>
                        </td>
                        <td className="max-w-[120px] truncate px-6 py-2.5 font-mono text-[12px] text-black/70">
                          {r.maDon || "—"}
                        </td>
                        <td className="max-w-[280px] px-6 py-2.5 text-black/85">
                          <span className="line-clamp-2" title={r.tieude}>
                            {r.tieude}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium text-[#059669]">
                          {r.thu > 0 ? fmtVnd(r.thu) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium text-[#dc2626]">
                          {r.chi > 0 ? fmtVnd(r.chi) : "—"}
                        </td>
                        <td className="max-w-[100px] truncate px-6 py-2.5 text-[12px] text-black/55" title={r.trangThai}>
                          {r.trangThai}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 ? (
              <div className="flex shrink-0 flex-col gap-3 border-t border-[#EAEAEA] bg-[#fafafa] px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[12px] text-black/55">
                  {filtered.length} dòng sau lọc — trang {page}/{totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#323232] hover:bg-black/[0.03] disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#323232] hover:bg-black/[0.03] disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {selectedRow ? (
        <TransactionDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      ) : null}
    </div>
  );
}

function TransactionDetailModal({
  row,
  onClose,
}: {
  row: AdminThongKeThuChiRow;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const badge = NGUON_BADGE[row.nguon];
  const loai =
    row.thu > 0 && row.chi > 0 ? "Thu + Chi" : row.thu > 0 ? "Thu" : row.chi > 0 ? "Chi" : row.trangThai;
  const loaiTone: "thu" | "chi" | undefined =
    row.thu > 0 && row.chi > 0 ? undefined : row.thu > 0 ? "thu" : row.chi > 0 ? "chi" : undefined;
  const title =
    row.nguon === "hoc-phi"
      ? row.ghiChu?.trim() || row.tieude.replace(/^HP:\s*/i, "").trim() || row.tieude
      : row.nguon === "luong"
        ? row.tieude.replace(/^Lương:\s*/i, "").trim() || row.tieude
        : row.tieude || NGUON_LABEL[row.nguon];
  const showGhiChu =
    Boolean(row.ghiChu?.trim()) &&
    row.nguon !== "luong" &&
    s2l(row.ghiChu) !== s2l(title) &&
    s2l(row.ghiChu) !== s2l(row.tieude.replace(/^HP:\s*/i, ""));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="thong-ke-tc-detail-title"
        className="flex max-h-[min(92vh,640px)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[var(--shadow-md,0_10px_32px_rgba(45,32,32,.12))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#F0F0F0] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {NGUON_LABEL[row.nguon]}
                </span>
                {row.trangThai ? (
                  <span className="inline-flex rounded-full border border-[#EAEAEA] bg-[#F5F7F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                    {row.trangThai}
                  </span>
                ) : null}
              </div>
              <h2
                id="thong-ke-tc-detail-title"
                className="m-0 mt-2 line-clamp-2 text-[17px] font-extrabold leading-snug text-[#1a1a2e]"
              >
                {title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-black/45">
                {row.maDon ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-black/55">
                    <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {row.maDon}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  {fmtDateTime(row.datetime)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#EAEAEA] bg-[#F5F7F7] text-black/50 hover:bg-black/[0.04]"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {row.thu > 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-emerald-700/70">Thu</p>
                <p className="m-0 mt-1 text-[22px] font-extrabold tabular-nums leading-none text-[#059669]">
                  {fmtVnd(row.thu)}
                </p>
              </div>
            ) : null}
            {row.chi > 0 ? (
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-red-700/70">Chi</p>
                <p className="m-0 mt-1 text-[22px] font-extrabold tabular-nums leading-none text-[#dc2626]">
                  {fmtVnd(row.chi)}
                </p>
              </div>
            ) : null}
            {row.thu === 0 && row.chi === 0 ? (
              <div className="rounded-xl border border-[#EAEAEA] bg-[#F5F7F7] px-4 py-3 sm:col-span-2">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">Số tiền</p>
                <p className="m-0 mt-1 text-[15px] font-bold text-black/55">—</p>
              </div>
            ) : null}
          </div>

          {row.nguon === "hoc-phi" ? (
            <div
              className="overflow-hidden rounded-xl border border-[#EAEAEA]"
              style={{ background: `linear-gradient(135deg, ${badge.bg} 0%, #ffffff 72%)` }}
            >
              <div className="border-b border-[#EAEAEA]/80 px-4 py-2.5">
                <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide" style={{ color: badge.color }}>
                  Đăng ký học
                </p>
              </div>
              <div className="space-y-3 px-4 py-3">
                <div className="flex gap-3">
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">Khóa học</p>
                    <p className="m-0 mt-0.5 break-words text-[13px] font-bold leading-snug text-[#1a1a2e]">
                      {row.khoaHoc?.trim() || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 border-t border-[#EAEAEA]/80 pt-3">
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    <GraduationCap className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">Lớp học</p>
                    <p className="m-0 mt-0.5 break-words text-[13px] font-bold leading-snug text-[#1a1a2e]">
                      {row.lopHoc?.trim() || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : row.nguon === "luong" ? (
            <div
              className="overflow-hidden rounded-xl border border-[#EAEAEA]"
              style={{ background: `linear-gradient(135deg, ${badge.bg} 0%, #ffffff 72%)` }}
            >
              <div className="border-b border-[#EAEAEA]/80 px-4 py-2.5">
                <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide" style={{ color: badge.color }}>
                  Phiếu lương
                </p>
              </div>
              <div className="flex gap-3 px-4 py-3">
                <span
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  <Calendar className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">Kỳ lương</p>
                  <p className="m-0 mt-0.5 break-words text-[13px] font-bold leading-snug text-[#1a1a2e]">
                    {row.kyLuong?.trim() || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : row.tieude ? (
            <div className="rounded-xl border border-[#EAEAEA] bg-[#F5F7F7]/60 px-4 py-3">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">Nội dung</p>
              <p className="m-0 mt-1 break-words text-[13px] font-semibold leading-snug text-[#1a1a2e]">{row.tieude}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailMetaCell
              icon={Wallet}
              label={row.nguon === "luong" ? "Hình thức tính lương" : "Hình thức"}
              value={row.hinhThuc?.trim() || "—"}
            />
            <DetailMetaCell icon={Layers} label="Loại" value={loai || "—"} tone={loaiTone} />
          </div>

          {showGhiChu ? (
            <div className="rounded-xl border border-dashed border-[#EAEAEA] bg-white px-4 py-3">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">Ghi chú</p>
              <p className="m-0 mt-1 break-words text-[13px] font-medium leading-snug text-[#475569]">{row.ghiChu}</p>
            </div>
          ) : null}

          <p className="m-0 pt-1 text-center font-mono text-[10px] text-black/30">ID: {row.id}</p>
        </div>

        <div className="flex shrink-0 justify-end border-t border-[#F0F0F0] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-[12px] font-semibold text-[#475569] hover:bg-black/[0.03]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailMetaCell({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "thu" | "chi";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-3.5 py-3",
        tone === "thu" && "border-emerald-100 bg-emerald-50/50",
        tone === "chi" && "border-red-100 bg-red-50/50",
        !tone && "border-[#EAEAEA] bg-white",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          tone === "thu" && "bg-emerald-100 text-[#059669]",
          tone === "chi" && "bg-red-100 text-[#dc2626]",
          !tone && "bg-[#F5F7F7] text-black/45",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-black/40">{label}</p>
        <p
          className={cn(
            "m-0 mt-0.5 break-words text-[13px] font-semibold",
            tone === "thu" && "text-[#059669]",
            tone === "chi" && "text-[#dc2626]",
            !tone && "text-[#1a1a2e]",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
