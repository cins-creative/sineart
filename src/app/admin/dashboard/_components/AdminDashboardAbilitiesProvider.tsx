"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  adminStaffCanDeleteNhanSuRecord,
  adminStaffCanDeleteRecords,
  adminStaffCanEditThiThuKy,
  adminStaffCanEditThuChiKhacPhieu,
  adminStaffCanViewBctcDetailCharts,
  adminStaffCanViewGiaTriTaiSanOverviewTab,
} from "@/lib/admin/staff-mutation-access";

export type AdminDashboardAbilities = {
  /** Theo `hr_nhan_su.vai_tro`: chỉ `quan_ly` và `admin`. */
  canDelete: boolean;
  /** Xóa nhân sự (`hr_nhan_su`) — chỉ `admin`. */
  canDeleteNhanSu: boolean;
  /** Tạo / sửa kỳ thi thử — `nhan_vien`, `quan_ly`, `admin`. */
  canEditThiThuKy: boolean;
  /** Sửa phiếu Thu chi khác — chỉ `quan_ly` và `admin`. */
  canEditThuChiKhacPhieu: boolean;
  /** Tab overview «BCTC chi tiết» — chỉ `quan_ly` và `admin`. */
  canViewBctcDetail: boolean;
  /** Tab overview «Giá trị tài sản» — chỉ `admin`. */
  canViewGiaTriTaiSanOverview: boolean;
  vaiTro: string | null;
};

const AdminDashboardAbilitiesContext = createContext<AdminDashboardAbilities>({
  canDelete: false,
  canDeleteNhanSu: false,
  canEditThiThuKy: false,
  canEditThuChiKhacPhieu: false,
  canViewBctcDetail: false,
  canViewGiaTriTaiSanOverview: false,
  vaiTro: null,
});

export function AdminDashboardAbilitiesProvider({
  staffRole,
  children,
}: {
  staffRole: string | null;
  children: ReactNode;
}) {
  const value = useMemo<AdminDashboardAbilities>(
    () => ({
      canDelete: adminStaffCanDeleteRecords(staffRole),
      canDeleteNhanSu: adminStaffCanDeleteNhanSuRecord(staffRole),
      canEditThiThuKy: adminStaffCanEditThiThuKy(staffRole),
      canEditThuChiKhacPhieu: adminStaffCanEditThuChiKhacPhieu(staffRole),
      canViewBctcDetail: adminStaffCanViewBctcDetailCharts(staffRole),
      canViewGiaTriTaiSanOverview: adminStaffCanViewGiaTriTaiSanOverviewTab(staffRole),
      vaiTro: staffRole,
    }),
    [staffRole],
  );
  return <AdminDashboardAbilitiesContext.Provider value={value}>{children}</AdminDashboardAbilitiesContext.Provider>;
}

export function useAdminDashboardAbilities(): AdminDashboardAbilities {
  return useContext(AdminDashboardAbilitiesContext);
}
