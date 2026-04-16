import { redirect } from "next/navigation";

import BaoCaoTaiChinhView from "@/app/admin/dashboard/bao-cao-tai-chinh/BaoCaoTaiChinhView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminBaoCaoTaiChinhRows, rowsToInitialColumns } from "@/lib/data/admin-bao-cao-tai-chinh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminBaoCaoTaiChinhPage() {
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

  const bundle = await fetchAdminBaoCaoTaiChinhRows(supabase);
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  const initialColumns = rowsToInitialColumns(bundle.rows);
  return <BaoCaoTaiChinhView initialColumns={initialColumns} />;
}
