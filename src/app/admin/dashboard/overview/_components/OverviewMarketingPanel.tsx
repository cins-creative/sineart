import {
  fetchMkDataAnalysisRows,
  fetchMkDataAnalysisRowsInRange,
} from "@/lib/data/admin-report-mkt";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import MarketingDataAnalysisCharts from "../MarketingDataAnalysisCharts";
import {
  normalizeCustomRange,
  resolveOverviewActiveRange,
  type MkDatePreset,
} from "../marketing-date-range";
import {
  OVERVIEW_PERIOD_CUSTOM,
  overviewPeriodSlugToMkPreset,
  type OverviewPeriodSlug,
} from "../overview-routes";

function mkActiveRangeForFetch(
  preset: MkDatePreset,
  customFrom: string,
  customTo: string,
): { startYmd: string; endYmd: string } | null {
  if (preset === "all") return null;
  if (preset === "custom") return normalizeCustomRange(customFrom, customTo);
  return resolveOverviewActiveRange(preset, "", "");
}

export async function OverviewMarketingPanel({
  period,
  customFrom,
  customTo,
}: {
  period: OverviewPeriodSlug;
  customFrom: string;
  customTo: string;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const preset = overviewPeriodSlugToMkPreset(period);
  const activeRange = mkActiveRangeForFetch(
    preset,
    period === OVERVIEW_PERIOD_CUSTOM ? customFrom : "",
    period === OVERVIEW_PERIOD_CUSTOM ? customTo : "",
  );

  let mkRes =
    preset === "all"
      ? await fetchMkDataAnalysisRows(supabase)
      : activeRange
        ? await fetchMkDataAnalysisRowsInRange(supabase, activeRange.startYmd, activeRange.endYmd)
        : await fetchMkDataAnalysisRows(supabase);

  if (!mkRes.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu marketing: {mkRes.error}
      </div>
    );
  }

  const mkPrefix = "/admin/dashboard/overview/marketing-data-analysis";

  return (
    <MarketingDataAnalysisCharts
      rows={mkRes.rows}
      hocVienDangHoc={null}
      marketingOverviewHrefPrefix={mkPrefix}
      overviewPeriodSlug={period}
      customFromInitial={period === OVERVIEW_PERIOD_CUSTOM ? customFrom : ""}
      customToInitial={period === OVERVIEW_PERIOD_CUSTOM ? customTo : ""}
      deferFullMkHydration={preset !== "all"}
    />
  );
}
