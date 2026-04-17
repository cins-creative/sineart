import { redirect } from "next/navigation";

import QuanLyNhanSuView from "@/app/admin/dashboard/quan-ly-nhan-su/QuanLyNhanSuView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminQuanLyNhanSuBundle } from "@/lib/data/admin-quan-ly-nhan-su";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function QuanLyNhanSuPageData() {
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

  const bundle = await fetchAdminQuanLyNhanSuBundle(supabase);
  if (bundle.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  return (
    <QuanLyNhanSuView
      staff={bundle.staff}
      chiNhanhById={bundle.chiNhanhById}
      banById={bundle.banById}
      phongBanByStaffId={bundle.phongBanByStaffId}
      phongIdsByStaffId={bundle.phongIdsByStaffId}
      allPhongOptions={bundle.allPhongOptions}
      phongToBanId={bundle.phongToBanId}
      banIdsByStaffId={bundle.banIdsByStaffId}
      bangTinhLuongByStaffId={bundle.bangTinhLuongByStaffId}
      usedMinimalSelect={bundle.usedMinimalSelect}
    />
  );
}
