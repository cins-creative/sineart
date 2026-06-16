"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChuyenTab, ModalChuyenHang } from "@/app/admin/dashboard/quan-ly-hoa-cu/HoaCuChuyenUi";
import {
  fetchHoaCuCatalogBestBranch,
  fetchHoaCuCatalogForBranch,
  getCachedHoaCuCatalog,
  invalidateHoaCuCatalogCache,
  isHoaCuCatalogBestBranchOk,
  prefetchHoaCuCatalog,
} from "@/app/admin/dashboard/quan-ly-hoa-cu/hoa-cu-catalog-cache";
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
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
  loadKhoPageAction,
  pollHoaCuDonBanAction,
  confirmHoaCuDonBanDaThuAction,
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
import { buildVietQrImageUrl, getTpBankQrRecipient, resolveQrPaymentAmounts } from "@/lib/payment/vietqr";

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

function fmtDateVi(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isHcChuyenKhoanUi(h: string): boolean {
  return h.trim() === "Chuyển khoản";
}

const BAN_DON_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  "Chờ thanh toán": { bg: "#fff7ed", text: "#ea580c" },
  "Đã thanh toán": { bg: "#dcfce7", text: "#16a34a" },
};

function resolveBanDonTrangThai(don: AdminHoaCuBanDon): string {
  const s = don.status?.trim();
  if (s) return s;
  return isHcChuyenKhoanUi(don.hinh_thuc_thu ?? "") ? "Chờ thanh toán" : "Đã thanh toán";
}

function BanDonStatusBadge({ status }: { status: string }) {
  const cfg = BAN_DON_STATUS_BADGE[status] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {status}
    </span>
  );
}

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n))) + " ₫";
}

const KHO_SEARCH_DEBOUNCE_MS = 320;

function KhoFilters({
  searchQ,
  chiNhanhId,
  chiNhanhOptions,
  onApply,
  pending,
}: {
  searchQ: string;
  chiNhanhId: number;
  chiNhanhOptions: AdminChiNhanhOption[];
  onApply: (q: string, branchId: number, page?: number) => void;
  pending?: boolean;
}) {
  const [qInput, setQInput] = useState(searchQ);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQInput((prev) => {
      if (prev.trim() === searchQ.trim()) return prev;
      // Request cũ trả về trong lúc user gõ tiếp — giữ text đang nhập.
      if (searchQ.trim() && prev.trim().startsWith(searchQ.trim())) return prev;
      return searchQ;
    });
  }, [searchQ]);

  const flushSearchNow = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    syncKhoUrl(qInput, chiNhanhId, 1);
    onApply(qInput, chiNhanhId, 1);
  }, [qInput, chiNhanhId, onApply]);

  useEffect(() => {
    if (qInput.trim() === searchQ.trim()) return;
    if (debounceTimerRef.current != null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      syncKhoUrl(qInput, chiNhanhId, 1);
      onApply(qInput, chiNhanhId, 1);
    }, KHO_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current != null) clearTimeout(debounceTimerRef.current);
    };
  }, [qInput, searchQ, chiNhanhId, onApply]);

  function syncKhoUrl(q: string, branchId: number, page = 1) {
    const p = new URLSearchParams();
    p.set("chi_nhanh", String(branchId));
    const t = q.trim();
    if (t) p.set("q", t);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `${HOA_CU_KHO_PATH}?${qs}` : HOA_CU_KHO_PATH);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <label className="flex min-w-[140px] shrink-0 items-center gap-2 sm:max-w-[220px]">
        <span className="sr-only">Chi nhánh</span>
        <select
          value={String(chiNhanhId)}
          disabled={pending}
          onChange={(e) => {
            const branchId = Number(e.target.value);
            syncKhoUrl(qInput, branchId, 1);
            onApply(qInput, branchId, 1);
          }}
          className={cn(
            "h-10 w-full min-w-[140px] rounded-[10px] border border-[#EAEAEA] bg-white px-2.5 text-[13px] outline-none focus:border-[#BC8AF9] md:max-w-[200px]",
            pending && "opacity-70",
          )}
          aria-label="Chi nhánh kho"
          aria-busy={pending}
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
          aria-busy={pending}
          className={cn(
            "h-10 w-full min-w-0 rounded-[10px] border border-[#EAEAEA] bg-[#F5F7F7] py-0 pl-10 pr-3 text-[13px] outline-none focus:border-[#BC8AF9] md:bg-white",
            pending && "pr-9",
          )}
        />
        {pending ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#BC8AF9]"
            aria-hidden
          />
        ) : null}
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

