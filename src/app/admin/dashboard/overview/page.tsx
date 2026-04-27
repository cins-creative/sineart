import { fetchAdminBaoCaoTaiChinhRows, rowsToInitialColumns } from "@/lib/data/admin-bao-cao-tai-chinh";
import { countHocVienDangHoc } from "@/lib/data/admin-qlhv-tinh-trang";
import { fetchMkDataAnalysisRows } from "@/lib/data/admin-report-mkt";
import { fetchAdminQuanLyHocVienBundle } from "@/lib/data/admin-quan-ly-hoc-vien";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DashboardOverviewClient from "./DashboardOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardOverviewPage() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="-m-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 md:-m-6">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const [res, hvBundle, bctcBundle] = await Promise.all([
    fetchMkDataAnalysisRows(supabase),
    fetchAdminQuanLyHocVienBundle(supabase),
    fetchAdminBaoCaoTaiChinhRows(supabase),
  ]);

  if (!res.ok) {
    return (
      <div className="-m-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 md:-m-6">
        Không tải được dữ liệu marketing: {res.error}
      </div>
    );
  }

  const hocVienDangHoc = hvBundle.error
    ? null
    : countHocVienDangHoc(hvBundle.students, hvBundle.enrollments);

  const initialBctcColumns = bctcBundle.ok ? rowsToInitialColumns(bctcBundle.rows) : [];
  const bctcLoadError = bctcBundle.ok ? null : bctcBundle.error;

  return (
    <div className="-m-4 flex h-full min-h-0 flex-col md:-m-6">
      <DashboardOverviewClient
        initialRows={res.rows}
        hocVienDangHoc={hocVienDangHoc}
        initialBctcColumns={initialBctcColumns}
        bctcLoadError={bctcLoadError}
      />
    </div>
  );
}
