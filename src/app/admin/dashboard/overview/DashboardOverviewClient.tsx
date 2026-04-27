"use client";

import { useState } from "react";

import type { MkDataAnalysisRow } from "@/lib/data/admin-report-mkt";
import type { BaoCaoColumn } from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

import BctcOverviewCharts from "./BctcOverviewCharts";
import MarketingDataAnalysisCharts from "./MarketingDataAnalysisCharts";

type OverviewTabId = "marketing" | "bctc-summary";

const TABS: { id: OverviewTabId; label: string }[] = [
  { id: "marketing", label: "Marketing Data Analysis" },
  { id: "bctc-summary", label: "BCTC tổng quan" },
];

type Props = {
  initialRows: MkDataAnalysisRow[];
  /** Cùng logic «Đang học — tổng» như trang Quản lý học viên; `null` nếu không tải được HV. */
  hocVienDangHoc: number | null;
  initialBctcColumns: BaoCaoColumn[];
  bctcLoadError: string | null;
};

export default function DashboardOverviewClient({
  initialRows,
  hocVienDangHoc,
  initialBctcColumns,
  bctcLoadError,
}: Props) {
  const [tab, setTab] = useState<OverviewTabId>("marketing");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-[10px] pb-6 pt-2 md:px-6 md:pt-3 md:pb-8">
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
        {tab === "marketing" ? (
          <MarketingDataAnalysisCharts rows={initialRows} hocVienDangHoc={hocVienDangHoc} />
        ) : null}
        {tab === "bctc-summary" ? (
          bctcLoadError ? (
            <BctcErrorBanner message={bctcLoadError} />
          ) : (
            <BctcOverviewCharts key="bctc-summary" columns={initialBctcColumns} />
          )
        ) : null}
      </div>
    </div>
  );
}

function BctcErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-950">
      Không tải được báo cáo tài chính: <span className="font-semibold">{message}</span>
    </div>
  );
}
