import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import KhoaHocEditPageData from "./KhoaHocEditPageData";

type Props = { params: Promise<{ monId: string }> };

export default async function KhoaHocEditSessionAndData({ params }: Props) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton rows={6} />}>
        <KhoaHocEditPageData params={params} />
      </Suspense>
    </AdminSessionGate>
  );
}
