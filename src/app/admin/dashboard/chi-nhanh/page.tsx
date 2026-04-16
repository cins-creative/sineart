import { redirect } from "next/navigation";

import ChiNhanhView from "@/app/admin/dashboard/chi-nhanh/ChiNhanhView";
import { fetchAdminChiNhanhRows } from "@/lib/data/admin-chi-nhanh";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function ChiNhanhPage() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ
        liệu.
      </div>
    );
  }

  const { rows, error, usedMinimalSelect } = await fetchAdminChiNhanhRows(supabase);

  return (
    <ChiNhanhView rows={rows} loadError={error} usedMinimalSelect={usedMinimalSelect} />
  );
}
