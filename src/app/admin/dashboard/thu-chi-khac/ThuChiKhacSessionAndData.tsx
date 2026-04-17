import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import ThuChiKhacPageData from "./ThuChiKhacPageData";

export default async function ThuChiKhacSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <ThuChiKhacPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
