"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightLeft, Loader2, Plus, Trash2, User, X } from "lucide-react";

import {
  createHoaCuChuyenKho,
  deleteHoaCuChuyenKho,
  loadHoaCuChuyenChiTietAction,
  type AdminHoaCuChuyenChiTietLine,
} from "@/app/admin/dashboard/quan-ly-hoa-cu/actions";
import {
  fetchHoaCuCatalogForBranch,
  getCachedHoaCuCatalog,
} from "@/app/admin/dashboard/quan-ly-hoa-cu/hoa-cu-catalog-cache";
import { ADMIN_MODAL_ROOT_ELEMENT_ID } from "@/lib/admin/constants";
import type { AdminHoaCuChuyenDon, AdminHoaCuSanPham } from "@/lib/data/admin-hoa-cu";
import type { AdminChiNhanhOption } from "@/lib/data/admin-chi-nhanh";
import { cn } from "@/lib/utils";

function fmtDt(iso: string): string {
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

function buildPageHref(basePath: string, page: number, extra?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
    }
  }
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

function HoaCuPager({
  page,
  total,
  pageSize,
  basePath,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#555]">
      <span className="tabular-nums">
        Trang {page}/{totalPages} · {total} bản ghi
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={buildPageHref(basePath, prev)}
          aria-disabled={page <= 1}
          className={cn(
            "rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 font-semibold",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[#f5f5f5]",
          )}
        >
          ← Trước
        </Link>
        <Link
          href={buildPageHref(basePath, next)}
          aria-disabled={page >= totalPages}
          className={cn(
            "rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 font-semibold",
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-[#f5f5f5]",
          )}
        >
          Sau →
        </Link>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  footer,
  maxWidthClassName = "max-w-[min(96vw,720px)]",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  maxWidthClassName?: string;
}) {
  const node = (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-2xl",
          maxWidthClassName,
        )}
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-[#BC8AF9]">{subtitle}</p>
            <h2 className="m-0 text-base font-extrabold text-[#1a1a2e]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#888]">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="border-t border-[#f0f0f0] px-5 py-3">{footer}</div>
      </motion.div>
    </motion.div>
  );
  if (typeof document === "undefined") return null;
  const host = document.getElementById(ADMIN_MODAL_ROOT_ELEMENT_ID) ?? document.body;
  return createPortal(node, host);
}

function ChiTietThumb({ url }: { url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-[#EAEAEA] object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] bg-[#fafafa] text-[10px] text-[#CCC]">
      —
    </div>
  );
}

function ModalChiTietChuyen({ don, onClose }: { don: AdminHoaCuChuyenDon; onClose: () => void }) {
  const [lines, setLines] = useState<AdminHoaCuChuyenChiTietLine[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLines(null);
    setLoadErr(null);
    void loadHoaCuChuyenChiTietAction(don.id).then((r) => {
      if (cancelled) return;
      if (r.ok) setLines(r.lines);
      else setLoadErr(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [don.id]);

  return (
    <ModalShell
      subtitle="Chuyển kho"
      title="Chi tiết phiếu chuyển"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-5 py-2 text-[13px] font-semibold text-[#666]">
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3 rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#555]">
          <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-[#BC8AF9]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="m-0 font-semibold text-[#1a1a2e]">{fmtDt(don.created_at)}</p>
            <p className="m-0">
              {don.chi_nhanh_nguon_ten} → <span className="font-semibold text-[#BC8AF9]">{don.chi_nhanh_dich_ten}</span>
            </p>
            <p className="m-0">
              Người chuyển: <span className="font-medium">{don.nguoi_chuyen_name}</span>
            </p>
          </div>
        </div>
        {lines === null && !loadErr ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#666]">
            <Loader2 className="h-5 w-5 animate-spin text-[#BC8AF9]" aria-hidden />
            Đang tải chi tiết…
          </div>
        ) : loadErr ? (
          <p className="m-0 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{loadErr}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#EAEAEA]">
            <table className="w-full min-w-[480px] border-separate border-spacing-0 text-left text-[13px]">
              <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
                <tr>
                  <th className="border-b border-[#EAEAEA] px-2 py-2">Ảnh</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2">Tên hàng</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right">SL</th>
                </tr>
              </thead>
              <tbody>
                {(lines ?? []).map((row, idx) => (
                  <tr key={`${row.mat_hang_nguon}-${idx}`}>
                    <td className="border-b border-[#f8fafc] px-2 py-2">
                      <ChiTietThumb url={row.thumbnail} />
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 font-medium">{row.ten_hang}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right font-bold tabular-nums text-[#BC8AF9]">{row.so_luong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export function ChuyenTab({
  rows,
  pagination,
  canMutate,
  onListChanged,
}: {
  rows: AdminHoaCuChuyenDon[];
  pagination: { page: number; pageSize: number; total: number; basePath: string };
  canMutate: boolean;
  onListChanged: (msg: string, ok: boolean) => void;
}) {
  const [detailDon, setDetailDon] = useState<AdminHoaCuChuyenDon | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(r: AdminHoaCuChuyenDon) {
    if (!canMutate) {
      onListChanged("Bạn không có quyền xoá phiếu chuyển.", false);
      return;
    }
    if (!window.confirm(`Xoá phiếu chuyển ${fmtDt(r.created_at)}? Tồn kho hai chi nhánh sẽ được điều chỉnh lại.`)) return;
    setDeletingId(r.id);
    const res = await deleteHoaCuChuyenKho(r.id);
    setDeletingId(null);
    if (res.ok) onListChanged(res.message ?? "Đã xoá.", true);
    else onListChanged(res.error, false);
  }

  return (
    <>
      <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
            <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
              <tr>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5">Thời gian</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5">Người chuyển</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5">Từ chi nhánh</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5">Đến chi nhánh</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right">Dòng</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5">Ghi chú</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#888]">
                    Chưa có phiếu chuyển kho.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} onClick={() => setDetailDon(r)} className="cursor-pointer hover:bg-[#fafafa]">
                    <td className="border-b border-[#f8fafc] px-2 py-2 whitespace-nowrap text-[#666]">{fmtDt(r.created_at)}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2">{r.nguoi_chuyen_name}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 font-medium">{r.chi_nhanh_nguon_ten}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 font-medium text-[#BC8AF9]">{r.chi_nhanh_dich_ten}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right tabular-nums">{r.so_mat_hang}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-[#555]">{r.ghi_chu?.trim() || "—"}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      {canMutate ? (
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => void handleDelete(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <HoaCuPager page={pagination.page} total={pagination.total} pageSize={pagination.pageSize} basePath={pagination.basePath} />
      </div>
      <AnimatePresence>
        {detailDon ? <ModalChiTietChuyen key={detailDon.id} don={detailDon} onClose={() => setDetailDon(null)} /> : null}
      </AnimatePresence>
    </>
  );
}

type Line = { hangId: string; qty: string };

export function ModalChuyenHang({
  chiNhanhOptions,
  defaultNguonId,
  defaultStaffId,
  loggedInStaffName,
  onClose,
  onDone,
}: {
  chiNhanhOptions: AdminChiNhanhOption[];
  defaultNguonId: number | null;
  defaultStaffId: number;
  loggedInStaffName: string;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const defaultNguon =
    defaultNguonId != null && defaultNguonId > 0 ? String(defaultNguonId) : chiNhanhOptions[0] ? String(chiNhanhOptions[0].id) : "";
  const altBranch = chiNhanhOptions.find((b) => String(b.id) !== defaultNguon);

  const [nguonId, setNguonId] = useState(defaultNguon);
  const [dichId, setDichId] = useState(altBranch ? String(altBranch.id) : "");
  const [ghiChu, setGhiChu] = useState("");
  const [lines, setLines] = useState<Line[]>([{ hangId: "", qty: "1" }]);
  const initialNguonId = Number(defaultNguon);
  const cachedAtOpen =
    Number.isFinite(initialNguonId) && initialNguonId > 0 ? getCachedHoaCuCatalog(initialNguonId) : null;
  const [sanPham, setSanPham] = useState<AdminHoaCuSanPham[]>(cachedAtOpen ?? []);
  const [catalogLoading, setCatalogLoading] = useState(cachedAtOpen == null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sanPhamCoTon = useMemo(() => sanPham.filter((s) => s.ton_kho > 0), [sanPham]);
  const nguonLabel = chiNhanhOptions.find((b) => String(b.id) === nguonId)?.ten ?? "—";
  const dichLabel = chiNhanhOptions.find((b) => String(b.id) === dichId)?.ten ?? "—";

  useEffect(() => {
    const branchId = Number(nguonId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      setSanPham([]);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    const cached = getCachedHoaCuCatalog(branchId);
    if (cached) {
      setSanPham(cached);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogError(null);
    setCatalogLoading(true);
    void fetchHoaCuCatalogForBranch(branchId).then((r) => {
      if (cancelled) return;
      setCatalogLoading(false);
      if (r.ok) {
        setSanPham(r.data);
        setCatalogError(null);
      } else {
        setSanPham([]);
        setCatalogError(r.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [nguonId]);

  async function save() {
    const src = Number(nguonId);
    const dst = Number(dichId);
    if (!Number.isFinite(src) || src <= 0) {
      onDone("Chọn chi nhánh nguồn.", false);
      return;
    }
    if (!Number.isFinite(dst) || dst <= 0) {
      onDone("Chọn chi nhánh đích.", false);
      return;
    }
    if (src === dst) {
      onDone("Chi nhánh nguồn và đích phải khác nhau.", false);
      return;
    }
    const valid = lines
      .map((l) => ({ mat_hang_nguon: Number(l.hangId), so_luong: Number(l.qty) }))
      .filter((l) => l.mat_hang_nguon > 0 && l.so_luong > 0);
    if (!valid.length) {
      onDone("Thêm ít nhất một mặt hàng.", false);
      return;
    }
    for (const l of valid) {
      const sp = sanPham.find((x) => x.id === l.mat_hang_nguon);
      if (l.so_luong > (sp?.ton_kho ?? 0)) {
        onDone(`«${sp?.ten_hang ?? "#" + l.mat_hang_nguon}» không đủ tồn.`, false);
        return;
      }
    }
    setBusy(true);
    const idempotency_key =
      typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const r = await createHoaCuChuyenKho({
      nguoi_chuyen: defaultStaffId,
      chi_nhanh_nguon: src,
      chi_nhanh_dich: dst,
      ghi_chu: ghiChu.trim() || null,
      lines: valid,
      idempotency_key,
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã lưu.", true);
    else onDone(r.error, false);
  }

  return (
    <ModalShell
      subtitle="Chuyển kho"
      title="Chuyển hàng giữa chi nhánh"
      maxWidthClassName="max-w-[min(96vw,640px)]"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            Lưu phiếu chuyển
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="block text-[10px] font-bold uppercase text-[#AAA]">Người chuyển</span>
          <div className="flex min-h-[42px] items-center gap-2 rounded-[10px] border border-[#EAEAEA] bg-[#f8fafc] px-3 py-2 text-[13px] font-semibold">
            <User size={16} className="text-[#BC8AF9]" aria-hidden />
            {loggedInStaffName.trim() || "—"}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Từ chi nhánh *</span>
            <select
              value={nguonId}
              onChange={(e) => {
                setNguonId(e.target.value);
                setLines([{ hangId: "", qty: "1" }]);
                if (e.target.value === dichId) {
                  const alt = chiNhanhOptions.find((b) => String(b.id) !== e.target.value);
                  if (alt) setDichId(String(alt.id));
                }
              }}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            >
              {chiNhanhOptions.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.ten}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Đến chi nhánh *</span>
            <select
              value={dichId}
              onChange={(e) => setDichId(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            >
              <option value="">— Chọn —</option>
              {chiNhanhOptions
                .filter((b) => String(b.id) !== nguonId)
                .map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.ten}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="m-0 rounded-lg border border-[#EAEAEA] bg-[#fafafa] px-3 py-2 text-[12px] text-[#555]">
          Trừ tồn <span className="font-semibold">{nguonLabel}</span> → cộng tồn{" "}
          <span className="font-semibold text-[#BC8AF9]">{dichLabel}</span>. Mặt hàng chưa có ở chi nhánh đích sẽ được tạo tự động.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Ghi chú</span>
          <input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
          />
        </label>
        {catalogLoading ? (
          <p className="m-0 flex items-center gap-2 text-[13px] text-[#888]">
            <Loader2 className="h-4 w-4 animate-spin text-[#BC8AF9]" aria-hidden />
            Đang tải hàng ở chi nhánh nguồn…
          </p>
        ) : null}
        {catalogError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700" role="alert">
            {catalogError}
          </div>
        ) : null}
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1">
              <span className="mb-1 block text-[9px] font-extrabold uppercase text-[#AAA]">Mặt hàng</span>
              <select
                value={l.hangId}
                onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, hangId: e.target.value } : x)))}
                className="h-10 w-full rounded-[10px] border border-[#EAEAEA] px-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              >
                <option value="">— Chọn —</option>
                {sanPhamCoTon.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.ten_hang} (tồn {s.ton_kho})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[9px] font-extrabold uppercase text-[#AAA]">SL</span>
              <input
                value={l.qty}
                onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                inputMode="numeric"
                className="w-20 rounded-[10px] border border-[#EAEAEA] px-2 py-2 text-center text-[13px]"
              />
            </label>
            <button
              type="button"
              onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-red-100 text-red-600 hover:bg-red-50"
            >
              <X size={18} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines((p) => [...p, { hangId: "", qty: "1" }])}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#BC8AF9] hover:underline"
        >
          <Plus size={16} /> Thêm dòng
        </button>
      </div>
    </ModalShell>
  );
}
