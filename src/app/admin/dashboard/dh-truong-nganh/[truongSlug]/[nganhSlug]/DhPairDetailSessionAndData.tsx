import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import DhPairDetailPageData from "./DhPairDetailPageData";

export default async function DhPairDetailSessionAndData({
  params,
  searchParams,
}: {
  params: Promise<{ truongSlug: string; nganhSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <DhPairDetailPageData params={params} searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
