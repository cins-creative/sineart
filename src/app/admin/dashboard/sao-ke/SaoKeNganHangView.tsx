"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";

import { createSaoKeNganHang, updateSaoKeTinhTrang } from "@/app/admin/dashboard/sao-ke/actions";
import type { AdminSaoKeRow } from "@/lib/data/admin-sao-ke";
import {
  THANG_OPTIONS,
  TAI_KHOAN_OPTIONS,
  TINH_TRANG_OPTIONS,
  namOptions,
} from "@/lib/data/admin-sao-ke";
import { cn } from "@/lib/utils";

function s2l(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getFileName(u: string): string {
  try {
    const p = decodeURIComponent(u).split("/");
    return (p[p.length - 1] || "file").replace(/^\d+_/, "");
  } catch {
    return "file";
  }
}

function getKyArr(r: AdminSaoKeRow): string[] {
  const arr: string[] = [];
  if (r.ky_sao_ke) arr.push(r.ky_sao_ke);
  const m = (r.ghi_chu ?? "").match(/Các kỳ:\s*(.+)/i);
  if (m?.[1]) {
    return m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return arr;
}

function sortMonths(months: string[]): string[] {
  const order: string[] = [...THANG_OPTIONS];
  return [...months].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function filterByDate(rows: AdminSaoKeRow[], from: string, to: string): AdminSaoKeRow[] {
  if (!from.trim()) return rows;
  const fromD = new Date(from + "T00:00:00");
  const toD = to.trim() ? new Date(to + "T23:59:59") : new Date(from + "T23:59:59");
  return rows.filter((r) => {
    const d = new Date(r.created_at);
    return d >= fromD && d <= toD;
  });
}

const TT_CLASS: Record<string, { wrap: string; sel: string }> = {
  "Chưa xử lý": {
    wrap: "border-amber-200 bg-amber-50",
    sel: "text-amber-900",
  },
  "Đã xử lý": {
    wrap: "border-emerald-200 bg-emerald-50",
    sel: "text-emerald-800",
  },
};

type Props = { initialRows: AdminSaoKeRow[] };

export default function SaoKeNganHangView({ initialRows }: Props) {
  const [rows, setRows] = useState<AdminSaoKeRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [fNam, setFNam] = useState("");
  const [fTT, setFTT] = useState("");
  const [fTK, setFTK] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [svById, setSvById] = useState<Record<number, boolean>>({});
  const [dlById, setDlById] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const centerYear = new Date().getFullYear();
  const yearOpts = namOptions(centerYear);

  const filtered = useMemo(() => {
    const byDate = filterByDate(rows, dateFrom, dateTo);
    return byDate.filter((r) => {
      const q = query.trim();
      if (q) {
        const tk = (r.tai_khoan_ngan_hang ?? "").toString();
        const gc = (r.ghi_chu ?? "").toString();
        if (!s2l(tk).includes(s2l(q)) && !s2l(gc).includes(s2l(q))) return false;
      }
      if (fNam && String(r.nam ?? "") !== fNam) return false;
      if (fTT && String(r.tinh_trang ?? "") !== fTT) return false;
      if (fTK && String(r.tai_khoan_ngan_hang ?? "") !== fTK) return false;
      return true;
    });
  }, [rows, query, fNam, fTT, fTK, dateFrom, dateTo]);

  const total = rows.length;
  const chua = rows.filter((r) => !r.tinh_trang || r.tinh_trang === "Chưa xử lý").length;
  const da = rows.filter((r) => r.tinh_trang === "Đã xử lý").length;

  async function handleTinhTrang(id: number, tinh_trang: string) {
    setSvById((p) => ({ ...p, [id]: true }));
    const res = await updateSaoKeTinhTrang(id, tinh_trang);
    setSvById((p) => ({ ...p, [id]: false }));
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    setRows((p) => p.map((r) => (r.id === id ? { ...r, tinh_trang } : r)));
  }

  async function handleDownload(url: string, id: number) {
    setDlById((p) => ({ ...p, [id]: true }));
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: getFileName(url),
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      window.setTimeout(() => setDlById((p) => ({ ...p, [id]: false })), 600);
    }
  }

  return (
    <div
      className="-m-4 flex min-h-[calc(100vh-5.5rem)] w-[calc(100%+2rem)] max-w-none min-w-0 flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6 md:w-[calc(100%+3rem)]"
      data-supabase-table="tc_sao_ke_ngan_hang"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#2563eb]">
            <Building2 size={20} strokeWidth={2} className="text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Sao kê ngân hàng</div>
            <div className="text-xs text-[#AAAAAA]">
              Upload file · {total} bản ghi · {chua} chưa xử lý · {da} đã xử lý
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#60a5fa] to-[#2563eb] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            Upload sao kê
          </button>
        </div>
      </div>

      <div className="flex w-full max-w-full min-w-0 flex-1 flex-col">
        <div className="w-full max-w-full min-w-0 px-[10px] pb-6 pt-3">
          <div className="mx-auto w-full max-w-[1200px] space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 sm:grid-cols-3">
              <StatCard icon={<FolderOpen size={18} />} label="Tổng file" value={total} grad="from-[#60a5fa] to-[#2563eb]" />
              <StatCard icon={<Clock size={18} />} label="Chưa xử lý" value={chua} grad="from-[#fbbf24] to-[#f59e0b]" />
              <StatCard icon={<CheckCircle2 size={18} />} label="Đã xử lý" value={da} grad="from-[#34d399] to-[#10b981]" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="space-y-2 border-b border-[#EAEAEA] p-3 sm:p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm tài khoản, ghi chú…"
                    className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-[#F5F7F7] py-2 pl-9 pr-9 text-xs text-[#1a1a2e] outline-none focus:border-[#3b82f6]"
                  />
                  {query ? (
                    <button
                      type="button"
                      aria-label="Xóa tìm"
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <FilterSelect
                    label="Tài khoản"
                    value={fTK}
                    onChange={setFTK}
                    placeholder="Tất cả tài khoản"
                    options={[...TAI_KHOAN_OPTIONS]}
                  />
                  <FilterSelect
                    label="Năm"
                    value={fNam}
                    onChange={setFNam}
                    placeholder="Tất cả năm"
                    options={yearOpts}
                  />
                  <FilterSelect
                    label="Tình trạng"
                    value={fTT}
                    onChange={setFTT}
                    placeholder="Tất cả trạng thái"
                    options={[...TINH_TRANG_OPTIONS]}
                  />
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                    Từ ngày
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] outline-none focus:border-[#3b82f6]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
                    Đến ngày
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] outline-none focus:border-[#3b82f6]"
                    />
                  </label>
                  {(fNam || fTT || fTK || dateFrom || dateTo) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFNam("");
                        setFTT("");
                        setFTK("");
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-3 text-xs font-semibold text-[#666] hover:bg-[#fafafa]"
                    >
                      Xóa lọc
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[min(64vh,560px)] overflow-auto">
                <div className="sticky top-0 z-[1] grid grid-cols-[40px_minmax(0,1.2fr)_minmax(0,0.75fr)_64px_120px_100px_100px] gap-2 border-b border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8] sm:px-4">
                  <div>#</div>
                  <div>Tài khoản &amp; ghi chú</div>
                  <div>Kỳ sao kê</div>
                  <div>Năm</div>
                  <div>Tình trạng</div>
                  <div>Thời gian</div>
                  <div className="text-right">Tải về</div>
                </div>
                {filtered.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <div className="text-4xl opacity-80" aria-hidden>
                      🏦
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#888]">Không có sao kê nào</p>
                    <p className="mt-1 text-xs text-[#AAA]">Thử đổi bộ lọc hoặc nhấn «Upload sao kê»</p>
                  </div>
                ) : (
                  filtered.map((r, i) => {
                    const url = (r.file_dinh_kem ?? "").trim();
                    const kyArr = getKyArr(r);
                    const curTT = (r.tinh_trang ?? "Chưa xử lý").trim() || "Chưa xử lý";
                    const ttc = TT_CLASS[curTT] ?? TT_CLASS["Chưa xử lý"];
                    return (
                      <div
                        key={r.id}
                        className="grid grid-cols-[40px_minmax(0,1.2fr)_minmax(0,0.75fr)_64px_120px_100px_100px] items-start gap-2 border-b border-[#f1f5f9] px-3 py-2.5 transition-colors hover:bg-[#f8fafc] sm:px-4"
                      >
                        <div className="pt-0.5 text-[10px] font-semibold text-slate-400">{i + 1}</div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#323232]">
                            {r.tai_khoan_ngan_hang ?? "—"}
                          </div>
                          {r.ghi_chu ? (
                            <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#AAA]">{r.ghi_chu}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {kyArr.map((k) => (
                            <span
                              key={k}
                              className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold text-blue-700"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs font-semibold text-[#323232]">{r.nam ?? "—"}</div>
                        <div className="relative min-w-0">
                          <select
                            value={curTT}
                            disabled={svById[r.id]}
                            onChange={(e) => void handleTinhTrang(r.id, e.target.value)}
                            className={cn(
                              "w-full appearance-none rounded-full border py-1 pl-2 pr-7 text-[10px] font-bold outline-none transition",
                              ttc.wrap,
                              ttc.sel,
                            )}
                          >
                            {TINH_TRANG_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          {svById[r.id] ? (
                            <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin opacity-60" />
                          ) : (
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] opacity-50">
                              ▼
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col text-[10px]">
                          <span className="whitespace-nowrap text-[#666]">{fmtTime(r.created_at)}</span>
                          <span className="whitespace-nowrap text-[#AAA]">{fmtDate(r.created_at)}</span>
                        </div>
                        <div className="flex justify-end pt-0.5">
                          {url ? (
                            <button
                              type="button"
                              disabled={dlById[r.id]}
                              onClick={() => void handleDownload(url, r.id)}
                              className="inline-flex items-center gap-1 rounded-lg border-0 bg-gradient-to-r from-[#60a5fa] to-[#2563eb] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm disabled:opacity-50"
                            >
                              {dlById[r.id] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              Tải
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#AAA]">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal ? (
        <UploadModal
          yearOptions={yearOpts}
          onClose={() => setShowModal(false)}
          onCreated={(row) => {
            setRows((p) => [row, ...p]);
            setShowModal(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  grad,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  grad: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#EAEAEA] bg-white px-4 py-3 shadow-sm">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm",
          `bg-gradient-to-br ${grad}`,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[9px] font-extrabold uppercase tracking-wide text-[#AAA]">{label}</p>
        <p className="m-0 mt-0.5 text-lg font-extrabold tabular-nums text-[#323232]">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 min-w-[120px] max-w-[220px] rounded-[10px] border px-2 text-[12px] font-semibold outline-none",
          value ? "border-blue-400 bg-blue-500/10 text-blue-800" : "border-[#EAEAEA] bg-white text-[#666]",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function UploadModal({
  yearOptions,
  onClose,
  onCreated,
}: {
  yearOptions: string[];
  onClose: () => void;
  onCreated: (row: AdminSaoKeRow) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [tk, setTk] = useState("");
  const [nam, setNam] = useState(String(new Date().getFullYear()));
  const [months, setMonths] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pct, setPct] = useState(0);
  const inpRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function toggleMonth(m: string) {
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function save() {
    setErr(null);
    if (!file) {
      setErr("Chọn file sao kê.");
      return;
    }
    if (!tk) {
      setErr("Chọn tài khoản ngân hàng.");
      return;
    }
    if (months.length === 0) {
      setErr("Chọn ít nhất một kỳ (tháng).");
      return;
    }

    const sorted = sortMonths(months);
    const ky0 = sorted[0]!;
    let ghi_chu: string | null = note.trim() || null;
    if (sorted.length > 1) {
      const extra = `Các kỳ: ${sorted.join(", ")}`;
      ghi_chu = ghi_chu ? `${ghi_chu} | ${extra}` : extra;
    }

    setSaving(true);
    setPct(15);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const up = await fetch("/admin/api/upload-sao-ke", { method: "POST", body: fd, credentials: "same-origin" });
      const jd: unknown = await up.json().catch(() => ({}));
      if (!up.ok || (typeof jd === "object" && jd !== null && (jd as { ok?: boolean }).ok === false)) {
        const msg =
          typeof jd === "object" && jd !== null && "error" in jd
            ? String((jd as { error?: unknown }).error)
            : "Upload thất bại.";
        throw new Error(msg);
      }
      const url =
        typeof jd === "object" && jd !== null && typeof (jd as { url?: unknown }).url === "string"
          ? (jd as { url: string }).url
          : "";
      if (!url) throw new Error("Không nhận được URL file.");

      setPct(70);
      const res = await createSaoKeNganHang({
        tai_khoan_ngan_hang: tk,
        file_dinh_kem: url,
        ky_sao_ke: ky0,
        nam,
        ghi_chu,
      });
      setPct(100);
      if (!res.ok) throw new Error(res.error);
      if (!res.row) throw new Error("Không ghi được CSDL.");
      onCreated(res.row);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Lỗi không xác định.");
    } finally {
      setSaving(false);
      setPct(0);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] border border-[#EAEAEA] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sk-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#F5F7F7] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-blue-600">Sao kê ngân hàng</p>
            <h2 id="sk-modal-title" className="m-0 mt-0.5 text-base font-extrabold text-[#323232]">
              Upload sao kê mới
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] bg-[#F5F7F7] text-[#888] hover:bg-[#eee]"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {err ? (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {err}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              File sao kê <span className="text-red-500">*</span>
            </label>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inpRef.current?.click()}
              onClick={() => inpRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed transition-colors",
                drag ? "border-blue-500 bg-blue-500/10" : file ? "border-emerald-400 bg-emerald-500/5" : "border-[#EAEAEA] bg-[#F5F7F7]",
              )}
            >
              {file ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl" aria-hidden>
                    📄
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-xs font-bold text-[#323232]">{file.name}</p>
                    <p className="m-0 mt-0.5 text-[11px] text-[#888]">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                    aria-label="Bỏ file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                  <span className="text-3xl" aria-hidden>
                    📂
                  </span>
                  <p className="m-0 text-sm text-[#666]">
                    Kéo thả hoặc <span className="font-bold text-blue-600">chọn file</span>
                  </p>
                  <p className="m-0 text-[10px] text-[#AAA]">PDF · Excel · Word · Ảnh · tối đa 20MB</p>
                </div>
              )}
            </div>
            <input
              ref={inpRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
            Tài khoản ngân hàng <span className="text-red-500">*</span>
            <select
              value={tk}
              onChange={(e) => setTk(e.target.value)}
              className="mt-1 h-10 w-full rounded-[10px] border border-[#EAEAEA] bg-white px-3 text-[13px] outline-none focus:border-blue-500"
            >
              <option value="">— Chọn tài khoản —</option>
              {TAI_KHOAN_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
            Năm <span className="text-red-500">*</span>
            <select
              value={nam}
              onChange={(e) => setNam(e.target.value)}
              className="mt-1 h-10 w-full rounded-[10px] border border-[#EAEAEA] bg-white px-3 text-[13px] outline-none focus:border-blue-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Kỳ sao kê <span className="text-red-500">*</span>
            </p>
            <p className="mb-2 mt-0.5 text-[11px] font-medium normal-case text-[#888]">Chọn một hoặc nhiều tháng</p>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] p-2">
            {THANG_OPTIONS.map((m) => {
              const on = months.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMonth(m)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                    on ? "bg-blue-600 text-white shadow-sm" : "bg-white text-[#666] ring-1 ring-[#EAEAEA] hover:bg-slate-50",
                  )}
                >
                  {m.replace("Tháng ", "T")}
                </button>
              );
            })}
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
            Ghi chú
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ghi chú thêm…"
              className="mt-1 w-full resize-y rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-500"
            />
          </label>
        </div>

        {saving ? (
          <div className="shrink-0 px-5 pb-2">
            <div className="h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-center text-[10px] text-[#888]">
              {pct < 60 ? "Đang upload…" : "Đang ghi CSDL…"}
            </p>
          </div>
        ) : null}

        <div className="flex shrink-0 justify-end gap-2 border-t border-[#F5F7F7] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-[10px] border-0 bg-gradient-to-r from-[#60a5fa] to-[#2563eb] px-5 py-2 text-[13px] font-bold text-white shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload sao kê
          </button>
        </div>
      </div>
    </div>
  );
}
