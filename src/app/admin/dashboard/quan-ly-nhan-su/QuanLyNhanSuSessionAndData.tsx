import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyNhanSuPageData from "./QuanLyNhanSuPageData";

export default async function QuanLyNhanSuSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyNhanSuPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
