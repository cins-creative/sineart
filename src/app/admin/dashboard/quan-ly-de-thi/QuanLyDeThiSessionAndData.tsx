import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyDeThiPageData from "./QuanLyDeThiPageData";

export default async function QuanLyDeThiSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyDeThiPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
