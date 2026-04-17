import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyBaiHocVienPageData from "./QuanLyBaiHocVienPageData";

type PageProps = {
  searchParams?: Promise<{ tab?: string | string[] }>;
};

export default async function QuanLyBaiHocVienSessionAndData({ searchParams }: PageProps) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyBaiHocVienPageData searchParams={searchParams} />
      </Suspense>
    </AdminSessionGate>
  );
}
