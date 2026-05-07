/**
 * Quyền thao tác dữ liệu dashboard theo `hr_nhan_su.vai_tro`.
 * - `nhan_vien`: thêm / sửa (không xóa bản ghi qua các action delete của admin).
 * - `quan_ly`, `admin`: thêm / sửa / xóa.
 * Menu theo phòng ban (`resolveDashboardNavAccess`) giữ nguyên — không gắn vào file này.
 */

import {
  staffBelongsToTuVanPhong,
  staffBelongsToVanHanhBan,
  staffBelongsToVanHanhPhong,
} from "@/lib/admin/dashboard-nav-visibility";

export const ADMIN_DELETE_FORBIDDEN_MSG =
  "Tài khoản không có quyền xóa dữ liệu. Chỉ quản lý hoặc admin được xóa.";

/** Xóa bản ghi `hr_nhan_su` — chỉ `admin` (không gồm quản lý). */
export const NHAN_SU_DELETE_FORBIDDEN_MSG = "Chỉ tài khoản admin mới được xóa nhân sự.";

/**
 * Chuẩn hóa để so khớp giá trị lưu DB (vd. `quan_ly`, `nhan_vien`, `admin`).
 * Gộp khoảng trắng → `_` để `nhan vien` / `quan ly` vẫn khớp.
 */
export function normalizeStaffVaiTro(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Được gọi các server action `delete*` và UI nút xóa. */
export function adminStaffCanDeleteRecords(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly";
}

/** Xóa hồ sơ nhân sự trên dashboard Quản lý nhân sự — chỉ admin. */
export function adminStaffCanDeleteNhanSuRecord(vaiTro: string | null | undefined): boolean {
  return normalizeStaffVaiTro(vaiTro) === "admin";
}

/** Sửa phiếu Thu chi khác (`tc_thu_chi_khac`) — chỉ `quan_ly`, `admin`. */
export function adminStaffCanEditThuChiKhacPhieu(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly";
}

export const THU_CHI_KHAC_EDIT_FORBIDDEN_MSG =
  "Chỉ quản lý hoặc admin được sửa hoặc xóa phiếu thu chi khác.";

/** Tab «BCTC chi tiết» trên dashboard tổng quan — chỉ admin & quản lý. */
export function adminStaffCanViewBctcDetailCharts(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly";
}

/** Tab Overview «Giá trị tài sản» — chỉ admin. */
export function adminStaffCanViewGiaTriTaiSanOverviewTab(vaiTro: string | null | undefined): boolean {
  return normalizeStaffVaiTro(vaiTro) === "admin";
}

/** Tạo / sửa kỳ thi thử (`thi_thu_ky_thi`) — `nhan_vien`, `quan_ly`, `admin` (+ alias `nhanvien`). */
export function adminStaffCanEditThiThuKy(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly" || v === "nhan_vien" || v === "nhanvien";
}

export const THI_THU_KY_EDIT_FORBIDDEN_MSG =
  "Tài khoản không có quyền tạo hoặc sửa kỳ thi. Chỉ nhân viên, quản lý hoặc admin.";

/** Trang Agent tư vấn (`/admin/agent`) — admin, quản lý, hoặc vai trò tư vấn (`tu_van`). */
export function adminStaffCanAccessAgentPage(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly" || v === "tu_van";
}

/** Xem dashboard hồ sơ `/admin/dashboard/ho-so-ca-nhan/[id]` — bản thân hoặc admin/quản lý. */
export function adminStaffCanViewStaffPersonalDashboard(
  vaiTro: string | null | undefined,
  viewerStaffId: number,
  targetStaffId: number,
): boolean {
  if (Number(viewerStaffId) === Number(targetStaffId)) return true;
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly";
}

/**
 * Chỉnh `ql_thong_tin_hoc_vien.trang_thai_tu_van` — admin; hoặc phòng «Tư vấn»; hoặc phòng tên Vận hành/Điều hành;
 * hoặc ban «Vận hành»/«Điều hành» (qua `hr_nhan_su.ban` / phòng → `hr_ban.ten_ban`).
 */
export function adminStaffCanEditTrangThaiTuVan(staff: {
  vai_tro?: string | null;
  phongTenPhongs: readonly string[];
  tenBans?: readonly string[];
}): boolean {
  if (normalizeStaffVaiTro(staff.vai_tro) === "admin") return true;
  if (staffBelongsToTuVanPhong(staff.phongTenPhongs)) return true;
  if (staffBelongsToVanHanhPhong(staff.phongTenPhongs)) return true;
  if (staff.tenBans?.length && staffBelongsToVanHanhBan(staff.tenBans)) return true;
  return false;
}
