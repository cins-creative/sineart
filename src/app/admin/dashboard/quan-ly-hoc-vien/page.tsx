import { redirect } from "next/navigation";

import QuanLyHocVienView from "@/app/admin/dashboard/quan-ly-hoc-vien/QuanLyHocVienView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  fetchAdminQuanLyHocVienBundle,
  type AdminQlhvBaiTapBrief,
} from "@/lib/data/admin-quan-ly-hoc-vien";
import { fetchDhNguyenVongCatalog, type DhpDhCatalog } from "@/lib/donghocphi/dh-catalog";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminQuanLyHocVienPage() {
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

  const [bundle, dhRes] = await Promise.all([
    fetchAdminQuanLyHocVienBundle(supabase),
    fetchDhNguyenVongCatalog(supabase),
  ]);
  const dhCatalog: DhpDhCatalog | null = !dhRes.error && dhRes.catalog ? dhRes.catalog : null;
  if (bundle.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  const lopOptions = Object.values(bundle.lopById)
    .map((l) => ({
      id: l.id,
      name: l.class_full_name || l.class_name || `Lớp #${l.id}`,
      mon_hoc: l.mon_hoc,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const baiTapById: Record<string, AdminQlhvBaiTapBrief> = {};
  for (const [k, v] of Object.entries(bundle.baiTapById)) {
    baiTapById[k] = v;
  }

  return (
    <QuanLyHocVienView
      students={bundle.students}
      enrollments={bundle.enrollments}
      lopOptions={lopOptions}
      baiTapById={baiTapById}
      truongNganhByHvId={bundle.truongNganhByHvId}
      dhCatalog={dhCatalog}
      adminStaffId={session.staffId}
    />
  );
}
