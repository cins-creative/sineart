"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type OverviewTabId = "marketing" | "bctc-summary";

const TABS: { id: OverviewTabId; label: string }[] = [
  { id: "marketing", label: "Marketing Data Analysis" },
  { id: "bctc-summary", label: "BCTC tổng quan" },
];

type Props = {
  marketingContent: ReactNode;
  bctcContent: ReactNode;
};

export default function DashboardOverviewClient({ marketingContent, bctcContent }: Props) {
  const [tab, setTab] = useState<OverviewTabId>("marketing");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-[10px] pb-6 pt-2 md:px-6 md:pb-8 md:pt-3">
      <nav
        className="flex flex-row flex-wrap gap-2 border-b border-black/[0.08] pb-3"
        aria-label="Tab bảng điều khiển"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-4 py-2.5 text-[13px] font-semibold transition",
              tab === t.id
                ? "border border-[#f8a668]/45 bg-gradient-to-r from-[#fff4eb] via-[#fef5f3] to-[#fdeef6] text-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                : "border border-transparent bg-white/80 text-black/70 hover:border-black/[0.08] hover:bg-black/[0.03]",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 md:pr-1" role="tabpanel">
        {tab === "marketing" ? marketingContent : null}
        {tab === "bctc-summary" ? bctcContent : null}
      </div>
    </div>
  );
}