type HoaCuSectionId = "kho" | "chuyen" | "nhap" | "ban";

const HC_SECTIONS: {
  id: HoaCuSectionId;
  label: string;
  hint: string;
  icon: typeof Package;
  href: (branchId: number | null, fallbackId: number | undefined) => string;
}[] = [
  {
    id: "kho",
    label: "Danh mục kho",
    hint: "Tồn kho theo chi nhánh",
    icon: Package,
    href: (branchId, fallbackId) =>
      `${HOA_CU_KHO_PATH}?chi_nhanh=${branchId ?? fallbackId ?? ""}`,
  },
  {
    id: "chuyen",
    label: "Chuyển kho",
    hint: "Phiếu chuyển giữa chi nhánh",
    icon: ArrowRightLeft,
    href: () => HOA_CU_CHUYEN_PATH,
  },
  {
    id: "nhap",
    label: "Đơn nhập",
    hint: "Lịch sử nhập hàng",
    icon: Truck,
    href: (branchId, fallbackId) =>
      `${HOA_CU_NHAP_PATH}?chi_nhanh=${branchId ?? fallbackId ?? ""}`,
  },
  {
    id: "ban",
    label: "Đơn bán",
    hint: "Lịch sử bán & thu tiền",
    icon: ShoppingCart,
    href: (branchId, fallbackId) =>
      `${HOA_CU_BAN_PATH}?chi_nhanh=${branchId ?? fallbackId ?? ""}`,
  },
];

