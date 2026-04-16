import { redirect } from "next/navigation";

import QuanLyMediaView from "@/app/admin/dashboard/quan-ly-media/QuanLyMediaView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";

export const dynamic = "force-dynamic";

export default async function QuanLyMediaPage() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  return <QuanLyMediaView />;
}
