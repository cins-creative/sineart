import { Suspense } from "react";
import { redirect } from "next/navigation";

import { OverviewBctcPanel } from "@/app/admin/dashboard/overview/_components/OverviewBctcPanel";
import { OverviewBctcPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewBctcPanel.skeleton";
import { OverviewHvTrackingPanel } from "@/app/admin/dashboard/overview/_components/OverviewHvTrackingPanel";
import { OverviewHvTrackingPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewHvTrackingPanel.skeleton";
import { OverviewMarketingPanel } from "@/app/admin/dashboard/overview/_components/OverviewMarketingPanel";
import { OverviewMarketingPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewMarketingPanel.skeleton";
import DashboardOverviewClient from "@/app/admin/dashboard/overview/DashboardOverviewClient";
import {
  isOverviewPeriodSlug,
  isOverviewSectionSlug,
  OVERVIEW_DEFAULT_PATH,
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
        marketingContent={
          <Suspense fallback={<OverviewMarketingPanelSkeleton />}>
            <OverviewMarketingPanel period={period} customFrom={customFrom} customTo={customTo} />
          </Suspense>
        }
        bctcContent={
          <Suspense fallback={<OverviewBctcPanelSkeleton />}>
            <OverviewBctcPanel period={period} />
          </Suspense>
        }
        hvTrackingContent={
          <Suspense fallback={<OverviewHvTrackingPanelSkeleton />}>
            <OverviewHvTrackingPanel period={period} customFrom={customFrom} customTo={customTo} />
          </Suspense>
        }
      />
    </div>
  );
}
