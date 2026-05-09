import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import DhTuyenSinhNamPageData from "./DhTuyenSinhNamPageData";

export default async function DhTuyenSinhNamSessionAndData({
  params,
  searchParams,
}: {
  params: Promise<{ truongSlug: string; nam: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <DhTuyenSinhNamPageData params={params} searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
