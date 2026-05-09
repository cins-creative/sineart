import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyBaiHocVienPageData from "./QuanLyBaiHocVienPageData";
import type { AdminBhvStatusTab } from "@/lib/data/admin-quan-ly-bai-hoc-vien";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  /** Tab từ đường dẫn `/quan-ly-bai-hoc-vien/[tab]` — ưu tiên hơn `?tab=` trong query. */
  routeTab?: AdminBhvStatusTab;
};

export default async function QuanLyBaiHocVienSessionAndData({ searchParams, routeTab }: PageProps) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyBaiHocVienPageData searchParams={searchParams} routeTab={routeTab} />
      </Suspense>
    </AdminSessionGate>
  );
}
