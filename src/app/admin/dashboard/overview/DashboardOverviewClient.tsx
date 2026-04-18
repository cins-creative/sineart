"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import type { TaiSanDbRow } from "@/lib/data/admin-gia-tri-tai-san";
import type { MkDataAnalysisRow } from "@/lib/data/admin-report-mkt";
import type { BaoCaoColumn } from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

import GiaTriTaiSanView from "@/app/admin/dashboard/gia-tri-tai-san/GiaTriTaiSanView";

import BctcDetailCharts from "./BctcDetailCharts";
import BctcOverviewCharts from "./BctcOverviewCharts";
import MarketingDataAnalysisCharts from "./MarketingDataAnalysisCharts";

type OverviewTabId = "marketing" | "bctc-summary" | "bctc-detail" | "gia-tri-tai-san";

const TABS: { id: OverviewTabId; label: string }[] = [
  { id: "marketing", label: "Marketing Data Analysis" },
  { id: "bctc-summary", label: "BCTC tổng quan" },
  { id: "bctc-detail", label: "BCTC chi tiết" },
  { id: "gia-tri-tai-san", label: "Giá trị tài sản" },
];

type Props = {
  initialRows: MkDataAnalysisRow[];
  /** Cùng logic «Đang học — tổng» như trang Quản lý học viên; `null` nếu không tải được HV. */
  hocVienDangHoc: number | null;
  initialBctcColumns: BaoCaoColumn[];
  bctcLoadError: string | null;
  /** Chỉ server gửi khi user là admin (tab ẩn với vai trò khác). */
  initialTaiSanRows: TaiSanDbRow[];
  taiSanLoadError: string | null;
};

export default function DashboardOverviewClient({
  initialRows,
  hocVienDangHoc,
  initialBctcColumns,
  bctcLoadError,
  initialTaiSanRows,
  taiSanLoadError,
}: Props) {
  const { canViewBctcDetail, canViewGiaTriTaiSanOverview } = useAdminDashboardAbilities();
  const [tab, setTab] = useState<OverviewTabId>("marketing");

  const visibleTabs = useMemo(() => {
    return TABS.filter((t) => {
      if (t.id === "bctc-detail" && !canViewBctcDetail) return false;
      if (t.id === "gia-tri-tai-san" && !canViewGiaTriTaiSanOverview) return false;
      return true;
    });
  }, [canViewBctcDetail, canViewGiaTriTaiSanOverview]);

  useEffect(() => {
    if (!canViewBctcDetail && tab === "bctc-detail") {
      setTab("marketing");
    }
    if (!canViewGiaTriTaiSanOverview && tab === "gia-tri-tai-san") {
      setTab("marketing");
    }
  }, [canViewBctcDetail, canViewGiaTriTaiSanOverview, tab]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-[10px] pb-6 pt-2 md:px-6 md:pt-3 md:pb-8">
      <nav
        className="flex flex-row flex-wrap gap-2 border-b border-black/[0.08] pb-3"
        aria-label="Tab bảng điều khiển"
      >
        {visibleTabs.map((t) => (
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
        {tab === "bctc-detail" && canViewBctcDetail ? (
          bctcLoadError ? (
            <BctcErrorBanner message={bctcLoadError} />
          ) : (
            <BctcDetailCharts key="bctc-detail" columns={initialBctcColumns} />
          )
        ) : null}
        {tab === "gia-tri-tai-san" && canViewGiaTriTaiSanOverview ? (
          taiSanLoadError ? (
            <TaiSanErrorBanner message={taiSanLoadError} />
          ) : (
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              <GiaTriTaiSanView key="gia-tri-tai-san" rows={initialTaiSanRows} embedded />
            </div>
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

function TaiSanErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-snug text-red-900">
      Không tải được giá trị tài sản: <span className="font-semibold">{message}</span>
    </div>
  );
}
