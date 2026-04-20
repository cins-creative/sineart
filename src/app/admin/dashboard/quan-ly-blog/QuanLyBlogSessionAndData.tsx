import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

import QuanLyBlogPageData from "./QuanLyBlogPageData";

export default async function QuanLyBlogSessionAndData() {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>
        <QuanLyBlogPageData />
      </Suspense>
    </AdminSessionGate>
  );
}
