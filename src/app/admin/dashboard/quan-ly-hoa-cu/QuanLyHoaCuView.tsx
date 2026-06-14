"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChuyenTab, ModalChuyenHang } from "@/app/admin/dashboard/quan-ly-hoa-cu/HoaCuChuyenUi";
import {
  fetchHoaCuCatalogForBranch,
  getCachedHoaCuCatalog,
  invalidateHoaCuCatalogCache,
  prefetchHoaCuCatalog,
} from "@/app/admin/dashboard/quan-ly-hoa-cu/hoa-cu-catalog-cache";
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  ClipboardList,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import {
  createHoaCuDonBan,
  createHoaCuDonNhap,
  createHoaCuSanPham,
  deleteHoaCuDonBan,
  deleteHoaCuDonNhap,
  deleteHoaCuSanPham,
  loadHoaCuDonBanChiTietAction,
  loadHoaCuDonNhapChiTietAction,
  updateHoaCuDonBanMeta,
  updateHoaCuDonNhapMeta,
  updateHoaCuSanPham,
} from "@/app/admin/dashboard/quan-ly-hoa-cu/actions";
import { ADMIN_MODAL_ROOT_ELEMENT_ID } from "@/lib/admin/constants";
import {
  HOA_CU_BAN_PATH,
  HOA_CU_CHUYEN_PATH,
  HOA_CU_KHO_PATH,
  HOA_CU_NHAP_PATH,
  type AdminHoaCuBanDon,
  type AdminHoaCuChuyenDon,
  type AdminHoaCuHvOpt,
  type AdminHoaCuNhapDon,
  type AdminHoaCuSanPham,
  type AdminHoaCuStaffOpt,
} from "@/lib/data/admin-hoa-cu";
import type { AdminChiNhanhOption } from "@/lib/data/admin-chi-nhanh";
import type { AdminHoaCuBanChiTietLine, AdminHoaCuNhapChiTietLine } from "@/app/admin/dashboard/quan-ly-hoa-cu/actions";
import { cn } from "@/lib/utils";

const KHACH_PICKER_MAX = 10;
const KHACH_PICKER_PANEL_MIN_PX = 420;

const LOAI_SP = ["Bút", "Màu", "Tẩy", "Giấy", "Bảng vẽ", "Phụ kiện"] as const;
const HINH_THUC = ["Tiền mặt", "Chuyển khoản"] as const;

const LOAI_BADGE: Record<string, { bg: string; text: string }> = {
  Bút: { bg: "#ede9fe", text: "#7c3aed" },
  Màu: { bg: "#fce7f3", text: "#be185d" },
  Tẩy: { bg: "#fef9c3", text: "#ca8a04" },
  Giấy: { bg: "#dcfce7", text: "#16a34a" },
  "Bảng vẽ": { bg: "#dbeafe", text: "#2563eb" },
  "Phụ kiện": { bg: "#f3f4f6", text: "#374151" },
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n))) + " ₫";
}

const KHO_SEARCH_DEBOUNCE_MS = 320;

