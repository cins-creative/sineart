import WebTrafficCharts from "../WebTrafficCharts";
import {
  OVERVIEW_PERIOD_CUSTOM,
  OVERVIEW_SECTION_WEB_TRAFFIC,
  type OverviewPeriodSlug,
} from "../overview-routes";

export function OverviewWebTrafficPanel({
  period,
  customFrom,
  customTo,
}: {
  period: OverviewPeriodSlug;
  customFrom: string;
  customTo: string;
}) {
  const prefix = `/admin/dashboard/overview/${OVERVIEW_SECTION_WEB_TRAFFIC}`;

  return (
    <WebTrafficCharts
      overviewPeriodSlug={period}
      customFromInitial={period === OVERVIEW_PERIOD_CUSTOM ? customFrom : ""}
      customToInitial={period === OVERVIEW_PERIOD_CUSTOM ? customTo : ""}
      hrefPrefix={prefix}
    />
  );
}
