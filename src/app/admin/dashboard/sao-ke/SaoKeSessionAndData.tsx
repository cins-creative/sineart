import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import SaoKePageData from "./SaoKePageData";

export default async function SaoKeSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <SaoKePageData />
      </Suspense>
    </AdminSessionGate>
  );
}
