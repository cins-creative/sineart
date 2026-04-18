import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Trang gốc dashboard chuyển tới Tổng quan (tab Marketing & BCTC). */
export default function AdminDashboardRootPage() {
  redirect("/admin/dashboard/overview");
}
