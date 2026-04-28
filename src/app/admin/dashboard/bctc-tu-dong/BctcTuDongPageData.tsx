import { redirect } from "next/navigation";

import BctcTuDongView from "@/app/admin/dashboard/bctc-tu-dong/BctcTuDongView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { fetchBctcTuDongBundle } from "@/lib/data/bctc-tu-dong";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function BctcTuDongPageData({ namParam }: { namParam?: string }) {
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

  const profile = await fetchAdminStaffShellProfile(supabase, session.staffId);
  const role = (profile.vai_tro ?? "").trim().toLowerCase();
  if (role !== "admin") {
    redirect("/admin/dashboard/overview");
  }

  const cy = new Date().getFullYear();
  const parsed = namParam != null ? parseInt(String(namParam).trim(), 10) : NaN;
  const nam = Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : cy;

  const bundle = await fetchBctcTuDongBundle(supabase, { nam });
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được BCTC tự động: {bundle.error}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BctcTuDongView bundle={bundle.data} />
    </div>
  );
}
