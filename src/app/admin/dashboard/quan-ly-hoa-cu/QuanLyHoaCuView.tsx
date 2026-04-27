"use client";

import { createPortal } from "react-dom";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
} from "lucide-react";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import { createHoaCuDonBan, createHoaCuDonNhap, createHoaCuSanPham } from "@/app/admin/dashboard/quan-ly-hoa-cu/actions";
import { ADMIN_MODAL_ROOT_ELEMENT_ID } from "@/lib/admin/constants";
import type {
  AdminHoaCuBanDon,
  AdminHoaCuBundle,
  AdminHoaCuHvOpt,
  AdminHoaCuNhapDon,
  AdminHoaCuSanPham,
} from "@/lib/data/admin-hoa-cu";
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

type Tab = "kho" | "nhap" | "ban";

type Props = { bundle: AdminHoaCuBundle; defaultStaffId: number; loggedInStaffName: string };

export default function QuanLyHoaCuView({ bundle, defaultStaffId, loggedInStaffName }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("kho");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [modal, setModal] = useState<"sp" | "nhap" | "ban" | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2800);
  };

  const filteredSp = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return bundle.sanPham;
    return bundle.sanPham.filter(
      (r) => r.ten_hang.toLowerCase().includes(t) || (r.loai_san_pham ?? "").toLowerCase().includes(t)
    );
  }, [bundle.sanPham, q]);

  const hetHang = useMemo(() => bundle.sanPham.filter((s) => s.ton_kho <= 0).length, [bundle.sanPham]);

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
              {bundle.sanPham.length} mặt hàng · {hetHang} hết tồn
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
            onClick={() => setModal("nhap")}
            className="rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            <Truck className="mb-0.5 mr-1 inline" size={15} />
            Nhập hàng
          </button>
          <button
            type="button"
            onClick={() => setModal("ban")}
            className="rounded-xl border border-[#EAEAEA] bg-white px-[14px] py-2.5 text-[13px] font-semibold text-[#666] hover:bg-[#fafafa]"
          >
            <ShoppingCart className="mb-0.5 mr-1 inline" size={15} />
            Bán hàng
          </button>
          <button
            type="button"
            onClick={() => setModal("sp")}
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
              { id: "kho" as const, label: "Danh mục kho", icon: Package },
              { id: "nhap" as const, label: "Đơn nhập", icon: Truck },
              { id: "ban" as const, label: "Đơn bán", icon: ShoppingCart },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2.5 text-[13px] font-semibold transition",
                tab === id
                  ? "border-[#EAEAEA] bg-[#F5F7F7] text-[#1a1a2e]"
                  : "border-transparent text-[#888] hover:bg-black/[0.02]"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {tab === "kho" ? (
          <div className="relative w-full min-w-0 sm:max-w-md md:flex-1 md:max-w-none lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên hàng, loại…"
              className="h-10 w-full rounded-[10px] border border-[#EAEAEA] bg-[#F5F7F7] py-0 pl-10 pr-9 text-[13px] outline-none focus:border-[#BC8AF9] md:bg-white"
            />
            {q ? (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9ca3af] hover:bg-black/[0.05]"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
        {tab === "kho" ? (
          <KhoTab rows={filteredSp} />
        ) : tab === "nhap" ? (
          <NhapTab rows={bundle.donNhap} />
        ) : (
          <BanTab rows={bundle.donBan} />
        )}
      </div>

      <AnimatePresence>
        {modal === "sp" ? (
          <ModalThemHang
            key="sp"
            onClose={() => setModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                setModal(null);
                router.refresh();
              }
            }}
          />
        ) : null}
        {modal === "nhap" ? (
          <ModalNhapHang
            key="nhap"
            sanPham={bundle.sanPham}
            defaultStaffId={defaultStaffId}
            loggedInStaffName={loggedInStaffName}
            onClose={() => setModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
                setModal(null);
                router.refresh();
              }
            }}
          />
        ) : null}
        {modal === "ban" ? (
          <ModalBanHang
            key="ban"
            sanPham={bundle.sanPham}
            students={bundle.studentOptions}
            defaultStaffId={defaultStaffId}
            loggedInStaffName={loggedInStaffName}
            onClose={() => setModal(null)}
            onDone={(msg, ok) => {
              notify(msg, ok);
              if (ok) {
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

function KhoTab({ rows }: { rows: AdminHoaCuSanPham[] }) {
  return (
    <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
            <tr>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Ảnh</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Tên hàng</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Loại</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Giá nhập</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Giá bán</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Tồn kho</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border-b border-[#f8fafc] px-4 py-10 text-center text-sm text-[#888]">
                  Không có mặt hàng.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const loai = r.loai_san_pham ?? "";
                const badge = loai && LOAI_BADGE[loai] ? LOAI_BADGE[loai] : { bg: "#f3f4f6", text: "#6b7280" };
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NhapTab({ rows }: { rows: AdminHoaCuNhapDon[] }) {
  return (
    <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "32%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
            <tr>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Thời gian</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Người nhập</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Nhà cung cấp</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Dòng</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Tổng (theo giá nhập)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border-b border-[#f8fafc] px-4 py-10 text-center align-middle text-sm text-[#888] min-h-[min(50dvh,520px)]"
                >
                  Chưa có đơn nhập.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#fafafa]">
                  <td className="border-b border-[#f8fafc] px-2 py-2 align-middle whitespace-nowrap text-[#666] sm:px-3">
                    {fmtDt(r.created_at)}
                  </td>
                  <td className="border-b border-[#f8fafc] px-2 py-2 align-middle sm:px-3">{r.nguoi_nhap_name}</td>
                  <td className="border-b border-[#f8fafc] px-2 py-2 align-middle break-words text-[#555] sm:px-3">
                    {r.nha_cung_cap?.trim() || "—"}
                  </td>
                  <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle tabular-nums sm:px-3">{r.so_mat_hang}</td>
                  <td className="border-b border-[#f8fafc] px-2 py-2 text-right align-middle font-semibold tabular-nums sm:px-3">
                    {fmtVnd(r.tong_tien)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BanTab({ rows }: { rows: AdminHoaCuBanDon[] }) {
  return (
    <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "26%" }} />
          </colgroup>
          <thead className="bg-[#fafafa] text-[10px] font-extrabold uppercase tracking-wider text-[#AAA]">
            <tr>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Thời gian</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Người bán</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Khách</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 align-middle sm:px-3">Hình thức</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Dòng</th>
              <th className="border-b border-[#EAEAEA] px-2 py-2.5 text-right align-middle sm:px-3">Tổng (theo giá bán)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-b border-[#f8fafc] px-4 py-10 text-center align-middle text-sm text-[#888] min-h-[min(50dvh,520px)]"
                >
                  Chưa có đơn bán.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#fafafa]">
                  <td className="border-b border-[#f8fafc] px-2 py-2 align-middle whitespace-nowrap text-[#666] sm:px-3">
                    {fmtDt(r.created_at)}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
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

function ModalThemHang({ onClose, onDone }: { onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const [ten, setTen] = useState("");
  const [loai, setLoai] = useState("");
  const [giaNhap, setGiaNhap] = useState("");
  const [giaBan, setGiaBan] = useState("");
  const [thumb, setThumb] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!ten.trim()) {
      onDone("Nhập tên hàng.", false);
      return;
    }
    setBusy(true);
    const r = await createHoaCuSanPham({
      ten_hang: ten,
      loai_san_pham: loai.trim() || null,
      gia_nhap: Number(giaNhap.replace(/\s/g, "")) || 0,
      gia_ban: Number(giaBan.replace(/\s/g, "")) || 0,
      thumbnail: thumb.trim() || null,
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã thêm.", true);
    else onDone(r.error, false);
  }

  return (
    <ModalShell
      subtitle="Họa cụ"
      title="Thêm mặt hàng mới"
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
      <p className="m-0 text-[11px] leading-snug text-[#888]">Theo tài khoản đăng nhập dashboard.</p>
    </div>
  );
}

function ModalNhapHang({
  sanPham,
  defaultStaffId,
  loggedInStaffName,
  onClose,
  onDone,
}: {
  sanPham: AdminHoaCuSanPham[];
  defaultStaffId: number;
  loggedInStaffName: string;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [ncc, setNcc] = useState("");
  const [lines, setLines] = useState<Line[]>([{ hangId: "", qty: "1" }]);
  const [busy, setBusy] = useState(false);

  async function save() {
    const valid = lines
      .map((l) => ({ mat_hang: Number(l.hangId), so_luong_nhap: Number(l.qty) }))
      .filter((l) => l.mat_hang > 0 && l.so_luong_nhap > 0);
    if (!Number.isFinite(defaultStaffId) || defaultStaffId <= 0) {
      onDone("Không xác định được nhân sự đăng nhập.", false);
      return;
    }
    if (!valid.length) {
      onDone("Thêm ít nhất một mặt hàng.", false);
      return;
    }
    setBusy(true);
    const r = await createHoaCuDonNhap({
      nguoi_nhap: defaultStaffId,
      nha_cung_cap: ncc.trim() || null,
      lines: valid,
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã lưu.", true);
    else onDone(r.error, false);
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
            disabled={busy}
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
        <p className="m-0 text-[10px] font-bold uppercase text-[#AAA]">Hàng nhập *</p>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <HoaCuSanPhamPicker
              variant="nhap"
              sanPham={sanPham}
              value={l.hangId}
              onChange={(id) => setLines((p) => p.map((x, j) => (j === i ? { ...x, hangId: id } : x)))}
            />
            <input
              value={l.qty}
              onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
              inputMode="numeric"
              className="w-20 rounded-[10px] border border-[#EAEAEA] px-2 py-2 text-center text-[13px]"
            />
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
  sanPham,
  students,
  defaultStaffId,
  loggedInStaffName,
  onClose,
  onDone,
}: {
  sanPham: AdminHoaCuSanPham[];
  students: AdminHoaCuHvOpt[];
  defaultStaffId: number;
  loggedInStaffName: string;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [hv, setHv] = useState("");
  const [hinhThuc, setHinhThuc] = useState<string>(HINH_THUC[0]);
  const [lines, setLines] = useState<Line[]>([{ hangId: "", qty: "1" }]);
  const [busy, setBusy] = useState(false);

  const tenKhach = students.find((s) => String(s.id) === hv)?.full_name ?? "";
  const total = lines.reduce((s, l) => {
    const sp = sanPham.find((x) => String(x.id) === l.hangId);
    return s + (sp ? sp.gia_ban * (Number(l.qty) || 0) : 0);
  }, 0);

  async function save() {
    const valid = lines
      .map((l) => ({ mat_hang: Number(l.hangId), so_luong_ban: Number(l.qty) }))
      .filter((l) => l.mat_hang > 0 && l.so_luong_ban > 0);
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
      if (t > 0 && l.so_luong_ban > t) {
        onDone(`«${sp?.ten_hang ?? "#" + l.mat_hang}» chỉ còn ${t}.`, false);
        return;
      }
    }
    setBusy(true);
    const r = await createHoaCuDonBan({
      nguoi_ban: defaultStaffId,
      khach_hang: Number(hv),
      hinh_thuc_thu: hinhThuc,
      lines: valid,
    });
    setBusy(false);
    if (r.ok) onDone(r.message ?? "Đã lưu.", true);
    else onDone(r.error, false);
  }

  const qrUrl =
    hinhThuc === "Chuyển khoản" && tenKhach && total > 0
      ? `https://img.vietqr.io/image/TPB-00375554360-qr_only.png?amount=${Math.round(total)}&addInfo=${encodeURIComponent(`${tenKhach} Hoa cu`)}&accountName=SINE%20ART`
      : "";

  const hangBanLines = (
    <>
      <p className="m-0 text-[10px] font-bold uppercase text-[#AAA]">Hàng bán *</p>
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          <HoaCuSanPhamPicker
            variant="ban"
            sanPham={sanPham}
            value={l.hangId}
            onChange={(id) => setLines((p) => p.map((x, j) => (j === i ? { ...x, hangId: id } : x)))}
          />
          <input
            value={l.qty}
            onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
            inputMode="numeric"
            className="w-20 rounded-[10px] border border-[#EAEAEA] px-2 py-2 text-center text-[13px]"
          />
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
            disabled={busy}
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