function KhoFilters({
  searchQ,
  chiNhanhId,
  chiNhanhOptions,
}: {
  searchQ: string;
  chiNhanhId: number;
  chiNhanhOptions: AdminChiNhanhOption[];
}) {
  const router = useRouter();
  const [qInput, setQInput] = useState(searchQ);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyToUrl = useCallback(
    (rawQ: string, branchId: number) => {
      const p = new URLSearchParams();
      const t = rawQ.trim();
      if (t) p.set("q", t);
      p.set("chi_nhanh", String(branchId));
      p.set("page", "1");
      router.replace(`${HOA_CU_KHO_PATH}?${p.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (qInput.trim() === searchQ.trim()) return;
    if (debounceTimerRef.current != null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      applyToUrl(qInput, chiNhanhId);
    }, KHO_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current != null) clearTimeout(debounceTimerRef.current);
    };
  }, [qInput, searchQ, chiNhanhId, applyToUrl]);

  function flushSearchNow() {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    applyToUrl(qInput, chiNhanhId);
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:flex-1 md:justify-end">
      <label className="flex min-w-[140px] shrink-0 items-center gap-2">
        <span className="sr-only">Chi nhánh</span>
        <select
          value={String(chiNhanhId)}
          onChange={(e) => applyToUrl(qInput, Number(e.target.value))}
          className="h-10 w-full min-w-[140px] rounded-[10px] border border-[#EAEAEA] bg-white px-2.5 text-[13px] outline-none focus:border-[#BC8AF9] md:max-w-[200px]"
          aria-label="Chi nhánh kho"
        >
          {chiNhanhOptions.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.ten}
            </option>
          ))}
        </select>
      </label>
      <div className="relative flex min-w-0 flex-1 sm:min-w-[200px] md:max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              flushSearchNow();
            }
          }}
          placeholder="Tìm tên hàng, loại…"
          aria-label="Tìm trong kho chi nhánh"
          className="h-10 w-full min-w-0 rounded-[10px] border border-[#EAEAEA] bg-[#F5F7F7] py-0 pl-10 pr-3 text-[13px] outline-none focus:border-[#BC8AF9] md:bg-white"
        />
      </div>
    </div>
  );
}

function DonChiNhanhFilter({
  basePath,
  chiNhanhId,
  chiNhanhOptions,
}: {
  basePath: string;
  chiNhanhId: number;
  chiNhanhOptions: AdminChiNhanhOption[];
}) {
  const router = useRouter();

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:flex-1 md:justify-end">
      <label className="flex min-w-[140px] shrink-0 items-center gap-2">
        <span className="sr-only">Chi nhánh</span>
        <select
          value={String(chiNhanhId)}
          onChange={(e) => {
            const p = new URLSearchParams();
            p.set("chi_nhanh", e.target.value);
            p.set("page", "1");
            router.replace(`${basePath}?${p.toString()}`, { scroll: false });
          }}
          className="h-10 w-full min-w-[140px] rounded-[10px] border border-[#EAEAEA] bg-white px-2.5 text-[13px] outline-none focus:border-[#BC8AF9] md:max-w-[200px]"
          aria-label="Chi nhánh"
        >
          {chiNhanhOptions.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.ten}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

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

function HoaCuChiTietThumb({ url }: { url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg border border-[#EAEAEA] object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] bg-[#fafafa] text-[10px] text-[#CCC]"
      aria-hidden
    >
      —
    </div>
  );
}

type Props = {
  defaultStaffId: number;
  loggedInStaffName: string;
  staffOptions: AdminHoaCuStaffOpt[];
  studentOptions: AdminHoaCuHvOpt[];
  chiNhanhOptions: AdminChiNhanhOption[];
  /** null = chỉ tải full danh mục khi mở modal nhập/bán (trang kho). */
  sanPhamCatalog: AdminHoaCuSanPham[] | null;
  activeSection: "kho" | "nhap" | "ban" | "chuyen";
  khoPage?: {
    rows: AdminHoaCuSanPham[];
    page: number;
    pageSize: number;
    total: number;
    searchQ: string;
    chiNhanhId: number;
    chiNhanhTen: string;
    inventoryTotal: number;
    inventoryHetHang: number;
    inventoryTonSum: number;
  };
  nhapPage?: {
    rows: AdminHoaCuNhapDon[];
    page: number;
    pageSize: number;
    total: number;
    chiNhanhId: number;
    chiNhanhTen: string;
  };
  banPage?: {
    rows: AdminHoaCuBanDon[];
    page: number;
    pageSize: number;
    total: number;
    chiNhanhId: number;
    chiNhanhTen: string;
  };
  chuyenPage?: { rows: AdminHoaCuChuyenDon[]; page: number; pageSize: number; total: number };
};

export default function QuanLyHoaCuView({
  defaultStaffId,
  loggedInStaffName,
  studentOptions,
  chiNhanhOptions,
  sanPhamCatalog: initialCatalog,
  activeSection,
  khoPage,
  nhapPage,
  banPage,
  chuyenPage,
}: Props) {
  const router = useRouter();
  const { canDelete: canMutateBanDon } = useAdminDashboardAbilities();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [modal, setModal] = useState<"sp" | "nhap" | "ban" | "chuyen" | null>(null);
  /** `null` = thêm mới; có giá trị = sửa mặt hàng đó. */
  const [sanPhamDraft, setSanPhamDraft] = useState<AdminHoaCuSanPham | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2800);
  };

  const activeBranchId =
    khoPage?.chiNhanhId ?? nhapPage?.chiNhanhId ?? banPage?.chiNhanhId ?? chiNhanhOptions[0]?.id ?? null;

  useEffect(() => {
    prefetchHoaCuCatalog(activeBranchId);
  }, [activeBranchId]);

  const inventoryTotal = khoPage?.inventoryTotal ?? 0;
  const hetHang = khoPage?.inventoryHetHang ?? 0;
  const inventoryTonSum = khoPage?.inventoryTonSum ?? 0;

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #BC8AF9, #ED5C9D)" }}
          >
            <Package size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "#BC8AF9" }}>
              Kho
            </p>
            <h1 className="m-0 text-[17px] font-bold tracking-tight">Quản lý họa cụ</h1>
            <p className="m-0 mt-0.5 text-xs text-[#AAAAAA]">
              Tổng{" "}
              <span className="font-semibold tabular-nums text-[#888]">
                {new Intl.NumberFormat("vi-VN").format(inventoryTonSum)}
              </span>{" "}
              đơn vị tồn · {inventoryTotal} mặt hàng · {hetHang} hết tồn
              {(khoPage?.chiNhanhTen ?? nhapPage?.chiNhanhTen ?? banPage?.chiNhanhTen) ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[#888]">
                    {khoPage?.chiNhanhTen ?? nhapPage?.chiNhanhTen ?? banPage?.chiNhanhTen}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[13px] font-semibold text-[#666]"
          >
            <RefreshCw size={15} /> Tải lại
          </button>
          <button
            type="button"
            onMouseEnter={() => prefetchHoaCuCatalog(activeBranchId)}
            onFocus={() => prefetchHoaCuCatalog(activeBranchId)}
            onClick={() => setModal("nhap")}
            className="rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            <Truck className="mb-0.5 mr-1 inline" size={15} />
            Nhập hàng
          </button>
          <button
            type="button"
            onMouseEnter={() => prefetchHoaCuCatalog(activeBranchId)}
            onFocus={() => prefetchHoaCuCatalog(activeBranchId)}
            onClick={() => setModal("ban")}
            className="rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            <ShoppingCart className="mb-0.5 mr-1 inline" size={15} />
            Bán hàng
          </button>
          <button
            type="button"
            onMouseEnter={() => prefetchHoaCuCatalog(activeBranchId)}
            onFocus={() => prefetchHoaCuCatalog(activeBranchId)}
            onClick={() => setModal("chuyen")}
            className="rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            <ArrowRightLeft className="mb-0.5 mr-1 inline" size={15} />
            Chuyển kho
          </button>
          <button
            type="button"
            onClick={() => {
              setSanPhamDraft(null);
              setModal("sp");
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-[18px] py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus size={16} strokeWidth={2.5} /> Thêm mặt hàng
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] bg-white px-4 py-2 md:px-6">
        <div className="flex min-w-0 flex-wrap gap-1">
          {(
            [
              {
                id: "kho" as const,
                label: "Kho chi nhánh",
                icon: Package,
                href: `${HOA_CU_KHO_PATH}?chi_nhanh=${activeBranchId ?? chiNhanhOptions[0]?.id ?? ""}`,
              },
              { id: "chuyen" as const, label: "Chuyển kho", icon: ArrowRightLeft, href: HOA_CU_CHUYEN_PATH },
              {
                id: "nhap" as const,
                label: "Đơn nhập",
                icon: Truck,
                href: `${HOA_CU_NHAP_PATH}?chi_nhanh=${activeBranchId ?? chiNhanhOptions[0]?.id ?? ""}`,
              },
              {
                id: "ban" as const,
                label: "Đơn bán",
                icon: ShoppingCart,
                href: `${HOA_CU_BAN_PATH}?chi_nhanh=${activeBranchId ?? chiNhanhOptions[0]?.id ?? ""}`,
              },
            ] as const
          ).map(({ id, label, icon: Icon, href }) => (
            <Link
              key={id}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2.5 text-[13px] font-semibold transition",
                activeSection === id
                  ? "border-[#EAEAEA] bg-[#F5F7F7] text-[#1a1a2e]"
                  : "border-transparent text-[#888] hover:bg-black/[0.02]"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
        {activeSection === "kho" && khoPage ? (
          <KhoFilters
            key={`${khoPage.searchQ}-${khoPage.chiNhanhId}`}
            searchQ={khoPage.searchQ}
            chiNhanhId={khoPage.chiNhanhId}
            chiNhanhOptions={chiNhanhOptions}
          />
        ) : activeSection === "nhap" && nhapPage ? (
          <DonChiNhanhFilter
            key={`nhap-${nhapPage.chiNhanhId}`}
            basePath={HOA_CU_NHAP_PATH}
            chiNhanhId={nhapPage.chiNhanhId}
            chiNhanhOptions={chiNhanhOptions}
          />
        ) : activeSection === "ban" && banPage ? (
          <DonChiNhanhFilter
            key={`ban-${banPage.chiNhanhId}`}
            basePath={HOA_CU_BAN_PATH}
            chiNhanhId={banPage.chiNhanhId}
            chiNhanhOptions={chiNhanhOptions}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
        {activeSection === "kho" && khoPage ? (
          <KhoTab
            rows={khoPage.rows}
            pagination={{
              page: khoPage.page,
              total: khoPage.total,
              pageSize: khoPage.pageSize,
              basePath: HOA_CU_KHO_PATH,
              searchQ: khoPage.searchQ,
              chiNhanhId: khoPage.chiNhanhId,
            }}
            onEdit={(r) => {
              setSanPhamDraft(r);
              setModal("sp");
            }}
            onInventoryChanged={(msg, ok) => {
              notify(msg, ok);
              if (ok) router.refresh();
            }}
          />
        ) : activeSection === "nhap" && nhapPage ? (
          <NhapTab
            rows={nhapPage.rows}
            pagination={{
              page: nhapPage.page,
              pageSize: nhapPage.pageSize,
              total: nhapPage.total,
              basePath: HOA_CU_NHAP_PATH,
              chiNhanhId: nhapPage.chiNhanhId,
            }}
            onListChanged={(msg, ok) => {
              notify(msg, ok);
              if (ok) router.refresh();
            }}
          />
        ) : activeSection === "ban" && banPage ? (
          <BanTab
            rows={banPage.rows}
            pagination={{
              page: banPage.page,
              pageSize: banPage.pageSize,
              total: banPage.total,
              basePath: HOA_CU_BAN_PATH,
              chiNhanhId: banPage.chiNhanhId,
            }}
            students={studentOptions}
            canMutate={canMutateBanDon}
            onListChanged={(msg, ok) => {
              notify(msg, ok);
              if (ok) router.refresh();
            }}
          />
        ) : activeSection === "chuyen" && chuyenPage ? (
          <ChuyenTab
            rows={chuyenPage.rows}
            pagination={{ ...chuyenPage, basePath: HOA_CU_CHUYEN_PATH }}
            canMutate={canMutateBanDon}
            onListChanged={(msg, ok) => {
              notify(msg, ok);
              if (ok) router.refresh();
            }}
          />
        ) : null}
      </div>

      <AnimatePresence>
        {modal === "sp" ? (
          <ModalThemHang
            key={sanPhamDraft ? `sp-${sanPhamDraft.id}` : "sp-new"}
            initial={sanPhamDraft}
            chiNhanhOptions={chiNhanhOptions}
            defaultChiNhanhId={activeBranchId}
            onClose={() => {
              setSanPhamDraft(null);
              setModal(null);
            }}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                invalidateHoaCuCatalogCache(activeBranchId ?? undefined);
                setSanPhamDraft(null);
                setModal(null);
                router.refresh();
              }
            }}
          />
        ) : null}
        {modal === "nhap" ? (
          <ModalNhapHang
            key="nhap"
            chiNhanhOptions={chiNhanhOptions}
            defaultChiNhanhId={activeBranchId}
            initialCatalog={initialCatalog}
            defaultStaffId={defaultStaffId}
            loggedInStaffName={loggedInStaffName}
            onClose={() => setModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                invalidateHoaCuCatalogCache(activeBranchId ?? undefined);
                setModal(null);
                router.refresh();
              }
            }}
          />
        ) : null}
        {modal === "ban" ? (
          <ModalBanHang
            key="ban"
            chiNhanhOptions={chiNhanhOptions}
            defaultChiNhanhId={activeBranchId}
            initialCatalog={initialCatalog}
            students={studentOptions}
            defaultStaffId={defaultStaffId}
            loggedInStaffName={loggedInStaffName}
            onClose={() => setModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                invalidateHoaCuCatalogCache(activeBranchId ?? undefined);
                setModal(null);
                router.refresh();
              }
            }}
          />
        ) : null}
        {modal === "chuyen" ? (
          <ModalChuyenHang
            key="chuyen"
            chiNhanhOptions={chiNhanhOptions}
            defaultNguonId={activeBranchId}
            defaultStaffId={defaultStaffId}
            loggedInStaffName={loggedInStaffName}
            onClose={() => setModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                invalidateHoaCuCatalogCache();
                setModal(null);
                router.refresh();
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
  extraQuery,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  extraQuery?: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const extra = extraQuery ?? {};
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#555]">
      <span className="tabular-nums">
        Trang {page}/{totalPages} · {total} bản ghi
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={buildPageHref(basePath, prev, extra)}
          aria-disabled={page <= 1}
          className={cn(
            "rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 font-semibold",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[#f5f5f5]",
          )}
        >
          ← Trước
        </Link>
        <Link
          href={buildPageHref(basePath, next, extra)}
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

function KhoTab({
  rows,
  pagination,
  onEdit,
  onInventoryChanged,
}: {
  rows: AdminHoaCuSanPham[];
  pagination: {
    page: number;
    total: number;
    pageSize: number;
    basePath: string;
    searchQ: string;
    chiNhanhId: number;
  };
  onEdit: (r: AdminHoaCuSanPham) => void;
  onInventoryChanged: (msg: string, ok: boolean) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(r: AdminHoaCuSanPham) {
    if (!window.confirm(`Xoá «${r.ten_hang}»? Thao tác không hoàn tác.`)) return;
    setDeletingId(r.id);
    const res = await deleteHoaCuSanPham(r.id);
    setDeletingId(null);
    if (res.ok) onInventoryChanged(res.message ?? "Đã xoá.", true);
    else onInventoryChanged(res.error, false);
  }

  const pageExtra: Record<string, string> = { chi_nhanh: String(pagination.chiNhanhId) };
  if (pagination.searchQ.trim()) pageExtra.q = pagination.searchQ.trim();

  return (
    <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[800px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
            <tr>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Ảnh</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Tên hàng</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Loại</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Giá nhập</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Giá bán</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Tồn kho</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="border-b border-[#f8fafc] px-4 py-10 text-center text-sm text-[#888]">
                  Không có mặt hàng.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const loai = r.loai_san_pham ?? "";
                const badge = loai && LOAI_BADGE[loai] ? LOAI_BADGE[loai] : { bg: "#f3f4f6", text: "#6b7280" };
                const busy = deletingId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-[#fafafa]">
                    <td className="border-b border-[#f8fafc] px-2 py-2 align-middle sm:px-3">
                      {r.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6] text-lg">📦</div>
                      )}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 align-middle font-medium text-[#1a1a2e] sm:px-3">
                      <span className="line-clamp-2 break-words">{r.ten_hang}</span>
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 align-middle sm:px-3">
                      {loai ? (
                        <span
                          className="inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: badge.bg, color: badge.text }}
                          title={loai}
                        >
                          {loai}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle tabular-nums text-[#555] sm:px-3">
                      {fmtVnd(r.gia_nhap)}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle tabular-nums font-semibold text-[#1a1a2e] sm:px-3">
                      {fmtVnd(r.gia_ban)}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle sm:px-3">
                      <span className={cn("font-bold tabular-nums", r.ton_kho <= 0 ? "text-red-600" : "text-emerald-600")}>
                        {r.ton_kho}
                      </span>
                    </td>
                    <td className="border-b border-[#f8fafc] px-1 py-2 text-right align-middle sm:px-2">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Sửa"
                          onClick={() => onEdit(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#555] transition hover:border-[#BC8AF9]/50 hover:bg-[#BC8AF9]/8 hover:text-[#1a1a2e]"
                        >
                          <Pencil size={15} strokeWidth={2} aria-hidden />
                          <span className="sr-only">Sửa</span>
                        </button>
                        <button
                          type="button"
                          title="Xoá"
                          disabled={busy}
                          onClick={() => void handleDelete(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} strokeWidth={2} aria-hidden />}
                          <span className="sr-only">Xoá</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <HoaCuPager
        page={pagination.page}
        total={pagination.total}
        pageSize={pagination.pageSize}
        basePath={pagination.basePath}
        extraQuery={pageExtra}
      />
    </div>
  );
}

function ModalSuaDonNhap({
  don,
  onClose,
  onDone,
}: {
  don: AdminHoaCuNhapDon;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [ncc, setNcc] = useState(don.nha_cung_cap?.trim() ?? "");
  const [hinhThucChi, setHinhThucChi] = useState(don.hinh_thuc_chi?.trim() || HINH_THUC[0]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const r = await updateHoaCuDonNhapMeta({
      id: don.id,
      nha_cung_cap: ncc.trim() || null,
      hinh_thuc_chi: hinhThucChi.trim() || HINH_THUC[0],
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã cập nhật.", true);
    else onDone(r.error, false);
  }

  return (
    <ModalShell
      subtitle="Đơn nhập"
      title="Sửa phiếu nhập"
      maxWidthClassName="max-w-[min(96vw,520px)]"
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
            Lưu
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="m-0 text-[11px] leading-snug text-[#888]">
          Chỉnh <span className="font-semibold text-[#555]">nhà cung cấp</span> ghi trên phiếu. Dòng hàng và số lượng giữ nguyên — muốn đổi SL hãy xoá phiếu rồi tạo đơn nhập mới.
        </p>
        <div className="rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] px-3 py-2 text-[12px] text-[#555]">
          <p className="m-0 font-semibold text-[#1a1a2e]">{fmtDt(don.created_at)}</p>
          <p className="m-0 mt-1">
            Người nhập: <span className="font-medium">{don.nguoi_nhap_name}</span> · {don.so_mat_hang} dòng · {fmtVnd(don.tong_tien)}
          </p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Nhà cung cấp</span>
          <input
            value={ncc}
            onChange={(e) => setNcc(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            placeholder="Tuỳ chọn"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Hình thức chi *</span>
          <select
            value={hinhThucChi}
            onChange={(e) => setHinhThucChi(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
          >
            {HINH_THUC.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ModalShell>
  );
}

function ModalSuaDonBan({
  don,
  students,
  onClose,
  onDone,
}: {
  don: AdminHoaCuBanDon;
  students: AdminHoaCuHvOpt[];
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [khach, setKhach] = useState(don.khach_hang != null ? String(don.khach_hang) : "");
  const [hinhThucThu, setHinhThucThu] = useState(don.hinh_thuc_thu?.trim() || HINH_THUC[0]);
  const [busy, setBusy] = useState(false);

  async function save() {
    const khachId = Number(khach);
    if (!Number.isFinite(khachId) || khachId <= 0) {
      onDone("Chọn khách hàng (học viên).", false);
      return;
    }
    setBusy(true);
    const r = await updateHoaCuDonBanMeta({
      id: don.id,
      khach_hang: khachId,
      hinh_thuc_thu: hinhThucThu.trim() || HINH_THUC[0],
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã cập nhật.", true);
    else onDone(r.error, false);
  }

  return (
    <ModalShell
      subtitle="Đơn bán"
      title="Sửa đơn bán"
      maxWidthClassName="max-w-[min(96vw,520px)]"
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
            Lưu
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="m-0 text-[11px] leading-snug text-[#888]">
          Chỉnh <span className="font-semibold text-[#555]">khách hàng</span> và{" "}
          <span className="font-semibold text-[#555]">hình thức thu</span>. Dòng hàng và số lượng giữ nguyên — muốn đổi hãy xoá đơn rồi tạo đơn bán mới.
        </p>
        <div className="rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] px-3 py-2 text-[12px] text-[#555]">
          <p className="m-0 font-semibold text-[#1a1a2e]">{fmtDt(don.created_at)}</p>
          <p className="m-0 mt-1">
            Người bán: <span className="font-medium">{don.nguoi_ban_name}</span> · {don.so_mat_hang} dòng · {fmtVnd(don.tong_tien)}
          </p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Khách hàng *</span>
          <HoaCuKhachPicker students={students} value={khach} onChange={setKhach} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Hình thức thu *</span>
          <select
            value={hinhThucThu}
            onChange={(e) => setHinhThucThu(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
          >
            {HINH_THUC.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ModalShell>
  );
}

function ModalChiTietDonNhap({
  don,
  onClose,
}: {
  don: AdminHoaCuNhapDon;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<AdminHoaCuNhapChiTietLine[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHoaCuDonNhapChiTietAction(don.id).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setLines(r.lines);
        setLoadErr(null);
      } else {
        setLines([]);
        setLoadErr(r.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [don.id]);

  const sumChiTiet = lines?.reduce((s, l) => s + l.thanh_tien, 0) ?? 0;

  return (
    <ModalShell
      subtitle="Chi tiết phiếu nhập"
      title="Thông tin nhập kho"
      maxWidthClassName="max-w-[min(96vw,720px)]"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#EAEAEA] bg-white px-5 py-2 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3 rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#555]">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[#BC8AF9]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="m-0 font-semibold text-[#1a1a2e]">{fmtDt(don.created_at)}</p>
            <p className="m-0">
              Chi nhánh: <span className="font-medium text-[#BC8AF9]">{don.chi_nhanh_ten?.trim() || "—"}</span>
            </p>
            <p className="m-0">
              Người nhập: <span className="font-medium">{don.nguoi_nhap_name}</span>
              {don.nha_cung_cap?.trim() ? (
                <>
                  {" "}
                  · NCC: <span className="font-medium">{don.nha_cung_cap.trim()}</span>
                </>
              ) : null}
            </p>
            <p className="m-0">
              Hình thức chi: <span className="font-medium">{don.hinh_thuc_chi?.trim() || "—"}</span> ·{" "}
              <span className="font-semibold tabular-nums text-[#1a1a2e]">Tổng phiếu: {fmtVnd(don.tong_tien)}</span>
            </p>
          </div>
        </div>

        {lines === null && loadErr == null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#666]">
            <Loader2 className="h-5 w-5 animate-spin text-[#BC8AF9]" aria-hidden />
            Đang tải chi tiết…
          </div>
        ) : loadErr ? (
          <p className="m-0 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{loadErr}</p>
        ) : (lines ?? []).length === 0 ? (
          <p className="m-0 text-center text-[13px] text-[#888]">Không có dòng chi tiết.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#EAEAEA]">
            <table className="w-full min-w-[600px] border-separate border-spacing-0 text-left text-[13px]">
              <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
                <tr>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 sm:px-3">#</th>
                  <th className="border-b border-[#EAEAEA] px-1 py-2 text-center sm:px-2">Ảnh</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 sm:px-3">Tên hàng</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">Mã SP</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">SL nhập</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">Đơn giá (lúc nhập)</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(lines ?? []).map((row, idx) => (
                  <tr key={`${row.mat_hang}-${idx}`} className="hover:bg-[#fafafa]">
                    <td className="border-b border-[#f8fafc] px-2 py-2 tabular-nums text-[#888] sm:px-3">{idx + 1}</td>
                    <td className="border-b border-[#f8fafc] px-1 py-2 align-middle sm:px-2">
                      <HoaCuChiTietThumb url={row.thumbnail} />
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 font-medium text-[#1a1a2e] sm:px-3">{row.ten_hang}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right tabular-nums text-[#666] sm:px-3">{row.mat_hang}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right font-semibold tabular-nums text-emerald-700 sm:px-3">
                      {row.so_luong_nhap}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right tabular-nums text-[#555] sm:px-3">
                      {fmtVnd(row.gia_nhap_snapshot)}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right font-semibold tabular-nums text-[#1a1a2e] sm:px-3">
                      {fmtVnd(row.thanh_tien)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fafafa]">
                  <td colSpan={6} className="rounded-bl-xl px-2 py-2.5 text-right text-[11px] font-bold uppercase text-[#AAA] sm:px-3">
                    Cộng (theo dòng)
                  </td>
                  <td className="rounded-br-xl px-2 py-2.5 text-right text-sm font-extrabold tabular-nums text-[#1a1a2e] sm:px-3">
                    {fmtVnd(sumChiTiet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function ModalChiTietDonBan({
  don,
  onClose,
}: {
  don: AdminHoaCuBanDon;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<AdminHoaCuBanChiTietLine[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHoaCuDonBanChiTietAction(don.id).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setLines(r.lines);
        setLoadErr(null);
      } else {
        setLines([]);
        setLoadErr(r.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [don.id]);

  const sumChiTiet = lines?.reduce((s, l) => s + l.thanh_tien, 0) ?? 0;

  return (
    <ModalShell
      subtitle="Chi tiết đơn bán"
      title="Thông tin bán hàng"
      maxWidthClassName="max-w-[min(96vw,720px)]"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#EAEAEA] bg-white px-5 py-2 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3 rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#555]">
          <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-[#BC8AF9]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="m-0 font-semibold text-[#1a1a2e]">{fmtDt(don.created_at)}</p>
            <p className="m-0">
              Chi nhánh: <span className="font-medium text-[#BC8AF9]">{don.chi_nhanh_ten?.trim() || "—"}</span>
            </p>
            <p className="m-0">
              Người bán: <span className="font-medium">{don.nguoi_ban_name}</span>
              {" · "}
              Khách: <span className="font-medium">{don.khach_hang_name}</span>
            </p>
            <p className="m-0">
              Hình thức thu: <span className="font-medium">{don.hinh_thuc_thu?.trim() || "—"}</span> ·{" "}
              <span className="font-semibold tabular-nums text-[#1a1a2e]">Tổng đơn: {fmtVnd(don.tong_tien)}</span>
            </p>
          </div>
        </div>

        {lines === null && loadErr == null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#666]">
            <Loader2 className="h-5 w-5 animate-spin text-[#BC8AF9]" aria-hidden />
            Đang tải chi tiết…
          </div>
        ) : loadErr ? (
          <p className="m-0 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{loadErr}</p>
        ) : (lines ?? []).length === 0 ? (
          <p className="m-0 text-center text-[13px] text-[#888]">Không có dòng chi tiết.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#EAEAEA]">
            <table className="w-full min-w-[600px] border-separate border-spacing-0 text-left text-[13px]">
              <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
                <tr>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 sm:px-3">#</th>
                  <th className="border-b border-[#EAEAEA] px-1 py-2 text-center sm:px-2">Ảnh</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 sm:px-3">Tên hàng</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">Mã SP</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">SL bán</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">Đơn giá (lúc bán)</th>
                  <th className="border-b border-[#EAEAEA] px-2 py-2 text-right sm:px-3">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(lines ?? []).map((row, idx) => (
                  <tr key={`${row.mat_hang}-${idx}`} className="hover:bg-[#fafafa]">
                    <td className="border-b border-[#f8fafc] px-2 py-2 tabular-nums text-[#888] sm:px-3">{idx + 1}</td>
                    <td className="border-b border-[#f8fafc] px-1 py-2 align-middle sm:px-2">
                      <HoaCuChiTietThumb url={row.thumbnail} />
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 font-medium text-[#1a1a2e] sm:px-3">{row.ten_hang}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right tabular-nums text-[#666] sm:px-3">{row.mat_hang}</td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right font-semibold tabular-nums text-rose-700 sm:px-3">
                      {row.so_luong_ban}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right tabular-nums text-[#555] sm:px-3">
                      {fmtVnd(row.gia_ban_snapshot)}
                    </td>
                    <td className="border-b border-[#f8fafc] px-2 py-2 text-right font-semibold tabular-nums text-[#1a1a2e] sm:px-3">
                      {fmtVnd(row.thanh_tien)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fafafa]">
                  <td colSpan={6} className="rounded-bl-xl px-2 py-2.5 text-right text-[11px] font-bold uppercase text-[#AAA] sm:px-3">
                    Cộng (theo dòng)
                  </td>
                  <td className="rounded-br-xl px-2 py-2.5 text-right text-sm font-extrabold tabular-nums text-[#1a1a2e] sm:px-3">
                    {fmtVnd(sumChiTiet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function NhapTab({
  rows,
  pagination,
  onListChanged,
}: {
  rows: AdminHoaCuNhapDon[];
  pagination: { page: number; pageSize: number; total: number; basePath: string; chiNhanhId: number };
  onListChanged: (msg: string, ok: boolean) => void;
}) {
  const [editDon, setEditDon] = useState<AdminHoaCuNhapDon | null>(null);
  const [detailDon, setDetailDon] = useState<AdminHoaCuNhapDon | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(r: AdminHoaCuNhapDon) {
    if (!window.confirm(`Xoá phiếu nhập ${fmtDt(r.created_at)}? Số tồn kho sẽ được điều chỉnh lại theo số lượng trên phiếu.`)) return;
    setDeletingId(r.id);
    const res = await deleteHoaCuDonNhap(r.id);
    setDeletingId(null);
    if (res.ok) onListChanged(res.message ?? "Đã xoá.", true);
    else onListChanged(res.error, false);
  }

  return (
    <>
      <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[1020px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
              <tr>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Thời gian</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Chi nhánh</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Người nhập</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Nhà cung cấp</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Dòng</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Tổng (theo giá nhập)</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Hình thức chi</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border-b border-[#f8fafc] px-4 py-10 text-center align-middle text-sm text-[#888] min-h-[min(50dvh,520px)]"
                  >
                    Chưa có đơn nhập.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const busy = deletingId === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDetailDon(r)}
                      className="cursor-pointer hover:bg-[#fafafa]"
                    >
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle whitespace-nowrap text-[#666] sm:px-3">
                        {fmtDt(r.created_at)}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle font-medium text-[#BC8AF9] sm:px-3">
                        {r.chi_nhanh_ten?.trim() || "—"}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle sm:px-3">{r.nguoi_nhap_name}</td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle break-words text-[#555] sm:px-3">
                        {r.nha_cung_cap?.trim() || "—"}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle tabular-nums sm:px-3">{r.so_mat_hang}</td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle font-semibold tabular-nums sm:px-3">
                        {fmtVnd(r.tong_tien)}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle text-[#555] sm:px-3">
                        {r.hinh_thuc_chi?.trim() || "—"}
                      </td>
                      <td className="border-b border-[#f8fafc] px-1 py-2 text-right align-middle sm:px-2">
                        <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Sửa"
                            onClick={() => {
                              setDetailDon(null);
                              setEditDon(r);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#555] transition hover:border-[#BC8AF9]/50 hover:bg-[#BC8AF9]/8 hover:text-[#1a1a2e]"
                          >
                            <Pencil size={15} strokeWidth={2} aria-hidden />
                            <span className="sr-only">Sửa</span>
                          </button>
                          <button
                            type="button"
                            title="Xoá"
                            disabled={busy}
                            onClick={() => void handleDelete(r)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} strokeWidth={2} aria-hidden />}
                            <span className="sr-only">Xoá</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <HoaCuPager
          page={pagination.page}
          total={pagination.total}
          pageSize={pagination.pageSize}
          basePath={pagination.basePath}
          extraQuery={{ chi_nhanh: String(pagination.chiNhanhId) }}
        />
      </div>
      <AnimatePresence>
        {detailDon ? (
          <ModalChiTietDonNhap key={`chi-nhap-${detailDon.id}`} don={detailDon} onClose={() => setDetailDon(null)} />
        ) : null}
        {editDon ? (
          <ModalSuaDonNhap
            key={`sua-nhap-${editDon.id}`}
            don={editDon}
            onClose={() => setEditDon(null)}
            onDone={(msg, ok) => {
              onListChanged(msg, ok);
              if (ok) setEditDon(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function DeleteDonBanConfirmModal({
  target,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  target: AdminHoaCuBanDon | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!target) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, pending, onClose]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-don-ban-title"
        className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-[20px] border-2 border-red-300 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-start gap-3 border-b border-red-200 bg-gradient-to-br from-red-50 to-red-100/70 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2.4} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[9px] font-extrabold uppercase tracking-widest text-red-700">
              Cảnh báo · Hành động không thể hoàn tác
            </p>
            <h2 id="delete-don-ban-title" className="m-0 mt-0.5 text-[15px] font-extrabold text-[#1a1a2e]">
              Xóa đơn bán {fmtDt(target.created_at)}?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-[13px] text-[#1a1a2e]">
          <p className="m-0 font-semibold text-red-700">
            Bạn sắp xóa đơn bán cho khách <b>{target.khach_hang_name}</b>. Dữ liệu sẽ{" "}
            <u>biến mất vĩnh viễn</u>, không thể khôi phục.
          </p>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#fafafa]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Chi nhánh</span>
              <span className="text-[13px] font-semibold text-[#BC8AF9]">{target.chi_nhanh_ten?.trim() || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Người bán</span>
              <span className="text-[13px] font-semibold text-[#1a1a2e]">{target.nguoi_ban_name}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Hình thức thu</span>
              <span className="text-[13px] font-semibold text-[#1a1a2e]">{target.hinh_thuc_thu?.trim() || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Số dòng</span>
              <span className="text-[13px] font-bold tabular-nums text-[#1a1a2e]">{target.so_mat_hang}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">Tổng tiền</span>
              <span className="text-[13px] font-bold tabular-nums text-[#1a1a2e]">{fmtVnd(target.tong_tien)}</span>
            </div>
          </div>

          <ul className="m-0 list-disc space-y-1 rounded-lg border border-red-200/60 bg-red-50/40 py-2 pl-9 pr-3 text-[12px] text-red-900/90">
            <li>Tồn kho các mặt hàng trên đơn sẽ được cộng lại tự động</li>
            <li>Thống kê doanh thu họa cụ và BCTC có thể thay đổi theo kỳ</li>
          </ul>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#f0f0f0] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-semibold text-[#666] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-300 bg-red-600 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Trash2 size={13} aria-hidden />}
            {pending ? "Đang xóa…" : "Xóa vĩnh viễn"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BanTab({
  rows,
  pagination,
  students,
  canMutate,
  onListChanged,
}: {
  rows: AdminHoaCuBanDon[];
  pagination: { page: number; pageSize: number; total: number; basePath: string; chiNhanhId: number };
  students: AdminHoaCuHvOpt[];
  canMutate: boolean;
  onListChanged: (msg: string, ok: boolean) => void;
}) {
  const [editDon, setEditDon] = useState<AdminHoaCuBanDon | null>(null);
  const [detailDon, setDetailDon] = useState<AdminHoaCuBanDon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminHoaCuBanDon | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function requestDelete(r: AdminHoaCuBanDon) {
    setDeleteError(null);
    setDeleteTarget(r);
  }

  function closeDeleteModal() {
    if (deletingId != null) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingId != null) return;
    setDeletingId(deleteTarget.id);
    setDeleteError(null);
    const res = await deleteHoaCuDonBan(deleteTarget.id);
    setDeletingId(null);
    if (res.ok) {
      setDeleteTarget(null);
      onListChanged(res.message ?? "Đã xoá.", true);
    } else {
      setDeleteError(res.error);
    }
  }

  const colCount = canMutate ? 8 : 7;

  return (
    <>
      <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
            <colgroup>
              <col style={{ width: canMutate ? "12%" : "13%" }} />
              <col style={{ width: canMutate ? "11%" : "12%" }} />
              <col style={{ width: canMutate ? "12%" : "13%" }} />
              <col style={{ width: canMutate ? "14%" : "16%" }} />
              <col style={{ width: canMutate ? "11%" : "12%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: canMutate ? "15%" : "20%" }} />
              {canMutate ? <col style={{ width: "18%" }} /> : null}
            </colgroup>
            <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
              <tr>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Thời gian</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Chi nhánh</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Người bán</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Khách</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Hình thức</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Dòng</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Tổng (theo giá bán)</th>
                {canMutate ? (
                  <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Thao tác</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="border-b border-[#f8fafc] px-4 py-10 text-center align-middle text-sm text-[#888] min-h-[min(50dvh,520px)]"
                  >
                    Chưa có đơn bán.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const busy = deletingId === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDetailDon(r)}
                      className="cursor-pointer hover:bg-[#fafafa]"
                    >
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle whitespace-nowrap text-[#666] sm:px-3">
                        {fmtDt(r.created_at)}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle font-medium text-[#BC8AF9] sm:px-3">
                        {r.chi_nhanh_ten?.trim() || "—"}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle sm:px-3">{r.nguoi_ban_name}</td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle break-words sm:px-3">{r.khach_hang_name}</td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle text-[#555] sm:px-3">
                        {r.hinh_thuc_thu?.trim() || "—"}
                      </td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle tabular-nums sm:px-3">{r.so_mat_hang}</td>
                      <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle font-semibold tabular-nums sm:px-3">
                        {fmtVnd(r.tong_tien)}
                      </td>
                      {canMutate ? (
                        <td className="border-b border-[#f8fafc] px-1 py-2 text-right align-middle sm:px-2">
                          <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="Sửa"
                              onClick={() => {
                                setDetailDon(null);
                                setEditDon(r);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAEAEA] text-[#555] transition hover:border-[#BC8AF9]/50 hover:bg-[#BC8AF9]/8 hover:text-[#1a1a2e]"
                            >
                              <Pencil size={15} strokeWidth={2} aria-hidden />
                              <span className="sr-only">Sửa</span>
                            </button>
                            <button
                              type="button"
                              title="Xoá"
                              disabled={busy}
                              onClick={() => requestDelete(r)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} strokeWidth={2} aria-hidden />}
                              <span className="sr-only">Xoá</span>
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
        <HoaCuPager
          page={pagination.page}
          total={pagination.total}
          pageSize={pagination.pageSize}
          basePath={pagination.basePath}
          extraQuery={{ chi_nhanh: String(pagination.chiNhanhId) }}
        />
      </div>
      <DeleteDonBanConfirmModal
        target={deleteTarget}
        pending={deletingId != null}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={() => void confirmDelete()}
      />
      <AnimatePresence>
        {detailDon ? (
          <ModalChiTietDonBan key={`chi-ban-${detailDon.id}`} don={detailDon} onClose={() => setDetailDon(null)} />
        ) : null}
        {editDon ? (
          <ModalSuaDonBan
            key={`sua-ban-${editDon.id}`}
            don={editDon}
            students={students}
            onClose={() => setEditDon(null)}
            onDone={(msg, ok) => {
              onListChanged(msg, ok);
              if (ok) setEditDon(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  footer,
  /** Mặc định ~800px cap — form bán/nhập nhiều cột cần chiều ngang hơn 520px. */
  maxWidthClassName = "max-w-[min(96vw,800px)]",
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

function HoaCuSanPhamPicker({
  sanPham,
  value,
  onChange,
  variant,
}: {
  sanPham: AdminHoaCuSanPham[];
  value: string;
  onChange: (hangId: string) => void;
  variant: "nhap" | "ban";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => sanPham.find((s) => String(s.id) === value) ?? null, [sanPham, value]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return sanPham.filter((s) => {
      if (!t) return true;
      return (
        s.ten_hang.toLowerCase().includes(t) ||
        (s.loai_san_pham ?? "").toLowerCase().includes(t) ||
        String(s.ton_kho).includes(t)
      );
    });
  }, [sanPham, search]);

  const isHet = (s: AdminHoaCuSanPham) => s.ton_kho <= 0;
  const isDisabled = (s: AdminHoaCuSanPham) => variant === "ban" && isHet(s);

  const updateRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(r.width, 280);
    const maxLeft = Math.max(8, window.innerWidth - w - 8);
    const left = Math.min(Math.max(8, r.left), maxLeft);
    setRect({ top: r.bottom + 6, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
    const onScroll = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updateRect]);

  useLayoutEffect(() => {
    if (!open) return;
    let disposed = false;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const id = window.setTimeout(() => {
      if (!disposed) document.addEventListener("mousedown", onDoc);
    }, 0);
    return () => {
      disposed = true;
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  function toggle() {
    if (open) {
      setOpen(false);
      setSearch("");
      return;
    }
    updateRect();
    setOpen(true);
  }

  const panel =
    open && rect ? (
      <div
        ref={panelRef}
        role="listbox"
        className="fixed z-[200] flex max-h-[min(52vh,380px)] flex-col overflow-hidden rounded-xl border border-[#EAEAEA] bg-white py-1 shadow-xl"
        style={{ top: rect.top, left: rect.left, width: rect.width }}
      >
        <div className="shrink-0 border-b border-[#f0f0f0] px-2 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, loại, tồn…"
              className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-[#fafafa] py-0 pl-8 pr-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              autoFocus
            />
          </div>
        </div>
        <ul className="max-h-[min(44vh,300px)] list-none overflow-y-auto overscroll-contain p-1">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => pick("")}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-[#888] hover:bg-[#f5f5f5]"
            >
              — Mặt hàng —
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-[#AAA]">Không có mặt hàng khớp.</li>
          ) : (
            filtered.map((s) => {
              const het = isHet(s);
              const dis = isDisabled(s);
              const muted = het && variant === "nhap";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={String(s.id) === value}
                    disabled={dis}
                    onClick={() => !dis && pick(String(s.id))}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
                      dis ? "cursor-not-allowed opacity-45" : "hover:bg-[#f5f5f5]",
                      muted && !dis ? "bg-[#fafafa]/80 text-[#888]" : "",
                      String(s.id) === value && !dis ? "bg-[#BC8AF9]/12" : ""
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#EAEAEA] bg-[#f3f4f6]">
                      {s.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm">📦</span>
                      )}
                      {het ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-[9px] font-bold uppercase text-white">
                          Hết
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("m-0 line-clamp-2 text-[13px] font-semibold leading-snug", het ? "text-[#888]" : "text-[#1a1a2e]")}>
                        {s.ten_hang}
                      </p>
                      {s.loai_san_pham ? (
                        <p className="m-0 mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-[#AAA]">{s.loai_san_pham}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("m-0 text-xs font-extrabold tabular-nums", het ? "text-red-500" : "text-emerald-600")}>Tồn {s.ton_kho}</p>
                      {variant === "ban" && het ? <p className="m-0 mt-0.5 text-[9px] font-bold text-red-500">Không bán</p> : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className="relative min-w-[200px] flex-1">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-[10px] border border-[#EAEAEA] bg-white px-2 py-0 text-left text-[13px] outline-none transition hover:border-[#d0d0d0] focus:border-[#BC8AF9]"
      >
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[#EAEAEA] bg-[#f3f4f6]">
          {selected?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-[#AAA]">📦</span>
          )}
        </div>
        <span className={cn("min-w-0 flex-1 truncate", selected ? "font-medium text-[#1a1a2e]" : "text-[#888]")}>
          {selected ? (
            <>
              {selected.ten_hang}
              <span className="ml-1.5 font-normal text-[#AAA]">· Tồn {selected.ton_kho}</span>
            </>
          ) : (
            "— Mặt hàng —"
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#AAA] transition", open && "rotate-180")} aria-hidden />
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

function HvAvatarThumb({ url, size }: { url: string | null; size: "sm" | "md" }) {
  const [imgErr, setImgErr] = useState(false);
  const wrap = size === "sm" ? "h-8 w-8 rounded-md" : "h-9 w-9 rounded-lg";
  if (url && !imgErr) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn(wrap, "shrink-0 border border-[#EAEAEA] object-cover")}
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center border border-[#EAEAEA] bg-[#fafafa] text-[#888]", wrap)}
    >
      <User size={size === "sm" ? 14 : 16} strokeWidth={2} aria-hidden />
    </div>
  );
}

function HocTagBadge({ tag }: { tag: "Online" | "Offline" | null }) {
  if (tag == null) {
    return (
      <span className="inline-block rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#AAA]">
        —
      </span>
    );
  }
  if (tag === "Online") {
    return (
      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-800">
        Online
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-slate-200/90 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-700">
      Offline
    </span>
  );
}

function HoaCuKhachPicker({
  students,
  value,
  onChange,
}: {
  students: AdminHoaCuHvOpt[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => students.find((s) => String(s.id) === value) ?? null, [students, value]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return students.filter((s) => {
      if (!t) return true;
      const tagStr = (s.hoc_tag ?? "").toLowerCase();
      return s.full_name.toLowerCase().includes(t) || tagStr.includes(t);
    });
  }, [students, search]);

  const limitedFiltered = useMemo(() => filtered.slice(0, KHACH_PICKER_MAX), [filtered]);

  const updateRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxW = window.innerWidth - 16;
    const w = Math.min(Math.max(r.width, KHACH_PICKER_PANEL_MIN_PX), maxW);
    const maxLeft = Math.max(8, window.innerWidth - w - 8);
    const left = Math.min(Math.max(8, r.left), maxLeft);
    setRect({ top: r.bottom + 6, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
    const onScroll = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updateRect]);

  useLayoutEffect(() => {
    if (!open) return;
    let disposed = false;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const id = window.setTimeout(() => {
      if (!disposed) document.addEventListener("mousedown", onDoc);
    }, 0);
    return () => {
      disposed = true;
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  function toggle() {
    if (open) {
      setOpen(false);
      setSearch("");
      return;
    }
    updateRect();
    setOpen(true);
  }

  const panel =
    open && rect ? (
      <div
        ref={panelRef}
        role="listbox"
        className="fixed z-[200] flex max-h-[min(52vh,380px)] flex-col overflow-hidden rounded-xl border border-[#EAEAEA] bg-white py-1 shadow-xl"
        style={{ top: rect.top, left: rect.left, width: rect.width }}
      >
        <div className="shrink-0 border-b border-[#f0f0f0] px-2 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, Online / Offline…"
              className="h-9 w-full rounded-lg border border-[#EAEAEA] bg-[#fafafa] py-0 pl-8 pr-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              autoFocus
            />
          </div>
        </div>
        <ul className="max-h-[min(44vh,300px)] list-none overflow-y-auto overscroll-contain p-1">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => pick("")}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-[#888] hover:bg-[#f5f5f5]"
            >
              — Chọn học viên —
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-[#AAA]">Không có học viên khớp.</li>
          ) : (
            limitedFiltered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(s.id) === value}
                  onClick={() => pick(String(s.id))}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#f5f5f5]",
                    String(s.id) === value ? "bg-[#BC8AF9]/12" : ""
                  )}
                >
                  <HvAvatarThumb key={`${s.id}-${s.avatar ?? ""}`} url={s.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 whitespace-normal break-words text-left text-[13px] font-semibold leading-snug text-[#1a1a2e]">
                      {s.full_name}
                    </p>
                  </div>
                  <HocTagBadge tag={s.hoc_tag} />
                </button>
              </li>
            ))
          )}
          {filtered.length > KHACH_PICKER_MAX ? (
            <li className="border-t border-[#f0f0f0] px-2 py-2 text-center text-[11px] leading-snug text-[#AAA]">
              Đang hiển thị {KHACH_PICKER_MAX}/{filtered.length} — gõ thêm để thu hẹp danh sách.
            </li>
          ) : null}
        </ul>
      </div>
    ) : null;

  return (
    <div className="relative w-full min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-[10px] border border-[#EAEAEA] bg-white px-2 py-0 text-left text-[13px] outline-none transition hover:border-[#d0d0d0] focus:border-[#BC8AF9]"
      >
        <HvAvatarThumb
          key={selected ? `${selected.id}-${selected.avatar ?? ""}` : "none"}
          url={selected?.avatar ?? null}
          size="sm"
        />
        <span className={cn("min-w-0 flex-1 truncate", selected ? "font-medium text-[#1a1a2e]" : "text-[#888]")}>
          {selected ? selected.full_name : "— Chọn —"}
        </span>
        {selected ? <HocTagBadge tag={selected.hoc_tag} /> : null}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#AAA] transition", open && "rotate-180")} aria-hidden />
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

function ModalThemHang({
  initial,
  chiNhanhOptions,
  defaultChiNhanhId,
  onClose,
  onDone,
}: {
  initial: AdminHoaCuSanPham | null;
  chiNhanhOptions: AdminChiNhanhOption[];
  defaultChiNhanhId: number | null;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const isEdit = initial != null;
  const [ten, setTen] = useState(() => initial?.ten_hang ?? "");
  const [loai, setLoai] = useState(() => initial?.loai_san_pham ?? "");
  const [giaNhap, setGiaNhap] = useState(() => (initial ? String(initial.gia_nhap ?? 0) : ""));
  const [giaBan, setGiaBan] = useState(() => (initial ? String(initial.gia_ban ?? 0) : ""));
  const [thumb, setThumb] = useState(() => initial?.thumbnail?.trim() ?? "");
  const [chiNhanhId, setChiNhanhId] = useState(() => {
    if (initial?.chi_nhanh_id != null && initial.chi_nhanh_id > 0) return String(initial.chi_nhanh_id);
    if (defaultChiNhanhId != null && defaultChiNhanhId > 0) return String(defaultChiNhanhId);
    return chiNhanhOptions[0] ? String(chiNhanhOptions[0].id) : "";
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!ten.trim()) {
      onDone("Nhập tên hàng.", false);
      return;
    }
    const branchId = Number(chiNhanhId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      onDone("Chọn chi nhánh kho.", false);
      return;
    }
    setBusy(true);
    const payload = {
      ten_hang: ten,
      loai_san_pham: loai.trim() || null,
      gia_nhap: Number(giaNhap.replace(/\s/g, "")) || 0,
      gia_ban: Number(giaBan.replace(/\s/g, "")) || 0,
      thumbnail: thumb.trim() || null,
      chi_nhanh_id: branchId,
    };
    const r = isEdit
      ? await updateHoaCuSanPham({ id: initial!.id, ...payload })
      : await createHoaCuSanPham(payload);
    setBusy(false);
    if (r.ok) onDone(r.message ?? (isEdit ? "Đã cập nhật." : "Đã thêm."), true);
    else onDone(r.error, false);
  }

  return (
    <ModalShell
      subtitle="Họa cụ"
      title={isEdit ? "Sửa mặt hàng" : "Thêm mặt hàng mới"}
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
            Lưu
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <AdminCfImageInput label="Ảnh sản phẩm" value={thumb} onValueChange={setThumb} />
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Chi nhánh kho *</span>
          <select
            value={chiNhanhId}
            onChange={(e) => setChiNhanhId(e.target.value)}
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
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Tên hàng *</span>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            placeholder="VD: Bút chì 2B"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Loại</span>
          <select
            value={loai}
            onChange={(e) => setLoai(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
          >
            <option value="">— Chọn —</option>
            {LOAI_SP.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Giá nhập</span>
            <input
              value={giaNhap}
              onChange={(e) => setGiaNhap(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Giá bán</span>
            <input
              value={giaBan}
              onChange={(e) => setGiaBan(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
              placeholder="0"
            />
          </label>
        </div>
      </div>
    </ModalShell>
  );
}

type Line = { hangId: string; qty: string };

function FieldLoggedInStaffRow({ label, name }: { label: string; name: string }) {
  const display = name.trim() || "—";
  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-bold uppercase text-[#AAA]">{label}</span>
      <div className="flex min-h-[42px] items-center gap-2 rounded-[10px] border border-[#EAEAEA] bg-[#f8fafc] px-3 py-2 text-[13px] font-semibold text-[#1a1a2e]">
        <User size={16} className="shrink-0 text-[#BC8AF9]" aria-hidden />
        <span className="min-w-0 flex-1 truncate" title={display}>
          {display}
        </span>
      </div>
    </div>
  );
}

function ModalNhapHang({
  chiNhanhOptions,
  defaultChiNhanhId,
  initialCatalog,
  defaultStaffId,
  loggedInStaffName,
  onClose,
  onDone,
}: {
  chiNhanhOptions: AdminChiNhanhOption[];
  defaultChiNhanhId: number | null;
  initialCatalog: AdminHoaCuSanPham[] | null;
  defaultStaffId: number;
  loggedInStaffName: string;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const defaultBranch =
    defaultChiNhanhId != null && defaultChiNhanhId > 0
      ? String(defaultChiNhanhId)
      : chiNhanhOptions[0]
        ? String(chiNhanhOptions[0].id)
        : "";

  const [chiNhanhId, setChiNhanhId] = useState(defaultBranch);
  const [ncc, setNcc] = useState("");
  const [hinhThucChi, setHinhThucChi] = useState<string>(HINH_THUC[0]);
  const [lines, setLines] = useState<Line[]>([{ hangId: "", qty: "1" }]);
  const initialBranchId = Number(defaultBranch);
  const cachedAtOpen =
    initialCatalog == null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? getCachedHoaCuCatalog(initialBranchId)
      : null;
  const [sanPham, setSanPham] = useState<AdminHoaCuSanPham[]>(
    initialCatalog != null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? initialCatalog.filter((sp) => sp.chi_nhanh_id === initialBranchId)
      : (cachedAtOpen ?? []),
  );
  const [catalogLoading, setCatalogLoading] = useState(initialCatalog == null && cachedAtOpen == null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveLockRef = useRef(false);

  const chiNhanhLabel = chiNhanhOptions.find((b) => String(b.id) === chiNhanhId)?.ten ?? "—";

  useEffect(() => {
    const branchId = Number(chiNhanhId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      setSanPham([]);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    setLines([{ hangId: "", qty: "1" }]);
    if (initialCatalog != null) {
      setSanPham(initialCatalog.filter((sp) => sp.chi_nhanh_id === branchId));
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
  }, [chiNhanhId, initialCatalog]);

  const tamTinhNhap = useMemo(() => {
    return lines.reduce((s, l) => {
      const sp = sanPham.find((x) => String(x.id) === l.hangId);
      return s + (sp ? sp.gia_nhap * (Number(l.qty) || 0) : 0);
    }, 0);
  }, [lines, sanPham]);

  async function save() {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    try {
      const branchId = Number(chiNhanhId);
      const valid = lines
        .map((l) => ({ mat_hang: Number(l.hangId), so_luong_nhap: Number(l.qty) }))
        .filter((l) => l.mat_hang > 0 && l.so_luong_nhap > 0);
      if (!Number.isFinite(branchId) || branchId <= 0) {
        onDone("Chọn chi nhánh nhập hàng.", false);
        return;
      }
      if (!Number.isFinite(defaultStaffId) || defaultStaffId <= 0) {
        onDone("Không xác định được nhân sự đăng nhập.", false);
        return;
      }
      if (!valid.length) {
        onDone("Thêm ít nhất một mặt hàng.", false);
        return;
      }
      setBusy(true);
      const idempotency_key =
        typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const r = await createHoaCuDonNhap({
        nguoi_nhap: defaultStaffId,
        chi_nhanh_id: branchId,
        nha_cung_cap: ncc.trim() || null,
        hinh_thuc_chi: hinhThucChi.trim() || HINH_THUC[0],
        lines: valid,
        idempotency_key,
      });
      if (r.ok) onDone(r.message ?? "Đã lưu.", true);
      else onDone(r.error, false);
    } finally {
      saveLockRef.current = false;
      setBusy(false);
    }
  }

  return (
    <ModalShell
      subtitle="Nhập họa cụ"
      title="Tạo đơn nhập hàng"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy || catalogLoading}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            Lưu đơn nhập
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Chi nhánh nhập *</span>
          <select
            value={chiNhanhId}
            onChange={(e) => setChiNhanhId(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
          >
            {chiNhanhOptions.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.ten}
              </option>
            ))}
          </select>
          <p className="m-0 mt-1 text-[11px] leading-snug text-[#888]">
            Chỉ chọn mặt hàng thuộc kho <span className="font-semibold text-[#555]">{chiNhanhLabel}</span>.
          </p>
        </label>
        {catalogLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-[#fafafa] px-4 py-8 text-[13px] text-[#666]">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#BC8AF9]" aria-hidden />
            Đang tải danh mục mặt hàng…
          </div>
        ) : null}
        {catalogError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700" role="alert">
            {catalogError}
          </div>
        ) : null}
        <FieldLoggedInStaffRow label="Người nhập *" name={loggedInStaffName} />
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Nhà cung cấp</span>
          <input
            value={ncc}
            onChange={(e) => setNcc(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px]"
            placeholder="Tuỳ chọn"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Hình thức chi *</span>
          <select
            value={hinhThucChi}
            onChange={(e) => setHinhThucChi(e.target.value)}
            className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
          >
            {HINH_THUC.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <p className="m-0 mt-1 text-[11px] leading-snug text-[#888]">
            Ghi nhận cho <span className="font-semibold text-[#555]">Thống kê thu chi</span> và BCTC (khoản chi nhập kho).
          </p>
        </label>
        <div className="flex items-center justify-between rounded-[10px] border border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#AAA]">Tạm tính (giá nhập × SL)</span>
          <span className="text-sm font-extrabold tabular-nums text-[#1a1a2e]">{fmtVnd(tamTinhNhap)}</span>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-[10px] font-bold uppercase text-[#AAA]">Hàng nhập *</p>
          <p className="m-0 text-[11px] leading-snug text-[#888]">
            Ô số là <span className="font-semibold text-[#555]">số lượng nhập trên phiếu</span> — được{" "}
            <span className="font-semibold text-[#555]">cộng thêm</span> vào tồn kho hiện tại (không phải nhập tồn tuyệt đối).
          </p>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <HoaCuSanPhamPicker
              variant="nhap"
              sanPham={sanPham}
              value={l.hangId}
              onChange={(id) => setLines((p) => p.map((x, j) => (j === i ? { ...x, hangId: id } : x)))}
            />
            <label className="flex shrink-0 flex-col gap-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-[#AAA]">SL nhập</span>
              <input
                value={l.qty}
                onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                inputMode="numeric"
                aria-label="Số lượng nhập (cộng vào tồn)"
                className="w-20 rounded-[10px] border border-[#EAEAEA] px-2 py-2 text-center text-[13px]"
              />
            </label>
            <button
              type="button"
              aria-label="Xóa dòng"
              onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-red-100 text-red-600 transition hover:bg-red-50"
            >
              <X size={18} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines((p) => [...p, { hangId: "", qty: "1" }])}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#BC8AF9] hover:underline"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          Thêm mặt hàng
        </button>
      </div>
    </ModalShell>
  );
}

function ModalBanHang({
  chiNhanhOptions,
  defaultChiNhanhId,
  initialCatalog,
  students,
  defaultStaffId,
  loggedInStaffName,
  onClose,
  onDone,
}: {
  chiNhanhOptions: AdminChiNhanhOption[];
  defaultChiNhanhId: number | null;
  initialCatalog: AdminHoaCuSanPham[] | null;
  students: AdminHoaCuHvOpt[];
  defaultStaffId: number;
  loggedInStaffName: string;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const defaultBranch =
    defaultChiNhanhId != null && defaultChiNhanhId > 0
      ? String(defaultChiNhanhId)
      : chiNhanhOptions[0]
        ? String(chiNhanhOptions[0].id)
        : "";

  const [chiNhanhId, setChiNhanhId] = useState(defaultBranch);
  const [hv, setHv] = useState("");
  const [hinhThuc, setHinhThuc] = useState<string>(HINH_THUC[0]);
  const [lines, setLines] = useState<Line[]>([{ hangId: "", qty: "1" }]);
  const initialBranchId = Number(defaultBranch);
  const cachedAtOpen =
    initialCatalog == null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? getCachedHoaCuCatalog(initialBranchId)
      : null;
  const [sanPham, setSanPham] = useState<AdminHoaCuSanPham[]>(
    initialCatalog != null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? initialCatalog.filter((sp) => sp.chi_nhanh_id === initialBranchId)
      : (cachedAtOpen ?? []),
  );
  const [catalogLoading, setCatalogLoading] = useState(initialCatalog == null && cachedAtOpen == null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveLockRef = useRef(false);

  const chiNhanhLabel = chiNhanhOptions.find((b) => String(b.id) === chiNhanhId)?.ten ?? "—";
  const sanPhamCoTon = useMemo(() => sanPham.filter((s) => s.ton_kho > 0), [sanPham]);

  useEffect(() => {
    const branchId = Number(chiNhanhId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      setSanPham([]);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    setLines([{ hangId: "", qty: "1" }]);
    if (initialCatalog != null) {
      setSanPham(initialCatalog.filter((sp) => sp.chi_nhanh_id === branchId));
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
  }, [chiNhanhId, initialCatalog]);

  const tenKhach = students.find((s) => String(s.id) === hv)?.full_name ?? "";
  const total = lines.reduce((s, l) => {
    const sp = sanPham.find((x) => String(x.id) === l.hangId);
    return s + (sp ? sp.gia_ban * (Number(l.qty) || 0) : 0);
  }, 0);

  async function save() {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    try {
      const branchId = Number(chiNhanhId);
      const valid = lines
        .map((l) => ({ mat_hang: Number(l.hangId), so_luong_ban: Number(l.qty) }))
        .filter((l) => l.mat_hang > 0 && l.so_luong_ban > 0);
      if (!Number.isFinite(branchId) || branchId <= 0) {
        onDone("Chọn chi nhánh bán hàng.", false);
        return;
      }
      if (!Number.isFinite(defaultStaffId) || defaultStaffId <= 0) {
        onDone("Không xác định được nhân sự đăng nhập.", false);
        return;
      }
      if (!hv) {
        onDone("Chọn khách hàng (học viên).", false);
        return;
      }
      if (!valid.length) {
        onDone("Thêm ít nhất một mặt hàng.", false);
        return;
      }
      for (const l of valid) {
        const sp = sanPham.find((x) => x.id === l.mat_hang);
        const t = sp?.ton_kho ?? 0;
        if (l.so_luong_ban > t) {
          onDone(`«${sp?.ten_hang ?? "#" + l.mat_hang}» chỉ còn ${t}.`, false);
          return;
        }
      }
      setBusy(true);
      const idempotency_key =
        typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const r = await createHoaCuDonBan({
        nguoi_ban: defaultStaffId,
        khach_hang: Number(hv),
        chi_nhanh_id: branchId,
        hinh_thuc_thu: hinhThuc,
        lines: valid,
        idempotency_key,
      });
      if (r.ok) onDone(r.message ?? "Đã lưu.", true);
      else onDone(r.error, false);
    } finally {
      saveLockRef.current = false;
      setBusy(false);
    }
  }

  const qrUrl =
    hinhThuc === "Chuyển khoản" && tenKhach && total > 0
      ? `https://img.vietqr.io/image/TPB-00375554360-qr_only.png?amount=${Math.round(total)}&addInfo=${encodeURIComponent(`${tenKhach} Hoa cu`)}&accountName=SINE%20ART`
      : "";

  const hangBanLines = (
    <>
      <div className="space-y-1">
        <p className="m-0 text-[10px] font-bold uppercase text-[#AAA]">Hàng bán *</p>
        <p className="m-0 text-[11px] leading-snug text-[#888]">
          Ô số là số lượng bán — <span className="font-semibold text-[#555]">trừ khỏi</span> tồn kho.
        </p>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <HoaCuSanPhamPicker
            variant="ban"
            sanPham={sanPhamCoTon.length > 0 ? sanPhamCoTon : sanPham}
            value={l.hangId}
            onChange={(id) => setLines((p) => p.map((x, j) => (j === i ? { ...x, hangId: id } : x)))}
          />
          <label className="flex shrink-0 flex-col gap-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wide text-[#AAA]">SL bán</span>
            <input
              value={l.qty}
              onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
              inputMode="numeric"
              aria-label="Số lượng bán"
              className="w-20 rounded-[10px] border border-[#EAEAEA] px-2 py-2 text-center text-[13px]"
            />
          </label>
          <button
            type="button"
            aria-label="Xóa dòng"
            onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-red-100 text-red-600 transition hover:bg-red-50"
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setLines((p) => [...p, { hangId: "", qty: "1" }])}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#BC8AF9] hover:underline"
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
        Thêm mặt hàng
      </button>
    </>
  );

  return (
    <ModalShell
      subtitle="Bán họa cụ"
      title="Tạo đơn bán"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy || catalogLoading}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            Lưu đơn bán
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Chi nhánh bán *</span>
            <select
              value={chiNhanhId}
              onChange={(e) => setChiNhanhId(e.target.value)}
              className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px] outline-none focus:border-[#BC8AF9]"
            >
              {chiNhanhOptions.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.ten}
                </option>
              ))}
            </select>
            <p className="m-0 mt-1 text-[11px] leading-snug text-[#888]">
              Chỉ bán hàng từ kho <span className="font-semibold text-[#555]">{chiNhanhLabel}</span>.
            </p>
          </label>
          {catalogLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-[#fafafa] px-4 py-8 text-[13px] text-[#666]">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#BC8AF9]" aria-hidden />
              Đang tải danh mục mặt hàng…
            </div>
          ) : null}
          {catalogError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700" role="alert">
              {catalogError}
            </div>
          ) : null}
          <FieldLoggedInStaffRow label="Người bán *" name={loggedInStaffName} />
          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Khách (học viên) *</span>
            <HoaCuKhachPicker students={students} value={hv} onChange={setHv} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Hình thức thu</span>
            <select value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)} className="w-full rounded-[10px] border border-[#EAEAEA] px-3 py-2 text-[13px]">
              {HINH_THUC.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          {!qrUrl && hinhThuc === "Chuyển khoản" ? (
            <p className="m-0 text-[11px] leading-snug text-[#AAA]">
              Chọn học viên và thêm mặt hàng để hiện mã QR thanh toán.
            </p>
          ) : null}
          {!qrUrl ? (
            <div className="flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2">
              <span className="text-xs font-bold uppercase text-[#AAA]">Tạm tính</span>
              <span className="text-sm font-extrabold text-[#1a1a2e]">{fmtVnd(total)}</span>
            </div>
          ) : null}
          {qrUrl ? <div className="space-y-3">{hangBanLines}</div> : null}
        </div>
        {qrUrl ? (
          <aside className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-3 lg:sticky lg:top-0 lg:max-h-[min(72vh,560px)] lg:overflow-y-auto lg:self-start">
            <div className="flex items-center justify-between rounded-lg border border-[#EAEAEA] bg-white px-3 py-2.5 shadow-sm">
              <span className="text-xs font-bold uppercase text-[#AAA]">Tạm tính</span>
              <span className="text-sm font-extrabold text-[#1a1a2e]">{fmtVnd(total)}</span>
            </div>
            <div className="space-y-2 text-[12px] leading-snug text-[#555]">
              <p className="m-0">
                <span className="font-semibold text-[#323232]">Ngân hàng:</span> TPBank (TPB)
              </p>
              <p className="m-0">
                <span className="font-semibold text-[#323232]">STK nhận:</span> 00375554360
              </p>
              <p className="m-0">
                <span className="font-semibold text-[#323232]">Chủ TK:</span> SINE ART
              </p>
              <p className="m-0 break-words">
                <span className="font-semibold text-[#323232]">Nội dung CK:</span> {tenKhach} Hoa cu
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 border-t border-[#f0f0f0] pt-3">
              <p className="m-0 text-center text-xs font-semibold text-[#555]">Quét mã VietQR</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR thanh toán" className="h-auto w-full max-w-[200px] rounded-lg border border-[#EAEAEA] bg-white p-2" />
            </div>
          </aside>
        ) : (
          <div className="min-w-0 space-y-3">{hangBanLines}</div>
        )}
      </div>
    </ModalShell>
  );
}
