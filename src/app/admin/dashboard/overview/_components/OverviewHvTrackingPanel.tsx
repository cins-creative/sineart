import HvEnrollmentTrackingCharts from "../HvEnrollmentTrackingCharts";
import {
  OVERVIEW_PERIOD_CUSTOM,
  OVERVIEW_SECTION_HV_TRACKING,
  type OverviewPeriodSlug,
} from "../overview-routes";

export function OverviewHvTrackingPanel({
  period,
  customFrom,
  customTo,
}: {
  period: OverviewPeriodSlug;
  customFrom: string;
  customTo: string;
}) {
  const prefix = `/admin/dashboard/overview/${OVERVIEW_SECTION_HV_TRACKING}`;

  return (
    <HvEnrollmentTrackingCharts
      overviewPeriodSlug={period}
      customFromInitial={period === OVERVIEW_PERIOD_CUSTOM ? customFrom : ""}
      customToInitial={period === OVERVIEW_PERIOD_CUSTOM ? customTo : ""}
      hvTrackingHrefPrefix={prefix}
    />
  );
}
