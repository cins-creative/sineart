import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import LopHocPageData from "./LopHocPageData";

export default async function LopHocSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <LopHocPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
