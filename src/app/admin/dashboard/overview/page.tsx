import { Suspense } from "react";

import { OverviewBctcPanel } from "@/app/admin/dashboard/overview/_components/OverviewBctcPanel";
import { OverviewBctcPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewBctcPanel.skeleton";
import { OverviewMarketingPanel } from "@/app/admin/dashboard/overview/_components/OverviewMarketingPanel";
import { OverviewMarketingPanelSkeleton } from "@/app/admin/dashboard/overview/_components/OverviewMarketingPanel.skeleton";

import DashboardOverviewClient from "./DashboardOverviewClient";

export const dynamic = "force-dynamic";

export default function AdminDashboardOverviewPage() {
  return (
    <div className="-m-4 flex h-full min-h-0 flex-col md:-m-6">
      <DashboardOverviewClient
        marketingContent={
          <Suspense fallback={<OverviewMarketingPanelSkeleton />}>
            <OverviewMarketingPanel />
          </Suspense>
        }
        bctcContent={
          <Suspense fallback={<OverviewBctcPanelSkeleton />}>
            <OverviewBctcPanel />
          </Suspense>
        }
      />
    </div>
  );
}
