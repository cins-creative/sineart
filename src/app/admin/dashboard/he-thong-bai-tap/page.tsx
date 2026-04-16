import { redirect } from "next/navigation";

import HeThongBaiTapView from "@/app/admin/dashboard/he-thong-bai-tap/HeThongBaiTapView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminHeThongBaiTapBundle } from "@/lib/data/admin-he-thong-bai-tap";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function HeThongBaiTapAdminPage() {
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

  const bundle = await fetchAdminHeThongBaiTapBundle(supabase);
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  return <HeThongBaiTapView bundle={bundle.data} />;
}
