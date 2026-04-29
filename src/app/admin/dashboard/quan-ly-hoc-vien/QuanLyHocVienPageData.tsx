import { redirect } from "next/navigation";

import QuanLyHocVienBootstrap from "@/app/admin/dashboard/quan-ly-hoc-vien/QuanLyHocVienBootstrap";
import { staffBelongsToTuVanPhong } from "@/lib/admin/dashboard-nav-visibility";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchDhNguyenVongCatalog } from "@/lib/donghocphi/dh-catalog";
import {
  fetchAdminStaffShellPhongTenPhongs,
  fetchAdminStaffShellProfile,
} from "@/lib/data/admin-shell-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function QuanLyHocVienPageData() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const dhRes = await fetchDhNguyenVongCatalog(supabase);
  const dhCatalog = !dhRes.error && dhRes.catalog ? dhRes.catalog : null;

  const [profile, phongTenPhongs] = await Promise.all([
    fetchAdminStaffShellProfile(supabase, session.staffId),
    fetchAdminStaffShellPhongTenPhongs(supabase, session.staffId),
  ]);
  const dhpShowExtraVndDiscount =
    (profile.vai_tro ?? "").trim().toLowerCase() === "admin" ||
    staffBelongsToTuVanPhong(phongTenPhongs);

  /** Đổi theo từng request RSC (kể cả `router.refresh()`) — client dùng để refetch bundle. */
  // eslint-disable-next-line react-hooks/purity -- `Date.now` cố ý: không cần idempotent giữa các request
  const reloadSignal = Date.now();

  return (
    <QuanLyHocVienBootstrap
      reloadSignal={reloadSignal}
      dhCatalog={dhCatalog}
      adminStaffId={session.staffId}
      dhpShowExtraVndDiscount={dhpShowExtraVndDiscount}
    />
  );
}
