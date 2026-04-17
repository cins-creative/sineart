import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import ReportMktPageData from "./ReportMktPageData";

export default async function ReportMktSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <ReportMktPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
