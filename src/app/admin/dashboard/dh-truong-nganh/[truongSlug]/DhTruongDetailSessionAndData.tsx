import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import DhTruongDetailPageData from "./DhTruongDetailPageData";

export default async function DhTruongDetailSessionAndData({
  params,
  searchParams,
}: {
  params: Promise<{ truongSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <DhTruongDetailPageData params={params} searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
