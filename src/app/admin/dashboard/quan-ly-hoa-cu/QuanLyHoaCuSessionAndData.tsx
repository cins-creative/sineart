import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyHoaCuPageData from "./QuanLyHoaCuPageData";

export default async function QuanLyHoaCuSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyHoaCuPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
