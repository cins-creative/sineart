import { redirect } from "next/navigation";

import { STAFF_PERSONAL_DASHBOARD_HREF } from "@/lib/admin/dashboard-nav-config";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";

export const dynamic = "force-dynamic";

export default async function HoSoCaNhanRootPage() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");
  redirect(`${STAFF_PERSONAL_DASHBOARD_HREF}/${session.staffId}`);
}
