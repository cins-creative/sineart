/**
 * Quyền thao tác dữ liệu dashboard theo `hr_nhan_su.vai_tro`.
 * - `nhan_vien`: thêm / sửa (không xóa bản ghi qua các action delete của admin).
 * - `quan_ly`, `admin`: thêm / sửa / xóa.
 * Menu theo phòng ban (`resolveDashboardNavAccess`) giữ nguyên — không gắn vào file này.
 */

export const ADMIN_DELETE_FORBIDDEN_MSG =
  "Tài khoản không có quyền xóa dữ liệu. Chỉ quản lý hoặc admin được xóa.";

/** Chuẩn hóa để so khớp giá trị lưu DB (vd. `quan_ly`, `nhan_vien`, `admin`). */
export function normalizeStaffVaiTro(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Được gọi các server action `delete*` và UI nút xóa. */
export function adminStaffCanDeleteRecords(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly";
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

/** Trang Agent tư vấn (`/admin/agent`) — chỉ admin & quản lý. */
export function adminStaffCanAccessAgentPage(vaiTro: string | null | undefined): boolean {
  const v = normalizeStaffVaiTro(vaiTro);
  return v === "admin" || v === "quan_ly";
}
