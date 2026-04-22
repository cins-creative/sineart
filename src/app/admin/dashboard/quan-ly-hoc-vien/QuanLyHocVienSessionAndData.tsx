import { Suspense } from "react";

import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyHocVienPageData from "./QuanLyHocVienPageData";

export default async function QuanLyHocVienSessionAndData() {
  return (
    <Suspense fallback={<AdminDashboardTableSkeleton />}>
      <QuanLyHocVienPageData />
    </Suspense>
  );
}
