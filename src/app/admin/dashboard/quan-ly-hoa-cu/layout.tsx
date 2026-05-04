import { Suspense } from "react";

import AdminSessionGate from "@/app/admin/dashboard/_components/AdminSessionGate";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";

export default function QuanLyHoaCuLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionGate>
      <Suspense fallback={<AdminDashboardTableSkeleton />}>{children}</Suspense>
    </AdminSessionGate>
  );
}
