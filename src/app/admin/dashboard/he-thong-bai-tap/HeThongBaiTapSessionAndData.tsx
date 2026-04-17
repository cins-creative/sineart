import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import HeThongBaiTapPageData from "./HeThongBaiTapPageData";

export default async function HeThongBaiTapSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <HeThongBaiTapPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
