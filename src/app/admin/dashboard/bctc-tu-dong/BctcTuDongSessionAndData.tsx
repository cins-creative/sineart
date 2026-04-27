import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import BctcTuDongPageData from "@/app/admin/dashboard/bctc-tu-dong/BctcTuDongPageData";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

export default async function BctcTuDongSessionAndData({
  namParam,
}: {
  namParam?: string;
}) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <BctcTuDongPageData namParam={namParam} />
      </Suspense>
    </AdminSessionGate>
  );
}
