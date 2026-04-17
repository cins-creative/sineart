import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import OrderMediaPageData from "./OrderMediaPageData";

export default async function OrderMediaSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <OrderMediaPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
