import { fetchAdminBaoCaoTaiChinhRows, rowsToInitialColumns } from "@/lib/data/admin-bao-cao-tai-chinh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import BctcOverviewCharts from "../BctcOverviewCharts";

function BctcErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-950">
      Không tải được báo cáo tài chính: <span className="font-semibold">{message}</span>
    </div>
  );
}

export async function OverviewBctcPanel() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const bctcBundle = await fetchAdminBaoCaoTaiChinhRows(supabase);
  const initialBctcColumns = bctcBundle.ok ? rowsToInitialColumns(bctcBundle.rows) : [];
  const bctcLoadError = bctcBundle.ok ? null : bctcBundle.error;

  if (bctcLoadError) {
    return <BctcErrorBanner message={bctcLoadError} />;
  }

  return <BctcOverviewCharts key="bctc-summary" columns={initialBctcColumns} />;
}
