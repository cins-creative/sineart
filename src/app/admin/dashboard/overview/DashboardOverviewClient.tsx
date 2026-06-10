"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  OVERVIEW_SECTION_BCTC,
  OVERVIEW_SECTION_HV_TRACKING,
  OVERVIEW_SECTION_MARKETING,
  OVERVIEW_SECTION_WEB_TRAFFIC,
  OVERVIEW_SECTION_META_INSIGHTS,
  type OverviewPeriodSlug,
  type OverviewSectionSlug,
} from "./overview-routes";

type Props = {
  section: OverviewSectionSlug;
  period: OverviewPeriodSlug;
  marketingContent: ReactNode;
  bctcContent: ReactNode;
  hvTrackingContent: ReactNode;
  webTrafficContent: ReactNode;
  metaInsightsContent: ReactNode;
};

const TAB_META: { id: OverviewSectionSlug; label: string }[] = [
  { id: OVERVIEW_SECTION_MARKETING, label: "Marketing Data Analysis" },
  { id: OVERVIEW_SECTION_WEB_TRAFFIC, label: "Traffic web" },
  { id: OVERVIEW_SECTION_META_INSIGHTS, label: "Meta (FB)" },
  { id: OVERVIEW_SECTION_HV_TRACKING, label: "Theo dõi học viên" },
  { id: OVERVIEW_SECTION_BCTC, label: "BCTC tổng quan" },
];

export default function DashboardOverviewClient({
  section,
  period,
  marketingContent,
  bctcContent,
  hvTrackingContent,
  webTrafficContent,
  metaInsightsContent,
}: Props) {
  const base = "/admin/dashboard/overview";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-[10px] pb-6 pt-2 md:px-6 md:pb-8 md:pt-3">
      <nav
        className="flex flex-row flex-wrap gap-2 border-b border-black/[0.08] pb-3"
        aria-label="Tab bảng điều khiển"
      >
        {TAB_META.map((t) => (
          <Link
            key={t.id}
            href={`${base}/${t.id}/${period}`}
            role="tab"
            aria-selected={section === t.id}
            className={cn(
              "rounded-xl px-4 py-2.5 text-[13px] font-semibold transition",
              section === t.id
                ? "border border-[#f8a668]/45 bg-gradient-to-r from-[#fff4eb] via-[#fef5f3] to-[#fdeef6] text-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                : "border border-transparent bg-white/80 text-black/70 hover:border-black/[0.08] hover:bg-black/[0.03]",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 md:pr-1" role="tabpanel">
        {section === OVERVIEW_SECTION_MARKETING ? marketingContent : null}
        {section === OVERVIEW_SECTION_WEB_TRAFFIC ? webTrafficContent : null}
        {section === OVERVIEW_SECTION_META_INSIGHTS ? metaInsightsContent : null}
        {section === OVERVIEW_SECTION_HV_TRACKING ? hvTrackingContent : null}
        {section === OVERVIEW_SECTION_BCTC ? bctcContent : null}
      </div>
    </div>
  );
}
