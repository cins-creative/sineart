import { SearchConsoleCharts } from "../SearchConsoleCharts";
import {
  OVERVIEW_PERIOD_CUSTOM,
  OVERVIEW_SECTION_SEARCH_CONSOLE,
  type OverviewPeriodSlug,
} from "../overview-routes";

export function OverviewSearchConsolePanel({
  period,
  customFrom,
  customTo,
}: {
  period: OverviewPeriodSlug;
  customFrom: string;
  customTo: string;
}) {
  const prefix = `/admin/dashboard/overview/${OVERVIEW_SECTION_SEARCH_CONSOLE}`;

  return (
    <SearchConsoleCharts
      overviewPeriodSlug={period}
      customFromInitial={period === OVERVIEW_PERIOD_CUSTOM ? customFrom : ""}
      customToInitial={period === OVERVIEW_PERIOD_CUSTOM ? customTo : ""}
      hrefPrefix={prefix}
    />
  );
}
