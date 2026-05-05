import { redirect } from "next/navigation";

import { OVERVIEW_DEFAULT_PATH } from "@/app/admin/dashboard/overview/overview-routes";

export const dynamic = "force-dynamic";

/** Mặc định: tab Marketing + kỳ tháng (`/marketing-data-analysis/thang`). */
export default function AdminDashboardOverviewPage() {
  redirect(OVERVIEW_DEFAULT_PATH);
}
