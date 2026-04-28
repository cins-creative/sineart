import { countHocVienDangHoc } from "@/lib/data/admin-qlhv-tinh-trang";
import { fetchAdminQuanLyHocVienBundle } from "@/lib/data/admin-quan-ly-hoc-vien";
import { fetchMkDataAnalysisRows } from "@/lib/data/admin-report-mkt";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import MarketingDataAnalysisCharts from "../MarketingDataAnalysisCharts";

export async function OverviewMarketingPanel() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const [res, hvBundle] = await Promise.all([
    fetchMkDataAnalysisRows(supabase),
    fetchAdminQuanLyHocVienBundle(supabase),
  ]);

  if (!res.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu marketing: {res.error}
      </div>
    );
  }

  const hocVienDangHoc = hvBundle.error
    ? null
    : countHocVienDangHoc(hvBundle.students, hvBundle.enrollments);

  return <MarketingDataAnalysisCharts rows={res.rows} hocVienDangHoc={hocVienDangHoc} />;
}
