"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  createDanhMucThuChi,
  createThuChiKhacPhieu,
  deleteThuChiKhacPhieu,
  updateThuChiKhacPhieu,
} from "@/app/admin/dashboard/thu-chi-khac/actions";
import type {
  AdminDanhMucThuChiOpt,
  AdminThuChiKhacBundle,
  AdminThuChiKhacRow,
} from "@/lib/data/admin-thu-chi-khac";
import { cn } from "@/lib/utils";

const HINH_THUC_OPTS = ["Tiền mặt", "Chuyển khoản"] as const;

/** Native select + option — màu chữ đậm khi đóng/mở dropdown (Chrome/Edge/Safari). */
const SELECT_TEXT_CLASS =
  "text-[13px] text-[#1a1a2e] outline-none focus:border-[#BC8AF9] [&_option]:text-[#1a1a2e]";

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

/** Khớp `tc_danh_muc_thu_chi.loai` với nút Thu/Chi của phiếu (không phân biệt hoa thường). */
function danhMucMatchesPhieuLoai(dmLoai: string, phieuLoai: "thu" | "chi"): boolean {
  const t = dmLoai.trim().toLowerCase();
  return phieuLoai === "thu" ? t === "thu" : t === "chi";
}

function tenNguoiTao(r: AdminThuChiKhacRow): string {
  const j = unwrapJoin(r.nguoi_tao as { full_name?: string } | null);
  return j?.full_name?.trim() || "—";
}

