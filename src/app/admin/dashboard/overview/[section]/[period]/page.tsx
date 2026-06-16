import { Suspense } from "react";
import { redirect } from "next/navigation";

import { OverviewBctcAutoPanel } from "@/app/admin/dashboard/overview/_components/OverviewBctcAutoPanel";
import { OverviewBctcPanel } from "@/app/admin/dashboard/overview/_components/OverviewBctcPanel";
import { OverviewBctcPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewBctcPanel.skeleton";
import { OverviewHvTrackingPanel } from "@/app/admin/dashboard/overview/_components/OverviewHvTrackingPanel";
import { OverviewHvTrackingPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewHvTrackingPanel.skeleton";
import { OverviewMetaInsightsPanel } from "@/app/admin/dashboard/overview/_components/OverviewMetaInsightsPanel";
import { OverviewMetaInsightsPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewMetaInsightsPanel.skeleton";
import { OverviewSearchConsolePanel } from "@/app/admin/dashboard/overview/_components/OverviewSearchConsolePanel";
import { OverviewSearchConsolePanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewSearchConsolePanel.skeleton";
import { OverviewWebTrafficPanel } from "@/app/admin/dashboard/overview/_components/OverviewWebTrafficPanel";
import { OverviewWebTrafficPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewWebTrafficPanel.skeleton";
import DashboardOverviewClient from "@/app/admin/dashboard/overview/DashboardOverviewClient";
import {
  isOverviewPeriodSlug,
  isOverviewSectionSlug,
  OVERVIEW_DEFAULT_PATH,
  OVERVIEW_SECTION_MARKETING,
  OVERVIEW_SECTION_WEB_TRAFFIC,
  OVERVIEW_PERIOD_MONTH,
  type OverviewPeriodSlug,
  type OverviewSectionSlug,
} from "@/app/admin/dashboard/overview/overview-routes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ section: string; period: string }>;
  searchParams: Promise<{ tu?: string; den?: string }>;
};

export default async function AdminDashboardOverviewSegmentPage({ params, searchParams }: PageProps) {
  const { section: secRaw, period: perRaw } = await params;
  const sp = await searchParams;

  if (secRaw === OVERVIEW_SECTION_MARKETING) {
    redirect(`/admin/dashboard/overview/${OVERVIEW_SECTION_WEB_TRAFFIC}/${perRaw || OVERVIEW_PERIOD_MONTH}`);
  }

  if (!isOverviewSectionSlug(secRaw) || !isOverviewPeriodSlug(perRaw)) {
    redirect(OVERVIEW_DEFAULT_PATH);
  }

  const section = secRaw as OverviewSectionSlug;
  const period = perRaw as OverviewPeriodSlug;

  const customFrom = typeof sp.tu === "string" ? sp.tu : "";
  const customTo = typeof sp.den === "string" ? sp.den : "";

  return (
    <div className="-m-4 flex h-full min-h-0 flex-col md:-m-6">
      <DashboardOverviewClient
        section={section}
        period={period}
        bctcContent={
          <Suspense fallback={<OverviewBctcPanelSkeleton />}>
            <OverviewBctcPanel period={period} />
          </Suspense>
        }
        bctcAutoContent={
          <Suspense fallback={<OverviewBctcPanelSkeleton />}>
            <OverviewBctcAutoPanel period={period} />
          </Suspense>
        }
        hvTrackingContent={
          <Suspense fallback={<OverviewHvTrackingPanelSkeleton />}>
            <OverviewHvTrackingPanel period={period} customFrom={customFrom} customTo={customTo} />
          </Suspense>
        }
        webTrafficContent={
          <Suspense fallback={<OverviewWebTrafficPanelSkeleton />}>
            <OverviewWebTrafficPanel period={period} customFrom={customFrom} customTo={customTo} />
          </Suspense>
        }
        searchConsoleContent={
          <Suspense fallback={<OverviewSearchConsolePanelSkeleton />}>
            <OverviewSearchConsolePanel period={period} customFrom={customFrom} customTo={customTo} />
          </Suspense>
        }
        metaInsightsContent={
          <Suspense fallback={<OverviewMetaInsightsPanelSkeleton />}>
            <OverviewMetaInsightsPanel period={period} customFrom={customFrom} customTo={customTo} />
          </Suspense>
        }
      />
    </div>
  );
}
