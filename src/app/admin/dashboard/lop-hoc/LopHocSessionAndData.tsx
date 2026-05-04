import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import LopHocPageData from "./LopHocPageData";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function LopHocSessionAndData({ searchParams }: Props) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <LopHocPageData searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