function tenMuc(r: AdminThuChiKhacRow): string {
  const dm = unwrapJoin(
    r.danh_muc as { ten?: string | null } | { ten?: string | null }[] | null,
  );
  if (dm?.ten != null && String(dm.ten).trim() !== "") return String(dm.ten).trim();
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

function deriveLoaiSoTienFromRow(r: AdminThuChiKhacRow): { loai: "thu" | "chi"; soTien: string } {
  const thu = Number(r.thu) || 0;
  const chi = Number(r.chi) || 0;
  if (thu > 0 && chi === 0) return { loai: "thu", soTien: String(Math.round(thu)) };
  if (chi > 0 && thu === 0) return { loai: "chi", soTien: String(Math.round(chi)) };
  if (chi >= thu) return { loai: "chi", soTien: String(Math.round(chi || thu)) };
  return { loai: "thu", soTien: String(Math.round(thu || chi)) };
}

function hinhThucForSelect(v: string | null): string {
  const t = v?.trim() || "";
  if ((HINH_THUC_OPTS as readonly string[]).includes(t)) return t;
  return HINH_THUC_OPTS[0];
}

type Props = {
  bundle: AdminThuChiKhacBundle;
  defaultNguoiTaoId: number;
  /** Họ tên trong phiên JWT — hiển thị người tạo phiếu (không cho chọn). */
  loggedInStaffName: string;
};

export default function ThuChiKhacView({ bundle, defaultNguoiTaoId, loggedInStaffName }: Props) {
  const { canEditThuChiKhacPhieu } = useAdminDashboardAbilities();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterLoai, setFilterLoai] = useState<"all" | "thu" | "chi">("all");
  /** Id `tc_danh_muc_thu_chi.id` — lọc theo danh mục mới. */
  const [filterMucId, setFilterMucId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [phieuModal, setPhieuModal] = useState<
    null | { kind: "create" } | { kind: "edit"; row: AdminThuChiKhacRow }
  >(null);
  const [showLoai, setShowLoai] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
      if (filterMucId) {
        const want = Number(filterMucId);
        if (!Number.isFinite(want) || Number(r.danh_muc_thu_chi_id) !== want) return false;
      }
      return true;
    });
  }, [dateScoped, query, filterLoai, filterMucId]);

  function refresh() {
    router.refresh();
  }

  const handleDeleteRow = useCallback(
    async (r: AdminThuChiKhacRow) => {
      if (
        !globalThis.confirm(`Xóa phiếu «${r.tieu_de}»? Thao tác không hoàn tác.`)
      ) {
        return;
      }
      setDeletingId(r.id);
      const res = await deleteThuChiKhacPhieu(r.id);
      setDeletingId(null);
      if (res.ok) {
        notify(res.message ?? "Đã xóa phiếu.", true);
        router.refresh();
      } else {
        notify(res.error, false);
      }
    },
    [notify, router],
  );

  return (
    <div className="-m-4 flex min-h-0 flex-1 flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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
            onClick={() => setPhieuModal({ kind: "create" })}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={16} strokeWidth={2.5} />
            Thêm phiếu
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="shrink-0 space-y-3 border-b border-[#EAEAEA] bg-[#fafafa]/90 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tiêu đề, nhân viên…"
                className="h-9 w-full rounded-[10px] border border-[#EAEAEA] bg-[#F5F7F7] py-0 pl-9 pr-8 text-[13px] text-[#1a1a2e] outline-none placeholder:text-black/35 focus:border-[#BC8AF9] focus:ring-[3px] focus:ring-[#BC8AF9]/15"
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
                className={cn(
                  "h-9 min-w-[120px] rounded-[10px] border border-[#EAEAEA] bg-white px-2",
                  SELECT_TEXT_CLASS,
                )}
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
                className={cn(
                  "h-9 min-w-[min(100%,306px)] rounded-[10px] border border-[#EAEAEA] bg-white px-2",
                  SELECT_TEXT_CLASS,
                )}
              >
                <option value="">— Tất cả —</option>
                {bundle.danhMucOptions.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nhom && d.nhom !== "—" ? `${d.nhom} · ${d.ten}` : d.ten}
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
                className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#AAA]">
              Đến ngày
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-[10px] border border-[#EAEAEA] bg-white px-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
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

          <div className="min-h-0 flex-1 overflow-auto bg-white">
            <table className="w-full min-w-[920px] border-collapse text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#1a1a2e]">
                <tr className="border-b border-[#EAEAEA]">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5">Tiêu đề</th>
                  <th className="px-3 py-2.5">Danh mục</th>
                  <th className="px-3 py-2.5 text-right">Thu</th>
                  <th className="px-3 py-2.5 text-right">Chi</th>
                  <th className="px-3 py-2.5">Hình thức</th>
                  <th className="px-3 py-2.5">Người tạo</th>
                  {canEditThuChiKhacPhieu ? (
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEditThuChiKhacPhieu ? 9 : 8}
                      className="px-4 py-12 text-center text-sm text-[#888]"
                    >
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
                        {canEditThuChiKhacPhieu ? (
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPhieuModal({ kind: "edit", row: r })}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#EAEAEA] bg-white px-2 py-1 text-[12px] font-semibold text-[#555] hover:border-[#BC8AF9]/50 hover:bg-[#faf5ff] hover:text-[#7c3aed]"
                              >
                                <Pencil size={13} strokeWidth={2} aria-hidden />
                                Sửa
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === r.id}
                                onClick={() => void handleDeleteRow(r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[12px] font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                                aria-label={`Xóa phiếu ${r.tieu_de}`}
                              >
                                {deletingId === r.id ? (
                                  <Loader2 className="animate-spin" size={13} aria-hidden />
                                ) : (
                                  <Trash2 size={13} strokeWidth={2} aria-hidden />
                                )}
                                Xóa
                              </button>
                            </div>
                          </td>
                        ) : null}
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
        {phieuModal ? (
          <ModalPhieuThuChi
            key={phieuModal.kind === "create" ? "phieu-create" : `phieu-edit-${phieuModal.row.id}`}
            mode={phieuModal.kind === "create" ? "create" : "edit"}
            editRow={phieuModal.kind === "edit" ? phieuModal.row : null}
            danhMucOptions={bundle.danhMucOptions}
            defaultNguoiTaoId={defaultNguoiTaoId}
            loggedInStaffName={loggedInStaffName}
            onClose={() => setPhieuModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                setPhieuModal(null);
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

function ModalPhieuThuChi({
  mode,
  editRow,
  danhMucOptions,
  defaultNguoiTaoId,
  loggedInStaffName,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  editRow: AdminThuChiKhacRow | null;
  danhMucOptions: AdminDanhMucThuChiOpt[];
  defaultNguoiTaoId: number;
  loggedInStaffName: string;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const derived = editRow ? deriveLoaiSoTienFromRow(editRow) : null;

  const [loai, setLoai] = useState<"thu" | "chi">(derived?.loai ?? "chi");
  const [tieuDe, setTieuDe] = useState(editRow?.tieu_de ?? "");
  const [soTien, setSoTien] = useState(derived?.soTien ?? "");
  const [mucId, setMucId] = useState(() =>
    editRow?.danh_muc_thu_chi_id != null ? String(editRow.danh_muc_thu_chi_id) : "",
  );
  const [hinhThuc, setHinhThuc] = useState(hinhThucForSelect(editRow?.hinh_thuc ?? null));
  const [chuThich, setChuThich] = useState(editRow?.chu_thich ?? "");
  const [busy, setBusy] = useState(false);

  const filteredDanhMuc = useMemo(
    () => danhMucOptions.filter((d) => danhMucMatchesPhieuLoai(d.loai, loai)),
    [danhMucOptions, loai],
  );

  useEffect(() => {
    setMucId((prev) => {
      if (!prev) return "";
      const id = Number(prev);
      if (!Number.isFinite(id)) return "";
      if (!filteredDanhMuc.some((d) => d.id === id)) return "";
      return prev;
    });
  }, [filteredDanhMuc]);

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
    const nguoiTaoId =
      mode === "edit" && editRow
        ? Number(editRow.nguoi_tao_id) > 0
          ? Number(editRow.nguoi_tao_id)
          : defaultNguoiTaoId
        : defaultNguoiTaoId;
    if (!Number.isFinite(nguoiTaoId) || nguoiTaoId <= 0) {
      onDone("Không xác định được người tạo phiếu.", false);
      return;
    }
    const payload = {
      tieu_de: tieuDe,
      chu_thich: chuThich.trim() || null,
      loai,
      so_tien: n,
      hinh_thuc: hinhThuc,
      danh_muc_thu_chi_id: mucId ? Number(mucId) : null,
      nguoi_tao_id: nguoiTaoId,
    };
    setBusy(true);
    const r =
      mode === "edit" && editRow
        ? await updateThuChiKhacPhieu({ id: editRow.id, ...payload })
        : await createThuChiKhacPhieu(payload);
    setBusy(false);
    if (r.ok)
      onDone(r.message ?? (mode === "edit" ? "Đã cập nhật phiếu." : "Đã thêm phiếu."), true);
    else onDone(r.error, false);
  }

  const titleMain =
    mode === "edit"
      ? "Sửa phiếu"
      : loai === "thu"
        ? "Thêm phiếu thu"
        : "Thêm phiếu chi";

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
            <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">{titleMain}</h2>
            {mode === "edit" && editRow ? (
              <p className="m-0 mt-1 text-[11px] text-[#888]">Tạo lúc {fmtDateTime(editRow.created_at)}</p>
            ) : null}
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
                  onClick={() => {
                    setLoai(k);
                    setMucId((prev) => {
                      if (!prev) return "";
                      const id = Number(prev);
                      if (!Number.isFinite(id)) return "";
                      const opt = danhMucOptions.find((d) => d.id === id);
                      if (!opt || !danhMucMatchesPhieuLoai(opt.loai, k)) return "";
                      return prev;
                    });
                  }}
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
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">
              Danh mục {loai === "thu" ? "(Thu)" : "(Chi)"}
            </span>
            <select
              value={mucId}
              onChange={(e) => setMucId(e.target.value)}
              className={cn(
                "w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2",
                SELECT_TEXT_CLASS,
              )}
            >
              <option value="">— Không chọn —</option>
              {filteredDanhMuc.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.ten}
                </option>
              ))}
            </select>
            {filteredDanhMuc.length === 0 ? (
              <p className="m-0 mt-1 text-[11px] text-amber-700">
                Chưa có danh mục {loai === "thu" ? "Thu" : "Chi"} — thêm trong «Thêm danh mục» (đúng loại Thu/Chi).
              </p>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Hình thức</span>
            <select
              value={hinhThuc}
              onChange={(e) => setHinhThuc(e.target.value)}
              className={cn(
                "w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2",
                SELECT_TEXT_CLASS,
              )}
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
          <div className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Người tạo phiếu</span>
            <div className="rounded-[10px] border border-[#EAEAEA] bg-[#f5f7f7] px-3 py-2.5 text-[13px] font-semibold text-[#1a1a2e]">
              {mode === "edit" && editRow ? tenNguoiTao(editRow) : loggedInStaffName.trim() || `—`}
            </div>
            <p className="m-0 mt-1.5 text-[11px] leading-snug text-[#888]">
              {mode === "edit"
                ? "Người tạo trên phiếu — không đổi khi sửa."
                : "Theo tài khoản đăng nhập dashboard (nhân sự Vận hành); không chọn tay."}
            </p>
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
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            {mode === "edit" ? "Lưu thay đổi" : "Lưu phiếu"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalThemLoai({ onClose, onDone }: { onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const [ma, setMa] = useState("");
  const [ten, setTen] = useState("");
  const [nhom, setNhom] = useState("");
  const [thuTu, setThuTu] = useState("");
  const [loaiThuChi, setLoaiThuChi] = useState<"Thu" | "Chi">("Chi");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!ma.trim() || !ten.trim() || !nhom.trim()) {
      onDone("Nhập đủ mã, tên và nhóm danh mục.", false);
      return;
    }
    const ord = Number(thuTu.replace(/\s/g, ""));
    setBusy(true);
    const r = await createDanhMucThuChi({
      ma: ma.trim(),
      ten: ten.trim(),
      nhom: nhom.trim(),
      loai: loaiThuChi,
      thu_tu: Number.isFinite(ord) ? ord : 0,
    });
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
        className="w-full max-w-[420px] rounded-2xl border border-[#EAEAEA] bg-white shadow-2xl"
      >
        <div className="border-b border-[#f0f0f0] px-5 py-4">
          <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">Danh mục</p>
          <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">Thêm danh mục (tc_danh_muc_thu_chi)</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Mã *</span>
            <input
              value={ma}
              onChange={(e) => setMa(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="VD: CP_LUONG_GV"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Tên hiển thị *</span>
            <input
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="VD: Lương giảng viên"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Nhóm *</span>
            <input
              value={nhom}
              onChange={(e) => setNhom(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="VD: Chi phí nhân sự"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Thứ tự</span>
            <input
              value={thuTu}
              onChange={(e) => setThuTu(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="0"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Loại (thu/chi)</span>
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
