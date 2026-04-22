import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyTrangChuPageData from "./QuanLyTrangChuPageData";

export default async function QuanLyTrangChuSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyTrangChuPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
