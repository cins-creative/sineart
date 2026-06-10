import MetaInsightsCharts from "../MetaInsightsCharts";
import {
  OVERVIEW_PERIOD_CUSTOM,
  OVERVIEW_SECTION_META_INSIGHTS,
  type OverviewPeriodSlug,
} from "../overview-routes";

export function OverviewMetaInsightsPanel({
  period,
  customFrom,
  customTo,
}: {
  period: OverviewPeriodSlug;
  customFrom: string;
  customTo: string;
}) {
  const prefix = `/admin/dashboard/overview/${OVERVIEW_SECTION_META_INSIGHTS}`;

  return (
    <MetaInsightsCharts
      overviewPeriodSlug={period}
      customFromInitial={period === OVERVIEW_PERIOD_CUSTOM ? customFrom : ""}
      customToInitial={period === OVERVIEW_PERIOD_CUSTOM ? customTo : ""}
      hrefPrefix={prefix}
    />
  );
}
