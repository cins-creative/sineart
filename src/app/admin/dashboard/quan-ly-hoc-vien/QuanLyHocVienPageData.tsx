import { redirect } from "next/navigation";

import QuanLyHocVienBootstrap from "@/app/admin/dashboard/quan-ly-hoc-vien/QuanLyHocVienBootstrap";
import { staffBelongsToTuVanPhong } from "@/lib/admin/dashboard-nav-visibility";
import {
  adminStaffCanEditTrangThaiTuVan,
  adminStaffCanViewSepayTuVanNotifications,
} from "@/lib/admin/staff-mutation-access";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchDhNguyenVongCatalog } from "@/lib/donghocphi/dh-catalog";
import {
  fetchAdminStaffShellPhongTenPhongs,
  fetchAdminStaffShellProfile,
  fetchAdminStaffShellTenBans,
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

  const [profile, phongTenPhongs, tenBans, mktCapRow] = await Promise.all([
    fetchAdminStaffShellProfile(supabase, session.staffId),
    fetchAdminStaffShellPhongTenPhongs(supabase, session.staffId),
    fetchAdminStaffShellTenBans(supabase, session.staffId),
    supabase.from("mkt_home_content").select("htbt_cap_toc").eq("id", 1).maybeSingle(),
  ]);
  const initialHtbtCapToc =
    mktCapRow.data != null &&
    (mktCapRow.data as { htbt_cap_toc?: unknown }).htbt_cap_toc === true;
  const dhpShowExtraVndDiscount =
    (profile.vai_tro ?? "").trim().toLowerCase() === "admin" ||
    staffBelongsToTuVanPhong(phongTenPhongs);

  const canEditTrangThaiTuVan = adminStaffCanEditTrangThaiTuVan({
    vai_tro: profile.vai_tro,
    phongTenPhongs,
    tenBans,
  });
  const showSepayTuVanNotifications = adminStaffCanViewSepayTuVanNotifications({
    vai_tro: profile.vai_tro,
    phongTenPhongs,
  });

  /** Đổi theo từng request RSC (kể cả `router.refresh()`) — client dùng để refetch bundle. */
  // eslint-disable-next-line react-hooks/purity -- `Date.now` cố ý: không cần idempotent giữa các request
  const reloadSignal = Date.now();

  return (
    <QuanLyHocVienBootstrap
      reloadSignal={reloadSignal}
      dhCatalog={dhCatalog}
      adminStaffId={session.staffId}
      dhpShowExtraVndDiscount={dhpShowExtraVndDiscount}
      initialHtbtCapToc={initialHtbtCapToc}
      canEditTrangThaiTuVan={canEditTrangThaiTuVan}
      showSepayTuVanNotifications={showSepayTuVanNotifications}
    />
  );
}
