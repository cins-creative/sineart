import type { AdminBangTinhLuongListItem, AdminNhanSuRow } from "@/lib/data/admin-quan-ly-nhan-su";

/** LCB / trợ cấp / BHXH / hình thức đã chốt trên phiếu (`hr_bang_tinh_luong`), fallback hồ sơ nếu thiếu. */
export type PayslipSnapshot = {
  hinh_thuc_tinh_luong: string | null;
  luong_co_ban: number | null;
  tro_cap: number | null;
  bhxh: number | null;
};

export function resolvePayslipSnapshot(bl: AdminBangTinhLuongListItem, nv: AdminNhanSuRow): PayslipSnapshot {
  const hinhFromBl = bl.hinh_thuc_tinh_luong?.trim();
  const hinhFromNv = nv.hinh_thuc_tinh_luong?.trim();
  return {
    hinh_thuc_tinh_luong: hinhFromBl || hinhFromNv || null,
    luong_co_ban: bl.luong_co_ban ?? nv.luong_co_ban,
    tro_cap: bl.tro_cap ?? nv.tro_cap,
    bhxh: bl.bhxh ?? nv.bhxh,
  };
}

export function isPayrollTheoBuoi(hinhThuc: string | null | undefined): boolean {
  return hinhThuc?.trim() === "Theo buổi";
}

/** Fulltime = CB + trợ cấp + thưởng − tạm ứng; Theo buổi = CB×buổi + thưởng − tạm ứng. */
export function computePayrollNetSalary(
  snap: PayslipSnapshot,
  bl: Pick<AdminBangTinhLuongListItem, "tam_ung" | "thuong" | "so_buoi_lam_viec">,
): number {
  const theoBuoi = isPayrollTheoBuoi(snap.hinh_thuc_tinh_luong);
  const lcb = snap.luong_co_ban ?? 0;
  const tc = snap.tro_cap ?? 0;
  const tu = bl.tam_ung ?? 0;
  const th = bl.thuong ?? 0;
  const soBuoi = bl.so_buoi_lam_viec ?? 0;
  if (theoBuoi) return Math.round(lcb * soBuoi + th - tu);
  return Math.round(lcb + tc + th - tu);
}
