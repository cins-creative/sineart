import GoiHocPhiView from "@/app/admin/dashboard/goi-hoc-phi/GoiHocPhiView";
import { fetchAdminGoiHocPhiBundle } from "@/lib/data/admin-goi-hoc-phi";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function GoiHocPhiPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const bundle = await fetchAdminGoiHocPhiBundle(supabase);
  return <GoiHocPhiView bundle={bundle} />;
}
