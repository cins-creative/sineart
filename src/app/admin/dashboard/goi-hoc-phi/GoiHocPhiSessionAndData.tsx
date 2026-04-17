import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import GoiHocPhiPageData from "./GoiHocPhiPageData";

export default async function GoiHocPhiSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <GoiHocPhiPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
