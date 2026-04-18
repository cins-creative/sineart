import { redirect } from "next/navigation";

import GiaTriTaiSanView from "@/app/admin/dashboard/gia-tri-tai-san/GiaTriTaiSanView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminTaiSanRows } from "@/lib/data/admin-gia-tri-tai-san";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function GiaTriTaiSanPageData() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const bundle = await fetchAdminTaiSanRows(supabase);
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  return <GiaTriTaiSanView rows={bundle.rows} />;
}
