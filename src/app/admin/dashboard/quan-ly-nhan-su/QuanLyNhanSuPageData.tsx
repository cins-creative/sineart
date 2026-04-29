import { redirect } from "next/navigation";

import QuanLyNhanSuBootstrap from "@/app/admin/dashboard/quan-ly-nhan-su/QuanLyNhanSuBootstrap";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
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

  /** Đổi theo từng request RSC (kể cả `router.refresh()`) — client dùng để refetch bundle. */
  // eslint-disable-next-line react-hooks/purity -- `Date.now` cố ý: không cần idempotent giữa các request
  const reloadSignal = Date.now();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <QuanLyNhanSuBootstrap reloadSignal={reloadSignal} />
    </div>
  );
}
