import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import DhTruongNganhPageData from "./DhTruongNganhPageData";

export default async function DhTruongNganhSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <DhTruongNganhPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
