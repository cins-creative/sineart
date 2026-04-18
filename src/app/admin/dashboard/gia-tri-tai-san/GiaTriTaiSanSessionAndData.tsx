import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import GiaTriTaiSanPageData from "./GiaTriTaiSanPageData";

export default async function GiaTriTaiSanSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <GiaTriTaiSanPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
