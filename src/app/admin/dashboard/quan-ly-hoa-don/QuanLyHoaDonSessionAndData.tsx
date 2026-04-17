import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyHoaDonPageData from "./QuanLyHoaDonPageData";

export default async function QuanLyHoaDonSessionAndData({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyHoaDonPageData searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
