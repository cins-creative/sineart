"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  MKT_OVERVIEW_SECTIONS,
  OVERVIEW_SECTION_BCTC,
  OVERVIEW_SECTION_HV_TRACKING,
  OVERVIEW_SECTION_META_INSIGHTS,
  OVERVIEW_SECTION_SEARCH_CONSOLE,
  OVERVIEW_SECTION_WEB_TRAFFIC,
  isMktOverviewSection,
  type OverviewPeriodSlug,
  type OverviewSectionSlug,
} from "./overview-routes";

type Props = {
  section: OverviewSectionSlug;
  period: OverviewPeriodSlug;
  bctcContent: ReactNode;
  hvTrackingContent: ReactNode;
  webTrafficContent: ReactNode;
  searchConsoleContent: ReactNode;
  metaInsightsContent: ReactNode;
};

const TOP_TABS: { id: "mkt" | OverviewSectionSlug; label: string; href: (base: string, period: OverviewPeriodSlug) => string }[] =
  [
    {
      id: "mkt",
      label: "MKT Data Analysis",
      href: (base, period) => `${base}/${OVERVIEW_SECTION_WEB_TRAFFIC}/${period}`,
    },
    {
      id: OVERVIEW_SECTION_HV_TRACKING,
      label: "Theo dõi học viên",
      href: (base, period) => `${base}/${OVERVIEW_SECTION_HV_TRACKING}/${period}`,
    },
    {
      id: OVERVIEW_SECTION_BCTC,
      label: "BCTC tổng quan",
      href: (base, period) => `${base}/${OVERVIEW_SECTION_BCTC}/${period}`,
    },
  ];

const MKT_SUB_TABS: { id: (typeof MKT_OVERVIEW_SECTIONS)[number]; label: string }[] = [
  { id: OVERVIEW_SECTION_WEB_TRAFFIC, label: "Traffic web" },
  { id: OVERVIEW_SECTION_SEARCH_CONSOLE, label: "Google Search" },
  { id: OVERVIEW_SECTION_META_INSIGHTS, label: "Meta (FB)" },
];

const pillClass = (active: boolean) =>
  cn(
    "rounded-xl px-4 py-2.5 text-[13px] font-semibold transition",
    active
      ? "border border-[#f8a668]/45 bg-gradient-to-r from-[#fff4eb] via-[#fef5f3] to-[#fdeef6] text-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
      : "border border-transparent bg-white/80 text-black/70 hover:border-black/[0.08] hover:bg-black/[0.03]",
  );

const subPillClass = (active: boolean) =>
  cn(
    "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
    active
      ? "border border-[#E8527A]/40 bg-[#fff4eb] text-[#323232]"
      : "border border-transparent bg-black/[0.03] text-black/60 hover:bg-black/[0.06]",
  );

export default function DashboardOverviewClient({
  section,
  period,
  bctcContent,
  hvTrackingContent,
  webTrafficContent,
  searchConsoleContent,
  metaInsightsContent,
}: Props) {
  const base = "/admin/dashboard/overview";
  const onMkt = isMktOverviewSection(section);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-[10px] pb-6 pt-2 md:px-6 md:pb-8 md:pt-3">
      <nav
        className="flex flex-col gap-2 border-b border-black/[0.08] pb-3"
        aria-label="Tab bảng điều khiển"
      >
        <div className="flex flex-row flex-wrap gap-2" role="tablist">
          {TOP_TABS.map((t) => {
            const active = t.id === "mkt" ? onMkt : section === t.id;
            return (
              <Link
                key={t.label}
                href={t.href(base, period)}
                role="tab"
                aria-selected={active}
                className={pillClass(active)}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {onMkt ? (
          <div className="flex flex-row flex-wrap gap-1.5 pl-0.5" role="tablist" aria-label="Nguồn MKT">
            {MKT_SUB_TABS.map((t) => (
              <Link
                key={t.id}
                href={`${base}/${t.id}/${period}`}
                role="tab"
                aria-selected={section === t.id}
                className={subPillClass(section === t.id)}
              >
                {t.label}
              </Link>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 md:pr-1" role="tabpanel">
        {section === OVERVIEW_SECTION_WEB_TRAFFIC ? webTrafficContent : null}
        {section === OVERVIEW_SECTION_SEARCH_CONSOLE ? searchConsoleContent : null}
        {section === OVERVIEW_SECTION_META_INSIGHTS ? metaInsightsContent : null}
        {section === OVERVIEW_SECTION_HV_TRACKING ? hvTrackingContent : null}
        {section === OVERVIEW_SECTION_BCTC ? bctcContent : null}
      </div>
    </div>
  );
}
