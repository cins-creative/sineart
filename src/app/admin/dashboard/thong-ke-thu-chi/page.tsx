import { redirect } from "next/navigation";

import ThongKeThuChiView from "@/app/admin/dashboard/thong-ke-thu-chi/ThongKeThuChiView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminThongKeThuChiBundle } from "@/lib/data/admin-thong-ke-thu-chi";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminThongKeThuChiPage() {
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

  const bundle = await fetchAdminThongKeThuChiBundle(supabase);
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  return <ThongKeThuChiView rows={bundle.data.rows} />;
}
