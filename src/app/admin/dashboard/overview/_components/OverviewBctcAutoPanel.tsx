import {
  fetchAdminBaoCaoTaiChinhMeta,
  fetchAdminBaoCaoTaiChinhRows,
  rowsToInitialColumns,
} from "@/lib/data/admin-bao-cao-tai-chinh";
import {
  fetchBctcTuDongOverviewColumns,
  yearsForTuDongOverview,
} from "@/lib/data/bctc-tu-dong-overview";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import BctcOverviewCharts from "../BctcOverviewCharts";
import {
  OVERVIEW_PERIOD_ALL,
  OVERVIEW_PERIOD_CUSTOM,
  type OverviewPeriodSlug,
} from "../overview-routes";

function BctcTuDongErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-950">
      Không tải được BCTC nguồn tự động: <span className="font-semibold">{message}</span>
    </div>
  );
}

export async function OverviewBctcAutoPanel({ period }: { period: OverviewPeriodSlug }) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  let metaRowsForYears: { nam: string }[] = [];

  if (period !== OVERVIEW_PERIOD_ALL && period !== OVERVIEW_PERIOD_CUSTOM) {
    const meta = await fetchAdminBaoCaoTaiChinhMeta(supabase);
    if (meta.ok) metaRowsForYears = meta.rows;
  } else {
    const full = await fetchAdminBaoCaoTaiChinhRows(supabase);
    if (full.ok) {
      metaRowsForYears = rowsToInitialColumns(full.rows).map((c) => ({ nam: c.nam }));
    }
  }

  const tuDongYears = yearsForTuDongOverview(metaRowsForYears);
  const tuDongBundle = await fetchBctcTuDongOverviewColumns(supabase, tuDongYears);

  if (!tuDongBundle.ok) {
    return <BctcTuDongErrorBanner message={tuDongBundle.error} />;
  }

  return (
    <BctcOverviewCharts
      key={`bctc-auto-${period}`}
      source="auto"
      columns={tuDongBundle.columns}
    />
  );
}
