import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import ThongKeThuChiPageData from "./ThongKeThuChiPageData";

export default async function ThongKeThuChiSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <ThongKeThuChiPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
