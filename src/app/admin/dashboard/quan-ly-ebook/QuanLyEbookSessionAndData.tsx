import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyEbookPageData from "./QuanLyEbookPageData";

export default async function QuanLyEbookSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyEbookPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