function HoaCuQuickAction({
  icon: Icon,
  label,
  onClick,
  onPrefetch,
  variant = "ghost",
}: {
  icon: typeof Truck;
  label: string;
  onClick: () => void;
  onPrefetch?: () => void;
  variant?: "ghost" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition",
        variant === "primary"
          ? "bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] text-white shadow-[0_4px_14px_rgba(238,91,159,0.22)] hover:brightness-105"
          : "border border-[#EAEAEA] bg-white text-[#555] hover:border-[#BC8AF9]/35 hover:bg-[#fafafa] hover:text-[#323232]",
      )}
    >
      <Icon size={14} strokeWidth={2} aria-hidden />
      {label}
    </button>
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

  const [khoLive, setKhoLive] = useState(khoPage);
  const [khoPending, setKhoPending] = useState(false);
  const khoReqRef = useRef(0);

  useEffect(() => {
    if (khoPage) setKhoLive(khoPage);
  }, [khoPage]);

  const applyKhoFilters = useCallback(
    async (q: string, branchId: number, page = 1) => {
      const reqId = ++khoReqRef.current;
      setKhoPending(true);
      const r = await loadKhoPageAction({
        chi_nhanh_id: branchId,
        q: q.trim() || undefined,
        page,
      });
      if (reqId !== khoReqRef.current) return;
      setKhoPending(false);
      if (r.ok) {
        const chiNhanhTen = chiNhanhOptions.find((b) => b.id === branchId)?.ten ?? "—";
        setKhoLive({
          rows: r.rows,
          page: r.page,
          pageSize: r.pageSize,
          total: r.total,
          searchQ: q.trim(),
          chiNhanhId: branchId,
          chiNhanhTen,
          inventoryTotal: r.inventoryTotal,
          inventoryHetHang: r.inventoryHetHang,
          inventoryTonSum: r.inventoryTonSum,
        });
        prefetchHoaCuCatalog(branchId);
      } else {
        notify(r.error, false);
      }
    },
    [chiNhanhOptions],
  );

  const activeBranchId =
    khoLive?.chiNhanhId ?? khoPage?.chiNhanhId ?? nhapPage?.chiNhanhId ?? banPage?.chiNhanhId ?? chiNhanhOptions[0]?.id ?? null;

  useEffect(() => {
    prefetchHoaCuCatalog(activeBranchId);
  }, [activeBranchId]);

  const khoDisplay = activeSection === "kho" ? (khoLive ?? khoPage) : khoPage;
  const activeSectionMeta = HC_SECTIONS.find((s) => s.id === activeSection);

  const prefetchCatalog = () => prefetchHoaCuCatalog(activeBranchId);

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <header className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        {/* Hàng 1 — tiêu đề module */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_14px_rgba(188,138,249,0.35)]"
              style={{ background: "linear-gradient(135deg, #BC8AF9, #ED5C9D)" }}
            >
              <Package size={20} strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#BC8AF9]">
                Họa cụ
              </p>
              <h1 className="m-0 truncate text-[17px] font-bold tracking-tight text-[#1a1a1a]">
                Quản lý kho &amp; bán hàng
              </h1>
              {activeSectionMeta ? (
                <p className="m-0 mt-0.5 truncate text-[12px] text-[#999]">{activeSectionMeta.hint}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[12px] font-semibold text-[#666] transition hover:border-[#BC8AF9]/35 hover:bg-[#fafafa]"
            title="Tải lại trang"
          >
            <RefreshCw size={14} aria-hidden />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>

        {/* Hàng 2 — điều hướng mục (tab) */}
        <nav
          className="border-t border-[#EAEAEA]/80 px-4 py-2.5 md:px-6"
          aria-label="Mục quản lý họa cụ"
        >
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#F5F7F7] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HC_SECTIONS.map(({ id, label, icon: Icon, href }) => {
              const isActive = activeSection === id;
              const tabHref = href(activeBranchId, chiNhanhOptions[0]?.id);
              return (
                <Link
                  key={id}
                  href={tabHref}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-w-[max-content] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition sm:text-[13px]",
                    isActive
                      ? "bg-white text-[#1a1a1a] shadow-[0_1px_6px_rgba(0,0,0,0.08)] ring-1 ring-[#EAEAEA]"
                      : "text-[#888] hover:bg-white/60 hover:text-[#555]",
                  )}
                >
                  <Icon size={15} strokeWidth={2} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Hàng 3 — toolbar theo mục đang mở */}
        <div className="border-t border-[#EAEAEA]/80 bg-[#FAFAFA]/80 px-4 py-3 md:px-6">
          {activeSection === "kho" && khoDisplay ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                <HoaCuQuickAction
                  icon={Truck}
                  label="Nhập hàng"
                  onClick={() => setModal("nhap")}
                  onPrefetch={prefetchCatalog}
                />
                <HoaCuQuickAction
                  icon={ShoppingCart}
                  label="Bán hàng"
                  onClick={() => setModal("ban")}
                  onPrefetch={prefetchCatalog}
                />
                <HoaCuQuickAction
                  icon={ArrowRightLeft}
                  label="Chuyển kho"
                  onClick={() => setModal("chuyen")}
                  onPrefetch={prefetchCatalog}
                />
                <HoaCuQuickAction
                  icon={Plus}
                  label="Thêm mặt hàng"
                  variant="primary"
                  onClick={() => {
                    setSanPhamDraft(null);
                    setModal("sp");
                  }}
                />
              </div>
              <KhoFilters
                searchQ={khoDisplay.searchQ}
                chiNhanhId={khoDisplay.chiNhanhId}
                chiNhanhOptions={chiNhanhOptions}
                onApply={applyKhoFilters}
                pending={khoPending}
              />
            </div>
          ) : null}

          {activeSection === "nhap" && nhapPage ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <p className="m-0 max-w-md text-[12px] leading-relaxed text-[#777]">
                Danh sách phiếu nhập — lọc theo chi nhánh, bấm dòng để xem chi tiết hoặc tạo đơn mới.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <DonChiNhanhFilter
                  key={`nhap-${nhapPage.chiNhanhId}`}
                  basePath={HOA_CU_NHAP_PATH}
                  chiNhanhId={nhapPage.chiNhanhId}
                  chiNhanhOptions={chiNhanhOptions}
                />
                <HoaCuQuickAction
                  icon={Plus}
                  label="Tạo đơn nhập"
                  variant="primary"
                  onClick={() => setModal("nhap")}
                  onPrefetch={prefetchCatalog}
                />
              </div>
            </div>
          ) : null}

          {activeSection === "ban" && banPage ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <p className="m-0 max-w-md text-[12px] leading-relaxed text-[#777]">
                Danh sách đơn bán — theo dõi thanh toán, QR chuyển khoản và xác nhận thu tiền.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <DonChiNhanhFilter
                  key={`ban-${banPage.chiNhanhId}`}
                  basePath={HOA_CU_BAN_PATH}
                  chiNhanhId={banPage.chiNhanhId}
                  chiNhanhOptions={chiNhanhOptions}
                />
                <HoaCuQuickAction
                  icon={Plus}
                  label="Tạo đơn bán"
                  variant="primary"
                  onClick={() => setModal("ban")}
                  onPrefetch={prefetchCatalog}
                />
              </div>
            </div>
          ) : null}

          {activeSection === "chuyen" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="m-0 max-w-lg text-[12px] leading-relaxed text-[#777]">
                Phiếu chuyển hàng giữa các chi nhánh — tạo phiếu mới hoặc xem lịch sử chuyển.
              </p>
              <HoaCuQuickAction
                icon={Plus}
                label="Tạo phiếu chuyển"
                variant="primary"
                onClick={() => setModal("chuyen")}
                onPrefetch={prefetchCatalog}
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
        {activeSection === "kho" && khoDisplay ? (
          <KhoTab
            rows={khoDisplay.rows}
            loading={khoPending}
            pagination={{
              page: khoDisplay.page,
              total: khoDisplay.total,
              pageSize: khoDisplay.pageSize,
              basePath: HOA_CU_KHO_PATH,
              searchQ: khoDisplay.searchQ,
              chiNhanhId: khoDisplay.chiNhanhId,
            }}
            onPageChange={(page) => {
              const p = new URLSearchParams();
              p.set("chi_nhanh", String(khoDisplay.chiNhanhId));
              if (khoDisplay.searchQ.trim()) p.set("q", khoDisplay.searchQ.trim());
              if (page > 1) p.set("page", String(page));
              const qs = p.toString();
              window.history.replaceState(null, "", qs ? `${HOA_CU_KHO_PATH}?${qs}` : HOA_CU_KHO_PATH);
              void applyKhoFilters(khoDisplay.searchQ, khoDisplay.chiNhanhId, page);
            }}
            onEdit={(r) => {
              setSanPhamDraft(r);
              setModal("sp");
            }}
            onInventoryChanged={(msg, ok) => {
              notify(msg, ok);
              if (ok && khoDisplay) {
                invalidateHoaCuCatalogCache(khoDisplay.chiNhanhId);
                void applyKhoFilters(khoDisplay.searchQ, khoDisplay.chiNhanhId, khoDisplay.page);
              }
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
                if (activeSection === "kho" && khoDisplay) {
                  void applyKhoFilters(khoDisplay.searchQ, khoDisplay.chiNhanhId, khoDisplay.page);
                } else {
                  router.refresh();
                }
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
  onPageChange,
  pending,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  extraQuery?: Record<string, string>;
  onPageChange?: (page: number) => void;
  pending?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const extra = extraQuery ?? {};
  const btnClass = (disabled: boolean) =>
    cn(
      "rounded-lg border border-[#EAEAEA] bg-white px-2.5 py-1 font-semibold",
      disabled ? "pointer-events-none opacity-40" : "hover:bg-[#f5f5f5]",
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAEAEA] bg-[#fafafa] px-3 py-2.5 text-[12px] text-[#555]">
      <span className="tabular-nums">
        Trang {page}/{totalPages} · {total} bản ghi
      </span>
      <div className="flex items-center gap-1">
        {onPageChange ? (
          <>
            <button
              type="button"
              disabled={page <= 1 || pending}
              onClick={() => onPageChange(prev)}
              className={btnClass(page <= 1 || !!pending)}
            >
              ← Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages || pending}
              onClick={() => onPageChange(next)}
              className={btnClass(page >= totalPages || !!pending)}
            >
              Sau →
            </button>
          </>
        ) : (
          <>
            <Link href={buildPageHref(basePath, prev, extra)} aria-disabled={page <= 1} className={btnClass(page <= 1)}>
              ← Trước
            </Link>
            <Link
              href={buildPageHref(basePath, next, extra)}
              aria-disabled={page >= totalPages}
              className={btnClass(page >= totalPages)}
            >
              Sau →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function KhoTab({
  rows,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onInventoryChanged,
}: {
  rows: AdminHoaCuSanPham[];
  loading?: boolean;
  pagination: {
    page: number;
    total: number;
    pageSize: number;
    basePath: string;
    searchQ: string;
    chiNhanhId: number;
  };
  onPageChange?: (page: number) => void;
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
    <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-white/60 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[#BC8AF9]" aria-hidden />
          <span className="sr-only">Đang tải kho…</span>
        </div>
      ) : null}
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
        onPageChange={onPageChange}
        pending={loading}
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

  const colCount = canMutate ? 9 : 8;

  return (
    <>
      <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
            <colgroup>
              <col style={{ width: canMutate ? "11%" : "12%" }} />
              <col style={{ width: canMutate ? "10%" : "11%" }} />
              <col style={{ width: canMutate ? "10%" : "11%" }} />
              <col style={{ width: canMutate ? "13%" : "14%" }} />
              <col style={{ width: canMutate ? "10%" : "11%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: canMutate ? "13%" : "15%" }} />
              {canMutate ? <col style={{ width: "17%" }} /> : null}
            </colgroup>
            <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
              <tr>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Thời gian</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Chi nhánh</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Người bán</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Khách</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Hình thức</th>
                <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Trạng thái</th>
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
                      <td className="border-b border-[#f8fafc] px-2 py-2 align-middle sm:px-3">
                        <BanDonStatusBadge status={resolveBanDonTrangThai(r)} />
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
  branchLabel,
}: {
  sanPham: AdminHoaCuSanPham[];
  value: string;
  onChange: (hangId: string) => void;
  variant: "nhap" | "ban";
  /** Nhãn chi nhánh — hiện gợi ý khi danh mục rỗng (không phải do tìm kiếm). */
  branchLabel?: string;
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
            <li className="px-2 py-6 text-center text-xs leading-snug text-[#AAA]">
              {sanPham.length === 0 && !search.trim() ? (
                <>
                  Chi nhánh <span className="font-semibold text-[#666]">{branchLabel?.trim() || "đã chọn"}</span> chưa
                  có mặt hàng trong kho.
                  {variant === "ban" ? (
                    <>
                      <br />
                      Chọn chi nhánh khác (vd. Tân Phú) hoặc thêm hàng tại tab Danh mục kho.
                    </>
                  ) : (
                    <>
                      <br />
                      Thêm mặt hàng mới tại tab Danh mục kho trước khi nhập phiếu.
                    </>
                  )}
                </>
              ) : (
                "Không có mặt hàng khớp từ khóa tìm kiếm."
              )}
            </li>
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
  const cachedAtOpenRaw =
    initialCatalog == null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? getCachedHoaCuCatalog(initialBranchId)
      : null;
  const cachedAtOpen = cachedAtOpenRaw && cachedAtOpenRaw.length > 0 ? cachedAtOpenRaw : null;
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
    if (cached && cached.length > 0) {
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
              branchLabel={chiNhanhLabel}
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

function VietQrPaymentImage({
  proxyUrl,
  directUrl,
  alt,
  className,
}: {
  proxyUrl: string;
  directUrl: string;
  alt: string;
  className: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!proxyUrl && !directUrl) {
      setSrc(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      setFailed(false);
      setSrc(null);
      try {
        const res = await fetch(proxyUrl, { credentials: "include", cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (cancelled) return;
        setSrc(directUrl);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proxyUrl, directUrl]);

  if (!src && !failed) {
    return (
      <div className={className} aria-busy="true" aria-label="Đang tải mã QR">
        <div className="h-full w-full animate-pulse rounded-md bg-[#ececec]" />
      </div>
    );
  }

  if (failed || !src) {
    return (
      <p className="m-0 px-2 text-center text-[11px] font-semibold text-red-600">
        Không tải được QR — dùng thông tin CK bên trên.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob URL hoặc VietQR CDN
    <img
      src={src}
      alt={alt}
      width={180}
      height={180}
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
    />
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
  const [sessionStep, setSessionStep] = useState<"s1" | "s2">("s1");
  const [createdDonId, setCreatedDonId] = useState<number | null>(null);
  const [maDon, setMaDon] = useState("");
  const [maDonSo, setMaDonSo] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [trangThai, setTrangThai] = useState<string>("Chờ thanh toán");
  const [ngayTT, setNgayTT] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deletingDon, setDeletingDon] = useState(false);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const initialBranchId = Number(defaultBranch);
  const cachedAtOpenRaw =
    initialCatalog == null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? getCachedHoaCuCatalog(initialBranchId)
      : null;
  const cachedAtOpen = cachedAtOpenRaw && cachedAtOpenRaw.length > 0 ? cachedAtOpenRaw : null;
  const [sanPham, setSanPham] = useState<AdminHoaCuSanPham[]>(
    initialCatalog != null && Number.isFinite(initialBranchId) && initialBranchId > 0
      ? initialCatalog.filter((sp) => sp.chi_nhanh_id === initialBranchId)
      : (cachedAtOpen ?? []),
  );
  const [catalogLoading, setCatalogLoading] = useState(initialCatalog == null && cachedAtOpen == null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveLockRef = useRef(false);
  const branchUserChangedRef = useRef(false);

  const chiNhanhLabel = chiNhanhOptions.find((b) => String(b.id) === chiNhanhId)?.ten ?? "—";
  const sanPhamCoTon = useMemo(() => sanPham.filter((s) => s.ton_kho > 0), [sanPham]);
  const branchIds = useMemo(() => chiNhanhOptions.map((b) => b.id), [chiNhanhOptions]);

  useEffect(() => {
    const branchId = Number(chiNhanhId);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      setSanPham([]);
      setCatalogError(null);
      setCatalogHint(null);
      setCatalogLoading(false);
      return;
    }
    setLines([{ hangId: "", qty: "1" }]);
    if (initialCatalog != null) {
      setSanPham(initialCatalog.filter((sp) => sp.chi_nhanh_id === branchId));
      setCatalogError(null);
      setCatalogHint(null);
      setCatalogLoading(false);
      return;
    }
    const cached = getCachedHoaCuCatalog(branchId);
    if (cached && cached.length > 0) {
      setSanPham(cached);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogError(null);
    setCatalogHint(null);
    setCatalogLoading(true);
    void (async () => {
      const r = branchUserChangedRef.current
        ? await fetchHoaCuCatalogForBranch(branchId)
        : await fetchHoaCuCatalogBestBranch(branchId, branchIds);
      if (cancelled) return;
      setCatalogLoading(false);
      if (!r.ok) {
        setSanPham([]);
        setCatalogError(r.error);
        return;
      }
      if (isHoaCuCatalogBestBranchOk(r) && r.autoSwitchedFrom != null && r.branchId !== branchId) {
        const fromTen = chiNhanhOptions.find((b) => b.id === r.autoSwitchedFrom)?.ten ?? `#${r.autoSwitchedFrom}`;
        const toTen = chiNhanhOptions.find((b) => b.id === r.branchId)?.ten ?? `#${r.branchId}`;
        setCatalogHint(`Chi nhánh «${fromTen}» chưa có mặt hàng — đã chuyển sang «${toTen}».`);
        setChiNhanhId(String(r.branchId));
      }
      setSanPham(r.data);
      setCatalogError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [chiNhanhId, initialCatalog, branchIds, chiNhanhOptions]);

  const total = lines.reduce((s, l) => {
    const sp = sanPham.find((x) => String(x.id) === l.hangId);
    return s + (sp ? sp.gia_ban * (Number(l.qty) || 0) : 0);
  }, 0);

  const displayTotal = sessionStep === "s2" && invoiceTotal > 0 ? invoiceTotal : total;

  const qrPaymentResolved = useMemo(() => {
    if (!maDonSo.trim() || displayTotal <= 0) return null;
    return resolveQrPaymentAmounts(maDonSo, displayTotal);
  }, [maDonSo, displayTotal]);

  const qrRecipient = useMemo(
    () => getTpBankQrRecipient(createdDonId),
    [createdDonId],
  );

  const qrDirectUrl = useMemo(() => {
    if (sessionStep !== "s2" || !isHcChuyenKhoanUi(hinhThuc)) return "";
    if (!qrPaymentResolved || createdDonId == null || !maDonSo.trim()) return "";
    return buildVietQrImageUrl(maDonSo, qrPaymentResolved.qrAmountDong, createdDonId);
  }, [sessionStep, hinhThuc, maDonSo, qrPaymentResolved, createdDonId]);

  const qrProxyUrl = useMemo(() => {
    if (sessionStep !== "s2" || !isHcChuyenKhoanUi(hinhThuc)) return "";
    if (!qrPaymentResolved || createdDonId == null || !maDonSo.trim()) return "";
    const ma = maDonSo.trim();
    return `/admin/api/quan-ly-hoa-don/qr-proxy?donId=${createdDonId}&maDonSo=${encodeURIComponent(ma)}&amount=${qrPaymentResolved.qrAmountDong}`;
  }, [sessionStep, hinhThuc, maDonSo, qrPaymentResolved, createdDonId]);

  useEffect(() => {
    if (sessionStep !== "s2" || createdDonId == null) return;
    if (!isHcChuyenKhoanUi(hinhThuc) || trangThai === "Đã thanh toán") return;
    const id = createdDonId;

    const applyPoll = (r: Awaited<ReturnType<typeof pollHoaCuDonBanAction>>) => {
      if (!r.ok) return;
      if (r.status) setTrangThai(r.status);
      if (r.ma_don) setMaDon(r.ma_don);
      if (r.ma_don_so) setMaDonSo(r.ma_don_so);
      if (r.ngay_thanh_toan) setNgayTT(r.ngay_thanh_toan);
    };

    void pollHoaCuDonBanAction(id).then(applyPoll);
    const t = window.setInterval(() => {
      void pollHoaCuDonBanAction(id).then(applyPoll);
    }, 3000);
    return () => window.clearInterval(t);
  }, [sessionStep, createdDonId, hinhThuc, trangThai]);

  async function handleConfirmDaThu() {
    if (createdDonId == null || confirmingPaid || trangThai === "Đã thanh toán") return;
    setConfirmingPaid(true);
    setErr(null);
    const r = await confirmHoaCuDonBanDaThuAction(createdDonId);
    setConfirmingPaid(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setTrangThai("Đã thanh toán");
    setNgayTT(new Date().toISOString().slice(0, 10));
  }

  function buildValidLines() {
    return lines
      .map((l) => ({ mat_hang: Number(l.hangId), so_luong_ban: Number(l.qty) }))
      .filter((l) => l.mat_hang > 0 && l.so_luong_ban > 0);
  }

  function validateForm(): string | null {
    const branchId = Number(chiNhanhId);
    const valid = buildValidLines();
    if (!Number.isFinite(branchId) || branchId <= 0) return "Chọn chi nhánh bán hàng.";
    if (!Number.isFinite(defaultStaffId) || defaultStaffId <= 0) return "Không xác định được nhân sự đăng nhập.";
    if (!hv) return "Chọn khách hàng (học viên).";
    if (!valid.length) return "Thêm ít nhất một mặt hàng.";
    for (const l of valid) {
      const sp = sanPham.find((x) => x.id === l.mat_hang);
      const t = sp?.ton_kho ?? 0;
      if (l.so_luong_ban > t) return `«${sp?.ten_hang ?? "#" + l.mat_hang}» chỉ còn ${t}.`;
    }
    return null;
  }

  async function submitDon() {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    try {
      setErr(null);
      const validationErr = validateForm();
      if (validationErr) {
        setErr(validationErr);
        return;
      }
      const branchId = Number(chiNhanhId);
      const valid = buildValidLines();
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
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      if (isHcChuyenKhoanUi(hinhThuc) && r.donId > 0) {
        setCreatedDonId(r.donId);
        setMaDon(r.maDon);
        setMaDonSo(r.maDonSo);
        setInvoiceTotal(r.tongTien);
        setTrangThai(r.status);
        setSessionStep("s2");
        return;
      }
      onDone(r.message ?? "Đã lưu.", true);
    } finally {
      saveLockRef.current = false;
      setBusy(false);
    }
  }

  async function handleQuayLaiSua() {
    if (trangThai === "Đã thanh toán" || deletingDon) return;
    setErr(null);
    if (createdDonId != null) {
      setDeletingDon(true);
      const r = await deleteHoaCuDonBan(createdDonId);
      setDeletingDon(false);
      if (!r.ok) {
        setErr(r.error || "Không xoá được đơn tạm để quay lại.");
        return;
      }
    }
    setCreatedDonId(null);
    setMaDon("");
    setMaDonSo("");
    setInvoiceTotal(0);
    setTrangThai("Chờ thanh toán");
    setNgayTT(null);
    setSessionStep("s1");
  }

  function handleCloseModal() {
    if (sessionStep === "s2" && trangThai === "Đã thanh toán") {
      onDone("Đã xác nhận thanh toán đơn bán.", true);
      return;
    }
    onClose();
  }

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
            branchLabel={chiNhanhLabel}
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

  const tenKhach = students.find((s) => String(s.id) === hv)?.full_name ?? "";

  return (
    <ModalShell
      subtitle="Bán họa cụ"
      title={sessionStep === "s1" ? "Tạo đơn bán" : "Thanh toán đơn bán"}
      onClose={handleCloseModal}
      footer={
        sessionStep === "s1" ? (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] text-[#666]">
              Hủy
            </button>
            <button
              type="button"
              disabled={busy || catalogLoading}
              onClick={() => void submitDon()}
              className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : null}
              {isHcChuyenKhoanUi(hinhThuc) ? "Tạo đơn" : "Lưu đơn bán"}
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={deletingDon || trangThai === "Đã thanh toán"}
              onClick={() => void handleQuayLaiSua()}
              className="rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-black/55 disabled:opacity-50"
            >
              {deletingDon ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
              Quay lại sửa
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {trangThai !== "Đã thanh toán" ? (
                <button
                  type="button"
                  disabled={confirmingPaid}
                  onClick={() => void handleConfirmDaThu()}
                  className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 disabled:opacity-50"
                >
                  {confirmingPaid ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
                  Xác nhận đã nhận CK
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-[10px] bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] px-4 py-2 text-[13px] font-bold text-white"
              >
                {trangThai === "Đã thanh toán" ? "Hoàn tất" : "Đóng"}
              </button>
            </div>
          </div>
        )
      }
    >
      {sessionStep === "s1" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-4">
            <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Chi nhánh bán *</span>
            <select
              value={chiNhanhId}
              onChange={(e) => {
                branchUserChangedRef.current = true;
                setChiNhanhId(e.target.value);
              }}
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
            {catalogHint ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-snug text-amber-900" role="status">
                {catalogHint}
              </div>
            ) : null}
            <FieldLoggedInStaffRow label="Người bán *" name={loggedInStaffName} />
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[10px] font-bold uppercase text-[#AAA]">Khách (học viên) *</span>
              <HoaCuKhachPicker students={students} value={hv} onChange={setHv} />
            </label>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase text-[#AAA]">Hình thức thu</p>
              <div className="flex gap-2">
                {HINH_THUC.map((h) => {
                  const active = hinhThuc === h;
                  const Icon = h === "Chuyển khoản" ? Smartphone : DollarSign;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHinhThuc(h)}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-[11px] border-[1.5px] py-2.5 text-[10px] font-semibold transition",
                        active
                          ? "border-[#F8A568] bg-[#FFF7F0] text-[#F8A568]"
                          : "border-[#EAEAEA] bg-white text-[#888]",
                      )}
                    >
                      <Icon size={15} strokeWidth={2} className={active ? "text-[#F8A568]" : "text-[#9ca3af]"} aria-hidden />
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2">
              <span className="text-xs font-bold uppercase text-[#AAA]">Tạm tính</span>
              <span className="text-sm font-extrabold text-[#1a1a2e]">{fmtVnd(total)}</span>
            </div>
            {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{err}</p> : null}
          </div>
          <div className="min-w-0 space-y-3">{hangBanLines}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-3">
            <div className="rounded-xl bg-[#F8F9FA] px-3.5 py-2.5 text-[12px]">
              <div className="flex justify-between border-b border-[#f0f0f0] py-1.5">
                <span className="text-[10px] font-bold uppercase text-[#BBB]">Khách hàng</span>
                <span className="max-w-[60%] text-right font-bold text-[#1a1a2e]">{tenKhach || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-[#f0f0f0] py-1.5">
                <span className="text-[10px] font-bold uppercase text-[#BBB]">Mã đơn</span>
                <span className="text-right font-bold text-[#1a1a2e]">{maDon || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[10px] font-bold uppercase text-[#BBB]">Tổng tiền</span>
                <span className="text-right font-extrabold text-[#1a1a2e]">{fmtVnd(displayTotal)}</span>
              </div>
            </div>
            {trangThai === "Đã thanh toán" ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                <div>
                  <p className="m-0 text-[12px] font-bold text-emerald-700">Đã thanh toán</p>
                  {ngayTT ? <p className="m-0 mt-0.5 text-[11px] text-black/45">Ngày: {fmtDateVi(ngayTT)}</p> : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2.5">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#F8A568]" />
                <div>
                  <p className="m-0 text-[12px] font-bold text-[#ea580c]">Chờ thanh toán tự động</p>
                  <p className="m-0 mt-0.5 text-[11px] text-black/45">Tự cập nhật khi nhận CK · kiểm tra mỗi 3 giây</p>
                </div>
              </div>
            )}
            {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">{err}</p> : null}
          </div>
          {qrProxyUrl && qrDirectUrl && qrPaymentResolved ? (
            <aside className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#EAEAEA] bg-[#fafafa] p-3 lg:sticky lg:top-0 lg:max-h-[min(72vh,560px)] lg:overflow-y-auto lg:self-start">
              <div className="flex items-center justify-between rounded-lg border border-[#EAEAEA] bg-white px-3 py-2.5 shadow-sm">
                <span className="text-xs font-bold uppercase text-[#AAA]">Tạm tính</span>
                <span className="text-sm font-extrabold text-[#1a1a2e]">{fmtVnd(qrPaymentResolved.qrAmountDong)}</span>
              </div>
              <div className="space-y-2 text-[12px] leading-snug text-[#555]">
                <p className="m-0">
                  <span className="font-semibold text-[#323232]">Ngân hàng:</span> TPBank (TPB)
                </p>
                <p className="m-0">
                  <span className="font-semibold text-[#323232]">STK nhận:</span> {qrRecipient.stk}
                </p>
                <p className="m-0">
                  <span className="font-semibold text-[#323232]">Chủ TK:</span> {qrRecipient.accountName}
                </p>
                <p className="m-0 break-words">
                  <span className="font-semibold text-[#323232]">Nội dung CK:</span> {maDonSo || maDon}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 border-t border-[#f0f0f0] pt-3">
                <p className="m-0 text-center text-xs font-semibold text-[#555]">Quét mã VietQR</p>
                <VietQrPaymentImage
                  proxyUrl={qrProxyUrl}
                  directUrl={qrDirectUrl}
                  alt="QR thanh toán"
                  className="h-40 w-40 rounded-lg border border-[#EAEAEA] bg-white object-contain p-2"
                />
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
}
