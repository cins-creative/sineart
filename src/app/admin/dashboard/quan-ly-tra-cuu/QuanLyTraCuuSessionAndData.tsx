import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyTraCuuPageData from "./QuanLyTraCuuPageData";

export default async function QuanLyTraCuuSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyTraCuuPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
