import {
  fetchAdminBaoCaoTaiChinhMeta,
  fetchAdminBaoCaoTaiChinhRows,
  fetchAdminBaoCaoTaiChinhRowsByIds,
  rowsToInitialColumns,
} from "@/lib/data/admin-bao-cao-tai-chinh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import BctcOverviewCharts from "../BctcOverviewCharts";
import { filterBctcMetaIdsForOverviewPeriod } from "../overview-bctc-period";
import {
  OVERVIEW_PERIOD_ALL,
  OVERVIEW_PERIOD_CUSTOM,
  type OverviewPeriodSlug,
} from "../overview-routes";

function BctcErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-950">
      Không tải được báo cáo tài chính: <span className="font-semibold">{message}</span>
    </div>
  );
}

export async function OverviewBctcPanel({ period }: { period: OverviewPeriodSlug }) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  let bctcBundle: Awaited<ReturnType<typeof fetchAdminBaoCaoTaiChinhRows>>;
  let usedPartial = false;

  if (period === OVERVIEW_PERIOD_ALL || period === OVERVIEW_PERIOD_CUSTOM) {
    bctcBundle = await fetchAdminBaoCaoTaiChinhRows(supabase);
  } else {
    const meta = await fetchAdminBaoCaoTaiChinhMeta(supabase);
    if (!meta.ok) {
      bctcBundle = { ok: false, error: meta.error };
    } else {
      const ids = filterBctcMetaIdsForOverviewPeriod(meta.rows, period);
      bctcBundle = await fetchAdminBaoCaoTaiChinhRowsByIds(supabase, ids);
      usedPartial = true;
    }
  }

  const initialBctcColumns = bctcBundle.ok ? rowsToInitialColumns(bctcBundle.rows) : [];
  const bctcLoadError = bctcBundle.ok ? null : bctcBundle.error;
  const deferFullBctcHydration = bctcBundle.ok && usedPartial;

  if (bctcLoadError) {
    return <BctcErrorBanner message={bctcLoadError} />;
  }

  return (
    <BctcOverviewCharts
      key={`bctc-manual-${period}`}
      source="manual"
      columns={initialBctcColumns}
      deferFullBctcHydration={deferFullBctcHydration}
    />
  );
}
