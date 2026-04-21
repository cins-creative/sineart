import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import BinhLuanPageData from "./BinhLuanPageData";

export default async function BinhLuanSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <BinhLuanPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
