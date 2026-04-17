import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyMediaPageData from "./QuanLyMediaPageData";

export default async function QuanLyMediaSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyMediaPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
