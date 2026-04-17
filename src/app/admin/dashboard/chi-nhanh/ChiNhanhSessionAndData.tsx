import { Suspense } from "react";

import { AdminDashboardTableSkeleton } from "@/components/skeletons";
import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";

import ChiNhanhPageData from "./ChiNhanhPageData";

export default async function ChiNhanhSessionAndData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <ChiNhanhPageData searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
