import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import BaoCaoTaiChinhPageData from "./BaoCaoTaiChinhPageData";

export default async function BaoCaoTaiChinhSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <BaoCaoTaiChinhPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
