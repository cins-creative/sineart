import { redirect } from "next/navigation";

import {
  isOverviewSectionSlug,
  OVERVIEW_PERIOD_MONTH,
} from "@/app/admin/dashboard/overview/overview-routes";

type Props = {
  params: Promise<{ section: string }>;
};

/**
 * `/admin/dashboard/overview/marketing-data-analysis` hoặc `.../bctc-tong-quan`
 * không có segment kỳ → mặc định **tháng**.
 */
export default async function OverviewSectionWithoutPeriodPage({ params }: Props) {
  const { section } = await params;
  if (!isOverviewSectionSlug(section)) {
    redirect(`/admin/dashboard/overview/marketing-data-analysis/${OVERVIEW_PERIOD_MONTH}`);
  }
  redirect(`/admin/dashboard/overview/${section}/${OVERVIEW_PERIOD_MONTH}`);
}
