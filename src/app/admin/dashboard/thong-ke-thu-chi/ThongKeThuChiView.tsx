"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Search } from "lucide-react";

import type { AdminThongKeThuChiRow, ThongKeThuChiNguon } from "@/lib/data/admin-thong-ke-thu-chi";
import { cn } from "@/lib/utils";

const DATE_PRESETS: { label: string; days: number }[] = [
  { label: "Hôm nay", days: 0 },
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
  { label: "Tất cả", days: -1 },
];

const NGUON_LABEL: Record<ThongKeThuChiNguon, string> = {
  "hoc-phi": "Học phí",
  "hoa-cu": "Bán họa cụ",
  "giao-dich": "Giao dịch",
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

function sinceIsoForDays(days: number): string | null {
  if (days < 0) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function rowMatchesPreset(rowIso: string, days: number): boolean {
  if (days < 0) return true;
  const since = sinceIsoForDays(days);
  if (!since) return true;
  const t = new Date(rowIso).getTime();
  const s = new Date(since).getTime();
  return Number.isFinite(t) && t >= s;
}

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
  const [datePreset, setDatePreset] = useState(-1);
  const [sortField, setSortField] = useState<SortField>("datetime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const dateFiltered = useMemo(() => {
    if (datePreset < 0) return initialRows;
    return initialRows.filter((r) => rowMatchesPreset(r.datetime, datePreset));
  }, [initialRows, datePreset]);

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
  }, [filterNguon, filterLoai, datePreset, query]);

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
              {initialRows.length} giao dịch · học phí, họa cụ, SePay
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
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setDatePreset(p.days);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      datePreset === p.days
                        ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                        : "border-[#EAEAEA] text-black/50 hover:border-black/15 hover:text-black/70",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
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
                    <option value="giao-dich">Giao dịch</option>
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
                      <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-black/[0.02]">
                        <td className="whitespace-nowrap px-6 py-2.5 text-black/80">{fmtDateTime(r.datetime)}</td>
                        <td className="px-6 py-2.5">
                          <span
                            className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              background:
                                r.nguon === "hoc-phi"
                                  ? "#eff6ff"
                                  : r.nguon === "hoa-cu"
                                    ? "#fffbeb"
                                    : "#f5f3ff",
                              color:
                                r.nguon === "hoc-phi" ? "#2563eb" : r.nguon === "hoa-cu" ? "#d97706" : "#7c3aed",
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
    </div>
  );
}
