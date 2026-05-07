import Link from "next/link";
import { redirect } from "next/navigation";

import StaffPersonalDashboardView from "@/app/admin/dashboard/ho-so-ca-nhan/[staffId]/StaffPersonalDashboardView";
import { adminStaffCanViewStaffPersonalDashboard } from "@/lib/admin/staff-mutation-access";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { fetchAdminStaffPersonalDashboard } from "@/lib/data/admin-staff-personal-dashboard";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function HoSoCaNhanStaffPage({
  params,
}: Readonly<{
  params: Promise<{ staffId: string }>;
}>) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const { staffId: raw } = await params;
  const targetId = Number(raw);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Mã nhân sự không hợp lệ.</p>
      </div>
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
        </div>
      </div>
    );
  }

  const viewerProfile = await fetchAdminStaffShellProfile(supabase, session.staffId);
  if (
    !adminStaffCanViewStaffPersonalDashboard(viewerProfile.vai_tro, session.staffId, targetId)
  ) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-black/[0.1] bg-white p-6 text-sm shadow-sm">
          <p className="font-semibold text-black/90">Không có quyền xem hồ sơ này.</p>
          <p className="mt-2 text-black/55">Chỉ chính nhân sự đó hoặc tài khoản quản lý / admin mới xem được.</p>
          <Link
            href="/admin/dashboard/overview"
            className="mt-4 inline-flex rounded-xl border border-black/[0.1] bg-black/[0.03] px-4 py-2 text-sm font-medium text-black/85 transition hover:bg-black/[0.06]"
          >
            Về Tổng quan
          </Link>
        </div>
      </div>
    );
  }

  const { data, error } = await fetchAdminStaffPersonalDashboard(supabase, targetId);
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          {error ?? "Không tải được hồ sơ nhân sự."}
        </div>
      </div>
    );
  }

  const isSelf = session.staffId === targetId;

  return (
    <div className="-m-4 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden md:-m-6">
      <StaffPersonalDashboardView payload={data} isSelf={isSelf} />
    </div>
  );
}
