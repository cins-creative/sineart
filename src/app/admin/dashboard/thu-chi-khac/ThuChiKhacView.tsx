"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { createLoaiThuChi, createThuChiKhacPhieu } from "@/app/admin/dashboard/thu-chi-khac/actions";
import type {
  AdminLoaiThuChiOpt,
  AdminThuChiKhacBundle,
  AdminThuChiKhacRow,
  AdminThuChiStaffOpt,
} from "@/lib/data/admin-thu-chi-khac";
import { cn } from "@/lib/utils";

const HINH_THUC_OPTS = ["Tiền mặt", "Chuyển khoản"] as const;

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n))) + " ₫";
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
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

function unwrapJoin<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : v;
}

function tenNguoiTao(r: AdminThuChiKhacRow): string {
  const j = unwrapJoin(r.nguoi_tao as { full_name?: string } | null);
  return j?.full_name?.trim() || "—";
}

function tenMuc(r: AdminThuChiKhacRow): string {
  const j = unwrapJoin(r.loai as { giai_nghia?: string } | null);
  return j?.giai_nghia?.trim() || "—";
}

function filterByDate(rows: AdminThuChiKhacRow[], from: string, to: string): AdminThuChiKhacRow[] {
  if (!from.trim()) return rows;
  const fromD = new Date(from + "T00:00:00");
  const toD = to.trim() ? new Date(to + "T23:59:59") : new Date(from + "T23:59:59");
  return rows.filter((r) => {
    const d = new Date(r.created_at);
    return d >= fromD && d <= toD;
  });
}

type Props = {
  bundle: AdminThuChiKhacBundle;
  defaultNguoiTaoId: number;
};

