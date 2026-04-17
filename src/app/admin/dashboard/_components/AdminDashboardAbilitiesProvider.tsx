"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { adminStaffCanDeleteRecords } from "@/lib/admin/staff-mutation-access";

export type AdminDashboardAbilities = {
  /** Theo `hr_nhan_su.vai_tro`: chỉ `quan_ly` và `admin`. */
  canDelete: boolean;
  vaiTro: string | null;
};

const AdminDashboardAbilitiesContext = createContext<AdminDashboardAbilities>({
  canDelete: false,
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
      vaiTro: staffRole,
    }),
    [staffRole],
  );
  return <AdminDashboardAbilitiesContext.Provider value={value}>{children}</AdminDashboardAbilitiesContext.Provider>;
}

export function useAdminDashboardAbilities(): AdminDashboardAbilities {
  return useContext(AdminDashboardAbilitiesContext);
}
