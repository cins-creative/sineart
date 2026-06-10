import { redirect } from "next/navigation";

import {
  isOverviewSectionSlug,
  OVERVIEW_DEFAULT_PATH,
  OVERVIEW_PERIOD_MONTH,
  OVERVIEW_SECTION_MARKETING,
  OVERVIEW_SECTION_WEB_TRAFFIC,
} from "@/app/admin/dashboard/overview/overview-routes";

type Props = {
  params: Promise<{ section: string }>;
};

/** Segment thiếu kỳ → mặc định tháng. URL marketing cũ → traffic-web. */
export default async function OverviewSectionWithoutPeriodPage({ params }: Props) {
  const { section } = await params;

  if (section === OVERVIEW_SECTION_MARKETING) {
    redirect(`/admin/dashboard/overview/${OVERVIEW_SECTION_WEB_TRAFFIC}/${OVERVIEW_PERIOD_MONTH}`);
  }

  if (!isOverviewSectionSlug(section)) {
    redirect(OVERVIEW_DEFAULT_PATH);
  }

  redirect(`/admin/dashboard/overview/${section}/${OVERVIEW_PERIOD_MONTH}`);
}
