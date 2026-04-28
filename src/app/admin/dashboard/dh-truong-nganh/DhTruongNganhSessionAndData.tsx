import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import DhTruongNganhPageData from "./DhTruongNganhPageData";

export default async function DhTruongNganhSessionAndData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <DhTruongNganhPageData searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
