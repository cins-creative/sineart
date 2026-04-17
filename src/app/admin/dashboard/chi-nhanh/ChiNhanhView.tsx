"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import type { AdminChiNhanhRow } from "@/lib/data/admin-chi-nhanh";
import type { BranchFormState } from "@/app/admin/dashboard/chi-nhanh/actions";
import { deleteChiNhanh, saveChiNhanh } from "@/app/admin/dashboard/chi-nhanh/actions";
import { cn } from "@/lib/utils";

export type ChiNhanhListStatus = "all" | "active" | "inactive";

const BRANCH_LIST_PAGE_SIZE = 10;

type Props = {
  rows: AdminChiNhanhRow[];
  loadError: string | null;
  /** Chỉ select được `id, ten` trên `ql_chi_nhanh` — thiếu cột mở rộng */
  usedMinimalSelect: boolean;
  /** Khi có — tab theo URL (`?status=`). */
  listStatus?: ChiNhanhListStatus;
  tabCounts?: { all: number; active: number; inactive: number };
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

/** Dòng phụ dưới tên: ưu tiên ngày tạo; không có thì rút gọn `dia_chi` (map `ql_chi_nhanh.dia_chi`). */
function cardMetaLine(row: Pick<AdminChiNhanhRow, "id" | "created_at" | "dia_chi">): string {
  const idPart = `ID #${row.id}`;
  if (row.created_at) {
    const d = fmtDate(row.created_at);
    if (d !== "—") return `${idPart} · ${d}`;
  }
  const addr = row.dia_chi?.trim();
  if (addr) {
    return `${idPart} · ${addr.length > 52 ? `${addr.slice(0, 52)}…` : addr}`;
  }
  return `${idPart} · —`;
}

function modalSubline(row: AdminChiNhanhRow): string {
  if (row.created_at && fmtDate(row.created_at) !== "—") {
    return `ID #${row.id} · Tạo ${fmtDate(row.created_at)}`;
  }
  const addr = row.dia_chi?.trim();
  if (addr) {
    return `ID #${row.id} · ${addr.length > 64 ? `${addr.slice(0, 64)}…` : addr}`;
  }
  return `ID #${row.id} · —`;
}

function BranchModal({
  row,
  isNew,
  onClose,
}: {
  row: AdminChiNhanhRow | null;
  isNew: boolean;
  onClose: () => void;
}) {
  const { canDelete } = useAdminDashboardAbilities();
  const router = useRouter();
  const [form, setForm] = useState({
    ten: row?.ten ?? "",
    dia_chi: row?.dia_chi ?? "",
    sdt: row?.sdt ?? "",
    is_active: row?.is_active ?? true,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  const [saveState, saveAction, savePending] = useActionState(saveChiNhanh, null as BranchFormState | null);

  useEffect(() => {
    setForm({
      ten: row?.ten ?? "",
      dia_chi: row?.dia_chi ?? "",
      sdt: row?.sdt ?? "",
      is_active: row?.is_active ?? true,
    });
    setConfirmDelete(false);
    setModalError("");
  }, [row, isNew]);

  useEffect(() => {
    if (saveState?.ok) {
      router.refresh();
      onClose();
    } else if (saveState && !saveState.ok) {
      setModalError(saveState.error);
    }
  }, [saveState, onClose, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 420 }}
        className="w-full max-w-[480px] overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 border-b border-[#FFADD2] bg-[#FFF5FB] px-7 pb-5 pt-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#F8A568] to-[#EE5CA2] shadow-[0_4px_12px_rgba(238,92,162,0.25)]">
            <Building2 className="text-white" size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold tracking-tight text-[#323232]">
              {isNew ? "Thêm chi nhánh" : row?.ten}
            </div>
            {!isNew && row ? (
              <div className="mt-0.5 text-xs text-[#AAAAAA]">{modalSubline(row)}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-[#F5F7F7] text-[#888] hover:bg-[#eaeaea]"
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>

        <form
          key={isNew ? "new" : `edit-${row?.id ?? 0}`}
          action={saveAction}
          className="flex flex-col gap-[18px] px-7 py-6"
        >
          {!isNew && row ? <input type="hidden" name="id" value={row.id} /> : null}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-[#888]" htmlFor="m-ten">
              Tên chi nhánh *
            </label>
            <input
              id="m-ten"
              name="ten"
              required
              maxLength={500}
              defaultValue={form.ten}
              placeholder="VD: Chi nhánh Q1, Chi nhánh Online..."
              className="w-full rounded-xl border-[1.5px] border-[#EAEAEA] bg-white px-3.5 py-2.5 text-sm text-[#323232] outline-none transition focus:border-[#EE5CA2]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-[#888]" htmlFor="m-dc">
              Địa chỉ
            </label>
            <input
              id="m-dc"
              name="dia_chi"
              maxLength={500}
              defaultValue={form.dia_chi}
              placeholder="Số nhà, đường, quận..."
              className="w-full rounded-xl border-[1.5px] border-[#EAEAEA] bg-white px-3.5 py-2.5 text-sm text-[#323232] outline-none transition focus:border-[#EE5CA2]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-[#888]" htmlFor="m-sdt">
              Số điện thoại
            </label>
            <input
              id="m-sdt"
              name="sdt"
              type="tel"
              maxLength={40}
              defaultValue={form.sdt}
              placeholder="0909 xxx xxx"
              className="w-full rounded-xl border-[1.5px] border-[#EAEAEA] bg-white px-3.5 py-2.5 text-sm text-[#323232] outline-none transition focus:border-[#EE5CA2]"
            />
          </div>

          <div className="rounded-[14px] border-[1.5px] border-[#EAEAEA] bg-[#F9FAFB] px-4 py-3.5">
            <label htmlFor="m-is-active" className="text-[13px] font-semibold text-[#323232]">
              Trạng thái hoạt động
            </label>
            <div className="mt-0.5 text-[11px] text-[#AAAAAA]">
              Chi nhánh ngừng hoạt động sẽ không hiển thị khi chọn
            </div>
            <select
              id="m-is-active"
              name="is_active"
              defaultValue={form.is_active ? "true" : "false"}
              className="mt-2.5 w-full rounded-xl border-[1.5px] border-[#EAEAEA] bg-white px-3.5 py-2.5 text-sm text-[#323232] outline-none transition focus:border-[#EE5CA2]"
            >
              <option value="true">Đang hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
          </div>

          {!isNew && row && (row.so_nhan_su > 0 || row.so_lop_hoc > 0) ? (
            <div className="flex gap-2.5">
              {row.so_nhan_su > 0 ? (
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#EEF3FF] px-3.5 py-2.5">
                  <Users size={14} className="text-[#3B5BDB]" />
                  <span className="text-xs font-semibold text-[#3B5BDB]">{row.so_nhan_su} nhân sự</span>
                </div>
              ) : null}
              {row.so_lop_hoc > 0 ? (
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#FFF7E6] px-3.5 py-2.5">
                  <Building2 size={14} className="text-[#B76E00]" />
                  <span className="text-xs font-semibold text-[#B76E00]">{row.so_lop_hoc} lớp học</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {modalError || (saveState && !saveState.ok) ? (
            <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-[#FFCDD2] bg-[#FFF0F3] px-3.5 py-2.5 text-sm text-[#C0244E]">
              <AlertTriangle size={14} />
              {modalError || (saveState && !saveState.ok ? saveState.error : "")}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {!isNew && row && canDelete ? (
              <>
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={async () => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    setDeleteBusy(true);
                    setModalError("");
                    const res = await deleteChiNhanh(row.id);
                    setDeleteBusy(false);
                    if (!res.ok) {
                      setModalError(res.error);
                      setConfirmDelete(false);
                      return;
                    }
                    router.refresh();
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold ${
                    confirmDelete
                      ? "border-[1.5px] border-[#C0244E] bg-[#C0244E] text-white"
                      : "border-[1.5px] border-[#FFCDD2] bg-[#FFF0F3] text-[#C0244E]"
                  }`}
                >
                  {deleteBusy ? (
                    "Đang xóa..."
                  ) : confirmDelete ? (
                    <>
                      <AlertTriangle size={13} /> Xác nhận xóa
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} /> Xóa
                    </>
                  )}
                </button>
                {confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl border-[1.5px] border-[#EAEAEA] bg-[#F5F7F7] px-4 py-2.5 text-[13px] font-semibold text-[#888]"
                  >
                    Hủy
                  </button>
                ) : null}
              </>
            ) : null}
            {!confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#EAEAEA] bg-[#F5F7F7] px-4 py-2.5 text-[13px] font-semibold text-[#888]"
                >
                  <X size={13} /> Đóng
                </button>
                <button
                  type="submit"
                  disabled={savePending}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {savePending ? (
                    "Đang lưu..."
                  ) : isNew ? (
                    <>
                      <Plus size={14} /> Thêm
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Lưu
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function BranchCard({ cn, onEdit }: { cn: AdminChiNhanhRow; onEdit: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
      onClick={onEdit}
      className={`relative cursor-pointer overflow-hidden rounded-[20px] border-[1.5px] bg-white py-5 pl-[26px] pr-[22px] transition-shadow ${
        cn.is_active ? "border-[#FFADD2]" : "border-[#EAEAEA]"
      }`}
    >
      <div
        className={`absolute bottom-0 left-0 top-0 w-1 rounded-l-[20px] ${
          cn.is_active ? "bg-gradient-to-b from-[#F8A568] to-[#EE5CA2]" : "bg-[#EAEAEA]"
        }`}
      />
      <div className="pl-2">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                cn.is_active ? "bg-[#FFF0F6]" : "bg-[#F5F7F7]"
              }`}
            >
              <Building2 size={18} className={cn.is_active ? "text-[#EE5CA2]" : "text-[#CCCCCC]"} />
            </div>
            <div className="min-w-0">
              <div
                className={`truncate text-[15px] font-bold tracking-tight ${
                  cn.is_active ? "text-[#323232]" : "text-[#AAAAAA]"
                }`}
              >
                {cn.ten}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-[#AAAAAA]">{cardMetaLine(cn)}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {cn.dia_chi ? (
            <div className="flex items-center gap-1.5 text-xs text-[#666]">
              <MapPin size={11} className="shrink-0 text-[#AAAAAA]" />
              <span className="truncate">{cn.dia_chi}</span>
            </div>
          ) : null}
          {cn.sdt ? (
            <div className="flex items-center gap-1.5 text-xs text-[#666]">
              <Phone size={11} className="shrink-0 text-[#AAAAAA]" />
              <span>{cn.sdt}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F5F7F7] px-2.5 py-1">
            <Users size={11} className="text-[#888]" />
            <span className="text-xs font-semibold text-[#888]">{cn.so_nhan_su} nhân sự</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F5F7F7] px-2.5 py-1">
            <Building2 size={11} className="text-[#888]" />
            <span className="text-xs font-semibold text-[#888]">{cn.so_lop_hoc} lớp</span>
          </div>
          <div
            className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 ${
              cn.is_active ? "bg-[#FFF0F6]" : "bg-[#F5F7F7]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${cn.is_active ? "bg-[#EE5CA2]" : "bg-[#CCCCCC]"}`}
            />
            <span
              className={`text-[11px] font-bold ${cn.is_active ? "text-[#EE5CA2]" : "text-[#AAAAAA]"}`}
            >
              {cn.is_active ? "Đang hoạt động" : "Ngừng hoạt động"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function branchMatchesQuery(row: AdminChiNhanhRow, qLower: string): boolean {
  if (!qLower) return true;
  return (
    row.ten.toLowerCase().includes(qLower) ||
    String(row.id).includes(qLower) ||
    (row.dia_chi?.toLowerCase().includes(qLower) ?? false) ||
    (row.sdt?.toLowerCase().includes(qLower) ?? false)
  );
}

export default function ChiNhanhView({
  rows,
  loadError,
  usedMinimalSelect,
  listStatus,
  tabCounts,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(960);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchListPage, setBranchListPage] = useState(1);
  const [filterActive, setFilterActive] = useState<ChiNhanhListStatus>("all");
  const [bannerError, setBannerError] = useState(loadError ?? "");
  const [selected, setSelected] = useState<AdminChiNhanhRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = w < 580;

  const urlMode = tabCounts != null && listStatus != null;

  const tabHref = (status: ChiNhanhListStatus) => {
    const sp = new URLSearchParams();
    if (status !== "all") sp.set("status", status);
    const qs = sp.toString();
    return qs ? `/admin/dashboard/chi-nhanh?${qs}` : "/admin/dashboard/chi-nhanh";
  };

  useEffect(() => {
    setBannerError(loadError ?? "");
  }, [loadError]);

  const activeCountRows = useMemo(() => rows.filter((c) => c.is_active).length, [rows]);
  const inactiveCountRows = useMemo(() => rows.filter((c) => !c.is_active).length, [rows]);
  const activeCount = tabCounts?.active ?? activeCountRows;
  const inactiveCount = tabCounts?.inactive ?? inactiveCountRows;
  const totalAll = tabCounts?.all ?? rows.length;

  const filtered = useMemo(() => {
    let base: AdminChiNhanhRow[];
    if (urlMode) {
      base = [...rows].sort((a, b) => a.id - b.id);
    } else {
      const f = rows.filter(
        (c) =>
          filterActive === "all" || (filterActive === "active" ? c.is_active : !c.is_active),
      );
      base = [...f].sort((a, b) => a.id - b.id);
    }
    const q = branchSearch.toLowerCase().trim();
    return q ? base.filter((r) => branchMatchesQuery(r, q)) : base;
  }, [rows, filterActive, urlMode, branchSearch]);

  useEffect(() => {
    setBranchListPage(1);
  }, [branchSearch, listStatus, filterActive]);

  const branchTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / BRANCH_LIST_PAGE_SIZE)),
    [filtered.length],
  );

  useEffect(() => {
    setBranchListPage((p) => Math.min(Math.max(1, p), branchTotalPages));
  }, [branchTotalPages]);

  const pagedFiltered = useMemo(() => {
    const start = (branchListPage - 1) * BRANCH_LIST_PAGE_SIZE;
    return filtered.slice(start, start + BRANCH_LIST_PAGE_SIZE);
  }, [filtered, branchListPage]);

  return (
    <div
      ref={containerRef}
      className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <Building2 className="text-white" size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Quản lý chi nhánh</div>
            <div className="text-xs text-[#AAAAAA]">
              {totalAll} chi nhánh · {activeCount} đang hoạt động
              {inactiveCount > 0 ? ` · ${inactiveCount} tạm dừng` : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setIsNew(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={15} /> Thêm chi nhánh
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
          <div className="mx-auto flex min-h-[min(64vh,560px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="shrink-0 space-y-2 border-b border-[#EAEAEA] bg-white px-6 py-3">
              {usedMinimalSelect ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  Bảng <code className="rounded bg-amber-100/80 px-1">ql_chi_nhanh</code> hiện chỉ đủ cột{" "}
                  <code className="rounded bg-amber-100/80 px-1">id, ten</code>. Thêm cột{" "}
                  <code className="rounded bg-amber-100/80 px-1">dia_chi, sdt, is_active, created_at</code> trên Supabase
                  để form đầy đủ.
                </div>
              ) : null}

              {bannerError ? (
                <div className="flex items-center gap-2 rounded-lg border border-[#FFCDD2] bg-[#FFF0F3] px-3 py-2 text-[12px] text-[#C0244E]">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span className="min-w-0 flex-1">{bannerError}</span>
                  <button
                    type="button"
                    className="shrink-0 border-0 bg-transparent text-[#C0244E]"
                    onClick={() => setBannerError("")}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                <input
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Tìm tên chi nhánh, địa chỉ, SĐT…"
                  className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-white pl-9 pr-9 text-xs text-[#1a1a2e] outline-none focus:border-[#BC8AF9]"
                />
                {branchSearch ? (
                  <button
                    type="button"
                    aria-label="Xóa tìm"
                    onClick={() => setBranchSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { key: "all" as const, label: "Tất cả" },
                    { key: "active" as const, label: "Hoạt động" },
                    { key: "inactive" as const, label: "Tạm dừng" },
                  ] as const
                ).map((tab) =>
                  urlMode ? (
                    <Link
                      key={tab.key}
                      href={tabHref(tab.key)}
                      scroll={false}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        listStatus === tab.key
                          ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                          : "border-[#EAEAEA] text-black/50 hover:border-black/15",
                      )}
                    >
                      {tab.label}
                    </Link>
                  ) : (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterActive(tab.key)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        filterActive === tab.key
                          ? "border-[#BC8AF9] bg-[#BC8AF9]/15 text-[#BC8AF9]"
                          : "border-[#EAEAEA] text-black/50",
                      )}
                    >
                      {tab.label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 pt-12 text-center">
                  <span className="text-4xl" aria-hidden>
                    🏢
                  </span>
                  <p className="m-0 text-sm text-[#888]">
                    {branchSearch
                      ? "Không tìm thấy chi nhánh phù hợp"
                      : "Chưa có chi nhánh nào. Nhấn «Thêm chi nhánh»."}
                  </p>
                  {!branchSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setIsNew(true);
                      }}
                      className="mt-1 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2.5 text-[13px] font-semibold text-white"
                    >
                      <Plus size={14} /> Thêm chi nhánh đầu tiên
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <motion.div
                    layout
                    className={cn(
                      "grid gap-3.5 pb-2 pt-1",
                      isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]",
                    )}
                  >
                    <AnimatePresence>
                      {pagedFiltered.map((cn) => (
                        <BranchCard
                          key={cn.id}
                          cn={cn}
                          onEdit={() => {
                            setSelected(cn);
                            setIsNew(false);
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                  {filtered.length > BRANCH_LIST_PAGE_SIZE ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-slate-50/90 px-4 py-2 text-[11px] text-slate-600">
                      <span className="tabular-nums">
                        {(branchListPage - 1) * BRANCH_LIST_PAGE_SIZE + 1}–
                        {Math.min(branchListPage * BRANCH_LIST_PAGE_SIZE, filtered.length)} / {filtered.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={branchListPage <= 1}
                          onClick={() => setBranchListPage((p) => Math.max(1, p - 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Trang trước"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="min-w-[4.75rem] text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Trang <span className="text-slate-800">{branchListPage}</span> / {branchTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={branchListPage >= branchTotalPages}
                          onClick={() => setBranchListPage((p) => Math.min(branchTotalPages, p + 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAEA] bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Trang sau"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(isNew || selected) && (
          <BranchModal
            row={isNew ? null : selected}
            isNew={isNew}
            onClose={() => {
              setSelected(null);
              setIsNew(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
