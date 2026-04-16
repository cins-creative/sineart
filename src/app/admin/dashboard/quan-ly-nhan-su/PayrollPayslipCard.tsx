"use client";

import { forwardRef, type ReactNode } from "react";
import { Calendar, DollarSign, User } from "lucide-react";

import type { AdminBangTinhLuongListItem, AdminNhanSuRow } from "@/lib/data/admin-quan-ly-nhan-su";
import { cn } from "@/lib/utils";

function payslipFmtVnd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Math.round(Number(n));
  return `${v.toLocaleString("vi-VN")} đ`;
}

function PayslipReadField({ value, multiline }: { value: string; multiline?: boolean }) {
  return (
    <div
      className={cn(
        "w-full rounded-xl bg-[#F5F7F7] px-3 py-2.5 text-[13px] font-medium text-[#1a1a2e]",
        multiline && "whitespace-pre-wrap leading-relaxed"
      )}
    >
      {value || "—"}
    </div>
  );
}

function PayslipFieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-5">
      <div className="shrink-0 sm:w-[34%]">
        <div className="text-[12px] font-semibold text-[#888]">{label}</div>
        {hint ? <p className="mt-0.5 text-[10px] font-medium leading-snug text-[#AAA]">{hint}</p> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Đã có ít nhất một lịch điểm danh gắn bảng lương (sau bước 2 tạo modal). */
export function bangHasLichDiemDanh(bl: AdminBangTinhLuongListItem): boolean {
  if (bl.so_buoi_lam_viec != null && Number.isFinite(bl.so_buoi_lam_viec)) return true;
  if (bl.ky_thang != null && String(bl.ky_thang).trim() !== "") return true;
  if (bl.ky_nam != null && String(bl.ky_nam).trim() !== "") return true;
  return false;
}

/** Cùng công thức Framer `VH_Bang_tinh_luong`: Fulltime = CB + trợ cấp + thưởng − tạm ứng; Theo buổi = CB×buổi + thưởng − tạm ứng. */
function computePayrollNetSalary(nv: AdminNhanSuRow, bl: AdminBangTinhLuongListItem): number {
  const isTheoBuoi = nv.hinh_thuc_tinh_luong?.trim() === "Theo buổi";
  const lcb = nv.luong_co_ban ?? 0;
  const tc = nv.tro_cap ?? 0;
  const tu = bl.tam_ung ?? 0;
  const th = bl.thuong ?? 0;
  const soBuoi = bl.so_buoi_lam_viec ?? 0;
  if (isTheoBuoi) return Math.round(lcb * soBuoi + th - tu);
  return Math.round(lcb + tc + th - tu);
}

function PayrollPayslipKpi({
  label,
  value,
  big,
  colorClass,
  bgClass,
}: {
  label: string;
  value: string;
  big?: boolean;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={cn("min-w-0 flex-1 rounded-xl border border-black/[0.06] px-3 py-2.5", bgClass)}>
      <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#888]">{label}</div>
      <div className={cn("mt-0.5 font-bold tabular-nums", big ? "text-[15px]" : "text-[13px]", colorClass)}>{value}</div>
    </div>
  );
}

/** Phiếu lương = bản xem tính toán (không thêm bảng DB) — tương đương khối `printRef` trong Framer. */
export const PayrollPayslipCard = forwardRef<HTMLDivElement, { nv: AdminNhanSuRow; bl: AdminBangTinhLuongListItem }>(
  function PayrollPayslipCard({ nv, bl }, ref) {
    const isTheoBuoi = nv.hinh_thuc_tinh_luong?.trim() === "Theo buổi";
    const net = computePayrollNetSalary(nv, bl);
    const ky =
      bl.ky_thang || bl.ky_nam ? [bl.ky_thang, bl.ky_nam].filter(Boolean).join(" ") : "—";
    const bhxh = nv.bhxh != null && nv.bhxh > 0 ? nv.bhxh : null;
    const showBhxh = !isTheoBuoi && bhxh != null;

    return (
      <div ref={ref} className="rounded-2xl border border-[#EAEAEA] bg-[#F5F7F7] p-3">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#AAA]">Phiếu lương #{bl.id}</div>
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#EAEAEA] bg-white px-3 py-3">
          {nv.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nv.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full border-2 border-[#EAEAEA] object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#EAEAEA] bg-[#F5F7F7] text-[#AAA]">
              <User size={20} aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold text-[#323232]">{nv.full_name?.trim() || "—"}</div>
            <div className="truncate text-[11px] font-medium text-[#AAA]">
              {nv.hinh_thuc_tinh_luong?.trim() || "—"}
              {ky !== "—" ? ` · ${ky}` : ""}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-semibold text-[#AAA]">Lương thực nhận</div>
            <div className="text-[16px] font-extrabold tabular-nums text-[#1A9A5C]">{payslipFmtVnd(net)}</div>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <PayrollPayslipKpi
            label="Lương thực nhận"
            value={payslipFmtVnd(net)}
            big
            colorClass="text-[#1A9A5C]"
            bgClass="bg-[#E8F9F0]"
          />
          <PayrollPayslipKpi label="Tạm ứng" value={payslipFmtVnd(bl.tam_ung)} colorClass="text-[#B76E00]" bgClass="bg-[#FFF7E6]" />
          {!isTheoBuoi ? (
            <PayrollPayslipKpi label="Thưởng" value={payslipFmtVnd(bl.thuong)} colorClass="text-[#3B5BDB]" bgClass="bg-[#EEF3FF]" />
          ) : null}
        </div>
        <div className="mb-3 rounded-xl border border-[#EAEAEA] bg-white px-3 py-3">
          <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#888]">
            <DollarSign size={14} className="text-[#E91E8C]" aria-hidden />
            Thông tin lương
          </div>
          <div className="space-y-2.5">
            <PayslipFieldRow label="Nhân viên">
              <PayslipReadField value={nv.full_name?.trim() ?? ""} />
            </PayslipFieldRow>
            <PayslipFieldRow label="Hình thức">
              <PayslipReadField value={nv.hinh_thuc_tinh_luong?.trim() ?? ""} />
            </PayslipFieldRow>
            <PayslipFieldRow label="Tháng / Năm">
              <PayslipReadField value={ky} />
            </PayslipFieldRow>
            <PayslipFieldRow label="Lương cơ bản">
              <PayslipReadField value={payslipFmtVnd(nv.luong_co_ban)} />
            </PayslipFieldRow>
            {!isTheoBuoi ? (
              <PayslipFieldRow label="Trợ cấp">
                <PayslipReadField value={payslipFmtVnd(nv.tro_cap)} />
              </PayslipFieldRow>
            ) : null}
            {showBhxh ? (
              <PayslipFieldRow label="BHXH">
                <PayslipReadField value={payslipFmtVnd(bhxh)} />
              </PayslipFieldRow>
            ) : null}
            {!isTheoBuoi ? (
              <PayslipFieldRow label="Thưởng trong tháng">
                <PayslipReadField value={payslipFmtVnd(bl.thuong)} />
              </PayslipFieldRow>
            ) : null}
            {!isTheoBuoi ? (
              <PayslipFieldRow label="Tạm ứng trong tháng">
                <PayslipReadField value={payslipFmtVnd(bl.tam_ung)} />
              </PayslipFieldRow>
            ) : null}
            <PayslipFieldRow label="Lương thực nhận">
              <PayslipReadField value={payslipFmtVnd(net)} />
            </PayslipFieldRow>
          </div>
        </div>
        <div className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-3">
          <div className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#888]">
            <Calendar size={14} className="text-[#3B5BDB]" aria-hidden />
            Lịch điểm danh
          </div>
          <div className="space-y-2.5">
            <PayslipFieldRow label="Tổng buổi quy định">
              <PayslipReadField value={bl.tong_buoi_lam_viec_trong_thang != null ? String(bl.tong_buoi_lam_viec_trong_thang) : "—"} />
            </PayslipFieldRow>
            <PayslipFieldRow label="Số buổi đi làm thực tế">
              <PayslipReadField value={bl.so_buoi_lam_viec != null ? String(bl.so_buoi_lam_viec) : "—"} />
            </PayslipFieldRow>
            <PayslipFieldRow label="Số buổi nghỉ trong tháng">
              <PayslipReadField value={bl.so_buoi_nghi_trong_thang != null ? String(bl.so_buoi_nghi_trong_thang) : "—"} />
            </PayslipFieldRow>
            <PayslipFieldRow label="Nghỉ tối đa / năm">
              <PayslipReadField
                value={
                  nv.so_buoi_nghi_toi_da != null && Number.isFinite(Number(nv.so_buoi_nghi_toi_da))
                    ? String(Math.trunc(Number(nv.so_buoi_nghi_toi_da)))
                    : "—"
                }
              />
            </PayslipFieldRow>
            <PayslipFieldRow label="Số buổi nghỉ còn lại">
              <PayslipReadField
                value={(() => {
                  const ceiling =
                    nv.so_buoi_nghi_toi_da != null && Number.isFinite(Number(nv.so_buoi_nghi_toi_da))
                      ? Math.trunc(Number(nv.so_buoi_nghi_toi_da))
                      : null;
                  if (ceiling == null) return "—";
                  const used =
                    bl.tong_so_buoi_nghi_trong_nam != null && Number.isFinite(Number(bl.tong_so_buoi_nghi_trong_nam))
                      ? Math.max(0, Math.trunc(Number(bl.tong_so_buoi_nghi_trong_nam)))
                      : null;
                  if (used == null) return "—";
                  return String(Math.max(0, ceiling - used));
                })()}
              />
            </PayslipFieldRow>
          </div>
        </div>
      </div>
    );
  }
);
PayrollPayslipCard.displayName = "PayrollPayslipCard";
