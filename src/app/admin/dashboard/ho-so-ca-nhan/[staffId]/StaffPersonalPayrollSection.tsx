"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, X } from "lucide-react";

import {
  bangHasLichDiemDanh,
  PayrollPayslipCard,
} from "@/app/admin/dashboard/quan-ly-nhan-su/PayrollPayslipCard";
import type { AdminBangTinhLuongListItem, AdminNhanSuRow } from "@/lib/data/admin-quan-ly-nhan-su";
import { cn } from "@/lib/utils";

import { SectionTitle } from "./StaffPersonalDashboardShared";

function fmtDateVi(ymd: string | null | undefined): string {
  if (!ymd?.trim()) return "—";
  const s = ymd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function kyLabel(row: AdminBangTinhLuongListItem): string {
  const tRaw = row.ky_thang?.trim();
  const y = row.ky_nam?.trim();
  const t =
    tRaw && /^tháng\s+/i.test(tRaw) ? tRaw.replace(/^tháng\s+/i, "").trim() || tRaw : tRaw;
  if (t && y) return `Tháng ${t} / ${y}`;
  if (y) return `Năm ${y}`;
  if (row.created_at) {
    const d = new Date(row.created_at);
    if (!Number.isNaN(d.getTime())) return `Tạo ${fmtDateVi(d.toISOString().slice(0, 10))}`;
  }
  return `Phiếu #${row.id}`;
}

function fmtVnd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n)));
}

export default function StaffPersonalPayrollSection({
  staff,
  bangLuong,
}: Readonly<{
  staff: AdminNhanSuRow;
  bangLuong: AdminBangTinhLuongListItem[];
}>) {
  const [openBangId, setOpenBangId] = useState<number | null>(null);

  const close = useCallback(() => setOpenBangId(null), []);

  useEffect(() => {
    if (openBangId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openBangId, close]);

  const selectedBl = openBangId != null ? bangLuong.find((b) => b.id === openBangId) : undefined;

  return (
    <>
      <section className="max-w-full min-w-0 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] md:p-5">
        <SectionTitle
          icon={ScrollText}
          title="Các kỳ trả lương"
          description="Dữ liệu từ hr_bang_tinh_luong và kỳ điểm danh liên kết. Bấm một dòng để xem phiếu lương đầy đủ (giống mục Thanh toán lương trong Quản lý nhân sự)."
        />
        {bangLuong.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/[0.1] bg-[#fafafa] px-4 py-8 text-center text-sm text-black/45">
            Chưa có bản ghi bảng lương cho nhân sự này.
          </p>
        ) : (
          <div className="max-w-full min-w-0 overflow-x-auto rounded-2xl border border-black/[0.06] bg-[#fafafa]/50">
            <table className="min-w-[760px] w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#fff5eb]/95 via-[#fef5f3]/95 to-[#fdeef6]/90 text-[10px] font-bold uppercase tracking-[0.1em] text-black/50">
                  <th className="px-3 py-3 pl-4">ID</th>
                  <th className="px-3 py-3">Kỳ</th>
                  <th className="px-3 py-3">Tạm ứng</th>
                  <th className="px-3 py-3">Thưởng</th>
                  <th className="px-3 py-3">LCB</th>
                  <th className="px-3 py-3">Trợ cấp</th>
                  <th className="px-3 py-3">Buổi làm</th>
                  <th className="px-3 py-3">Nghỉ tháng</th>
                  <th className="px-3 py-3 pr-4">Nghỉ/năm</th>
                </tr>
              </thead>
              <tbody>
                {bangLuong.map((row, i) => {
                  const selected = openBangId === row.id;
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      title="Xem phiếu lương"
                      onClick={() => setOpenBangId((cur) => (cur === row.id ? null : row.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenBangId((cur) => (cur === row.id ? null : row.id));
                        }
                      }}
                      className={cn(
                        "border-b border-black/[0.05] transition-colors last:border-0",
                        "cursor-pointer hover:bg-[#fff9f5]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f8a668]/70",
                        i % 2 === 0 ? "bg-white" : "bg-white/60",
                        selected && "bg-[#FFF5F9]",
                      )}
                    >
                      <td className="px-3 py-2.5 pl-4 font-mono text-[11px] text-black/55">#{row.id}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#1a1a1a]">{kyLabel(row)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-black/75">{fmtVnd(row.tam_ung)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-black/75">{fmtVnd(row.thuong)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-black/75">{fmtVnd(row.luong_co_ban)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-black/75">{fmtVnd(row.tro_cap)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-black/75">
                        {row.so_buoi_lam_viec != null ? String(row.so_buoi_lam_viec) : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-black/75">
                        {row.so_buoi_nghi_trong_thang != null ? String(row.so_buoi_nghi_trong_thang) : "—"}
                      </td>
                      <td className="px-3 py-2.5 pr-4 tabular-nums text-black/75">
                        {row.tong_so_buoi_nghi_trong_nam != null ? String(row.tong_so_buoi_nghi_trong_nam) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBl ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) close();
          }}
        >
          <div
            className="flex max-h-[min(100dvh,920px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-black/[0.08] bg-[#fafafa] shadow-2xl sm:max-h-[min(92vh,880px)] sm:max-w-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-payroll-slip-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 id="staff-payroll-slip-title" className="text-sm font-bold text-[#1a1a1a]">
                  Phiếu lương — {kyLabel(selectedBl)}
                </h2>
                <p className="mt-0.5 text-[11px] text-black/45">Bảng #{selectedBl.id}</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-black/60 transition hover:bg-black/[0.04]"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
              {!bangHasLichDiemDanh(selectedBl) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] font-medium text-amber-900">
                  Bảng lương #{selectedBl.id} chưa có lịch điểm danh đủ — phiếu có thể thiếu dữ liệu. Liên hệ quản lý để hoàn tất điểm
                  danh.
                </div>
              ) : (
                <PayrollPayslipCard nv={staff} bl={selectedBl} editable={false} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