export default function ThuChiKhacView({ bundle, defaultNguoiTaoId }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterLoai, setFilterLoai] = useState<"all" | "thu" | "chi">("all");
  const [filterMucId, setFilterMucId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showPhieu, setShowPhieu] = useState(false);
  const [showLoai, setShowLoai] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const notify = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const dateScoped = useMemo(
    () => filterByDate(bundle.records, dateFrom, dateTo),
    [bundle.records, dateFrom, dateTo]
  );

  const filtered = useMemo(() => {
    return dateScoped.filter((r) => {
      const thu = Number(r.thu) || 0;
      const chi = Number(r.chi) || 0;
      if (query.trim()) {
        const q = s2l(query.trim());
        if (!s2l(r.tieu_de || "").includes(q) && !s2l(tenNguoiTao(r)).includes(q)) return false;
      }
      if (filterLoai === "thu" && thu === 0) return false;
      if (filterLoai === "chi" && chi === 0) return false;
      if (filterMucId && String(r.loai_thu_chi_id ?? "") !== filterMucId) return false;
      return true;
    });
  }, [dateScoped, query, filterLoai, filterMucId]);

  const tongThu = useMemo(() => dateScoped.reduce((s, r) => s + (Number(r.thu) || 0), 0), [dateScoped]);
  const tongChi = useMemo(() => dateScoped.reduce((s, r) => s + (Number(r.chi) || 0), 0), [dateScoped]);
  const canDoi = tongThu - tongChi;

  function refresh() {
    router.refresh();
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #BC8AF9, #ED5C9D)" }}
          >
            <FileText size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#BC8AF9" }}>
              Quản lý
            </p>
            <h1 className="m-0 text-[17px] font-bold tracking-tight text-[#323232]">Thu chi khác</h1>
            <p className="m-0 mt-0.5 text-xs text-[#AAAAAA]">Phiếu thu/chi ngoài học phí — tc_thu_chi_khac</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowLoai(true)}
            className="rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            <Tag className="mb-0.5 mr-1 inline" size={14} />
            Danh mục
          </button>
          <button
            type="button"
            onClick={() => setShowPhieu(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={16} strokeWidth={2.5} />
            Thêm phiếu
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2.5">
          <StatCard label="Tổng thu" value={fmtVnd(tongThu)} icon={<TrendingUp size={18} />} grad="from-emerald-400 to-emerald-600" />
          <StatCard label="Tổng chi" value={fmtVnd(tongChi)} icon={<TrendingDown size={18} />} grad="from-red-400 to-red-600" />
          <StatCard
            label="Cân đối"
            value={fmtVnd(Math.abs(canDoi))}
            icon={<Wallet size={18} />}
            grad={canDoi >= 0 ? "from-emerald-400 to-teal-600" : "from-orange-400 to-red-500"}
            sub={canDoi >= 0 ? "Thặng dư" : "Thâm hụt"}
          />
          <StatCard label="Số phiếu (lọc)" value={String(filtered.length)} icon={<FileText size={18} />} grad="from-[#BC8AF9] to-[#ED5C9D]" />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tiêu đề, nhân viên…"
                className="h-9 w-full rounded-[10px] border border-[#EAEAEA] bg-[#F5F7F7] py-0 pl-9 pr-8 text-[13px] outline-none focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Xóa tìm"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9ca3af] hover:bg-black/[0.05]"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={refresh}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#EAEAEA] bg-white text-[#888] hover:bg-[#fafafa]"
              aria-label="Tải lại"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Loại phiếu
              <select
                value={filterLoai}
                onChange={(e) => setFilterLoai(e.target.value as "all" | "thu" | "chi")}
                className="h-9 min-w-[120px] rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              >
                <option value="all">Tất cả</option>
                <option value="thu">Thu</option>
                <option value="chi">Chi</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Danh mục
              <select
                value={filterMucId}
                onChange={(e) => setFilterMucId(e.target.value)}
                className="h-9 min-w-[160px] rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              >
                <option value="">— Tất cả —</option>
                {bundle.loaiOptions.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.giai_nghia}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              <span className="flex items-center gap-1">
                <CalendarRange size={11} /> Từ ngày
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Đến ngày
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              />
            </label>
            {(dateFrom || dateTo) ? (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-3 text-xs font-semibold text-[#666]"
              >
                Xóa lọc ngày
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
                <tr className="border-b border-[#EAEAEA]">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5">Tiêu đề</th>
                  <th className="px-3 py-2.5">Danh mục</th>
                  <th className="px-3 py-2.5 text-right">Thu</th>
                  <th className="px-3 py-2.5 text-right">Chi</th>
                  <th className="px-3 py-2.5">Hình thức</th>
                  <th className="px-3 py-2.5">Người tạo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#888]">
                      Không có phiếu nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const thu = Number(r.thu) || 0;
                    const chi = Number(r.chi) || 0;
                    return (
                      <tr key={r.id} className="border-b border-[#f8fafc] transition hover:bg-[#f8fafc]">
                        <td className="px-3 py-2.5 tabular-nums text-[#AAA]">{i + 1}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[#666]">{fmtDateTime(r.created_at)}</td>
                        <td className="px-3 py-2.5 font-medium text-[#1a1a2e]">{r.tieu_de}</td>
                        <td className="px-3 py-2.5 text-[#555]">{tenMuc(r)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{thu > 0 ? fmtVnd(thu) : "—"}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-red-600">{chi > 0 ? fmtVnd(chi) : "—"}</td>
                        <td className="px-3 py-2.5 text-[#666]">{r.hinh_thuc?.trim() || "—"}</td>
                        <td className="px-3 py-2.5 text-[#555]">{tenNguoiTao(r)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPhieu ? (
          <ModalThemPhieu
            key="them-phieu"
            staffOptions={bundle.staffOptions}
            loaiOptions={bundle.loaiOptions}
            defaultNguoiTaoId={defaultNguoiTaoId}
            onClose={() => setShowPhieu(false)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                setShowPhieu(false);
                refresh();
              }
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showLoai ? (
          <ModalThemLoai
            key="them-loai"
            onClose={() => setShowLoai(false)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                setShowLoai(false);
                refresh();
              }
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "fixed bottom-6 right-6 z-[100] max-w-[min(90vw,360px)] rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg",
              toast.ok ? "bg-gradient-to-r from-[#4dffb0] to-[#00c08b]" : "bg-gradient-to-r from-[#ff6b6b] to-[#EE5CA2]"
            )}
          >
            {toast.ok ? "✓ " : "✕ "}
            {toast.msg}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  grad,
  sub,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  grad: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-white p-3 shadow-sm">
      <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white", grad)}>{icon}</div>
      <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#AAA]">{label}</p>
      <p className="m-0 mt-1 text-lg font-extrabold tabular-nums text-[#1a1a2e]">{value}</p>
      {sub ? <p className="m-0 mt-0.5 text-[10px] font-medium text-[#888]">{sub}</p> : null}
    </div>
  );
}

function ModalThemPhieu({
  staffOptions,
  loaiOptions,
  defaultNguoiTaoId,
  onClose,
  onDone,
}: {
  staffOptions: AdminThuChiStaffOpt[];
  loaiOptions: AdminLoaiThuChiOpt[];
  defaultNguoiTaoId: number;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const ids = new Set(staffOptions.map((s) => s.id));
  const initialStaff = ids.has(defaultNguoiTaoId) ? String(defaultNguoiTaoId) : staffOptions[0] ? String(staffOptions[0].id) : "";

  const [loai, setLoai] = useState<"thu" | "chi">("chi");
  const [tieuDe, setTieuDe] = useState("");
  const [soTien, setSoTien] = useState("");
  const [mucId, setMucId] = useState("");
  const [hinhThuc, setHinhThuc] = useState<string>(HINH_THUC_OPTS[0]);
  const [chuThich, setChuThich] = useState("");
  const [staffId, setStaffId] = useState(initialStaff);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!tieuDe.trim()) {
      onDone("Nhập tiêu đề.", false);
      return;
    }
    const n = Number(soTien.replace(/\s/g, "").replace(/,/g, "."));
    if (!Number.isFinite(n) || n <= 0) {
      onDone("Nhập số tiền hợp lệ.", false);
      return;
    }
    if (!staffId) {
      onDone("Chọn người tạo phiếu.", false);
      return;
    }
    setBusy(true);
    const r = await createThuChiKhacPhieu({
      tieu_de: tieuDe,
      chu_thich: chuThich.trim() || null,
      loai,
      so_tien: n,
      hinh_thuc: hinhThuc,
      loai_thu_chi_id: mucId ? Number(mucId) : null,
      nguoi_tao_id: Number(staffId),
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã thêm phiếu.", true);
    else onDone(r.error, false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">Thu chi khác</p>
            <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">{loai === "thu" ? "Thêm phiếu thu" : "Thêm phiếu chi"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#888]">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[min(72vh,520px)] space-y-3 overflow-y-auto px-5 py-4">
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Loại *</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { k: "thu" as const, lab: "Thu", border: "border-emerald-500", bg: "bg-emerald-50" },
                  { k: "chi" as const, lab: "Chi", border: "border-red-500", bg: "bg-red-50" },
                ] as const
              ).map(({ k, lab, border, bg }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLoai(k)}
                  className={cn(
                    "rounded-[10px] border-[1.5px] py-2.5 text-[13px] font-bold transition",
                    loai === k ? cn(border, bg, "text-[#1a1a2e]") : "border-[#EAEAEA] bg-white text-[#666]"
                  )}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Tiêu đề *</span>
            <input
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="VD: Mua văn phòng phẩm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Số tiền (VNĐ) *</span>
            <input
              value={soTien}
              onChange={(e) => setSoTien(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="500000"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Danh mục</span>
            <select
              value={mucId}
              onChange={(e) => setMucId(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            >
              <option value="">— Không chọn —</option>
              {loaiOptions.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.giai_nghia} ({o.loai_thu_chi})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Hình thức</span>
            <select
              value={hinhThuc}
              onChange={(e) => setHinhThuc(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            >
              {HINH_THUC_OPTS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Ghi chú</span>
            <textarea
              value={chuThich}
              onChange={(e) => setChuThich(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Người tạo phiếu *</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            >
              <option value="">— Chọn —</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            Lưu phiếu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalThemLoai({ onClose, onDone }: { onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const [giaiNghia, setGiaiNghia] = useState("");
  const [loaiThuChi, setLoaiThuChi] = useState<"Thu" | "Chi">("Chi");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!giaiNghia.trim()) {
      onDone("Nhập tên danh mục.", false);
      return;
    }
    setBusy(true);
    const r = await createLoaiThuChi({ giai_nghia: giaiNghia, loai_thu_chi: loaiThuChi });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã thêm danh mục.", true);
    else onDone(r.error, false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-2xl border border-[#EAEAEA] bg-white shadow-2xl"
      >
        <div className="border-b border-[#f0f0f0] px-5 py-4">
          <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">Danh mục</p>
          <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">Thêm loại thu / chi</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Tên hiển thị *</span>
            <input
              value={giaiNghia}
              onChange={(e) => setGiaiNghia(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="VD: Chi phí marketing"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Loại danh mục</span>
            <div className="grid grid-cols-2 gap-2">
              {(["Thu", "Chi"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLoaiThuChi(t)}
                  className={cn(
                    "rounded-[10px] border py-2 text-[13px] font-bold",
                    loaiThuChi === t ? "border-[#BC8AF9] bg-[#BC8AF9]/10 text-[#1a1a2e]" : "border-[#EAEAEA] text-[#666]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#BC8AF9] to-[#ED5C9D] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            Lưu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
