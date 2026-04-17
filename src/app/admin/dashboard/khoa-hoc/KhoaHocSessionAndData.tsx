import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import KhoaHocPageData from "./KhoaHocPageData";

export default async function KhoaHocSessionAndData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <KhoaHocPageData searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
