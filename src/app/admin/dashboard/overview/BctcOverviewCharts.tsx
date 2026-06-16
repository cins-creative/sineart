"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TcBaoCaoTaiChinhRow } from "@/lib/data/admin-bao-cao-tai-chinh";
import { rowsToInitialColumns } from "@/lib/data/admin-bao-cao-tai-chinh";
import type { BaoCaoColumn, ColData } from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

import { readOverviewBctcCache, writeOverviewBctcCache } from "./overview-local-cache";

import {
  buildBctcAlignedYearSplitSeries,
  buildYearThangColDataMap,
  fmtMoneyCompact,
  fmtMoneyFull,
  parseOverviewSeriesDataKey,
  resolveCurrentPreviousYears,
  rowFormulaValue,
  type BctcMonthAlignedDatum,
  type YoYAlignedMetric,
  yoyPercentOrNull,
  yoYAlignedTotalsVsBaseline,
} from "./bctc-chart-helpers";

const C = {
  grid: "#E8E4E5",
  muted: "#9E8A90",
  previousStroke: "#94a3b8",
} as const;

const OVERVIEW_SERIES: { rowKey: string; label: string; color: string }[] = [
  { rowKey: "_dtThuan", label: "Doanh thu thuần", color: "#3b82f6" },
  { rowKey: "_tongCP", label: "Chi phí", color: "#ef4444" },
  { rowKey: "_tongLuong", label: "Lương", color: "#f59e0b" },
  { rowKey: "_lnTruocThue", label: "LN trước thuế", color: "#8b5cf6" },
  { rowKey: "_lnSauThue", label: "LN sau thuế", color: "#10b981" },
];

const SERIES_KEYS = OVERVIEW_SERIES.map((s) => s.rowKey);

const LABEL_BY_KEY = Object.fromEntries(OVERVIEW_SERIES.map((s) => [s.rowKey, s.label]));

/** Chi tiết doanh thu thuần theo từng môn / nguồn (khớp cấu trúc BCTC). */
const REVENUE_BY_SUBJECT: { rowKey: string; label: string }[] = [
  { rowKey: "_dtOnline", label: "Doanh thu Online" },
  { rowKey: "_dtOffline", label: "Doanh thu Offline" },
  { rowKey: "_dtHinhHoa", label: "Hình họa" },
  { rowKey: "_dtTTM", label: "Trang trí màu" },
  { rowKey: "_dtBCM", label: "BCM" },
  { rowKey: "dtKids", label: "Kids" },
  { rowKey: "dtBackground", label: "Lớp Background" },
  { rowKey: "dtDichVu", label: "Dịch vụ" },
  { rowKey: "dtHoaCu", label: "Họa cụ" },
];

const SUBJECT_ROW_KEYS = REVENUE_BY_SUBJECT.map((s) => s.rowKey);
const SUBJECT_LABEL_BY_KEY = Object.fromEntries(REVENUE_BY_SUBJECT.map((s) => [s.rowKey, s.label]));

/** Mốc KPI kỳ vọng so với tổng năm trước (cùng tập tháng đã gộp). */
const KPI_TARGET_GROWTH_PCT = 20;

function targetSumFromBaseline(baselineSum: number): number {
  return Math.round(baselineSum * (1 + KPI_TARGET_GROWTH_PCT / 100));
}

/**
 * Chi phí: đạt khi không vượt mục tiêu (không cao hơn +20% so với năm trước).
 * Doanh thu / LN / Lương: đạt khi đạt ít nhất mức tăng +20%.
 */
function kpiTargetMet(rowKey: string, currentSum: number, target: number): boolean {
  if (rowKey === "_tongCP") return currentSum <= target;
  return currentSum >= target;
}

type Props = {
  columns: BaoCaoColumn[];
  /** Đã tải subset theo kỳ URL — idle fetch full + cache (chỉ BCTC thủ công). */
  deferFullBctcHydration?: boolean;
  /** `manual` = tc_bao_cao_tai_chinh · `auto` = học phí, thu chi, lương, … */
  source?: "manual" | "auto";
};

function avgMonthlyFromRow(row: YoYAlignedMetric): string {
  const denom = row.currentActiveMonths > 0 ? row.currentActiveMonths : row.pairedMonths;
  const sum = row.currentActiveMonths > 0 ? row.currentSumForAvg : row.currentSum;
  if (denom <= 0 || !Number.isFinite(sum)) return "—";
  return fmtMoneyCompact(sum / denom);
}

function avgMonthlyTooltip(row: YoYAlignedMetric, currentYear: string | null): string | undefined {
  const denom = row.currentActiveMonths > 0 ? row.currentActiveMonths : row.pairedMonths;
  if (denom <= 0) return undefined;
  const sum = row.currentActiveMonths > 0 ? row.currentSumForAvg : row.currentSum;
  const avg = sum / denom;
  return [
    `${fmtMoneyFull(sum)} ÷ ${denom} tháng có phát sinh`,
    currentYear ? `(năm ${currentYear})` : "",
    `= ${fmtMoneyFull(avg)}/tháng`,
  ]
    .filter(Boolean)
    .join(" ");
}

function fmtPctSub(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  const p = Math.round(pct * 10) / 10;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

/** % một chỉ tiêu so với tổng doanh thu thuần (dòng cha). */
function shareOfDtThuanPct(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return null;
  return (part / total) * 100;
}

function fmtShareOfDtThuan(pct: number | null): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const p = Math.round(pct * 10) / 10;
  return `${p.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% DT thuần`;
}

/** YoY %: chi phí giảm là tốt → xanh; các chỉ tiêu khác tăng là tốt → xanh. */
function yoyTone(rowKey: string, pct: number): "good" | "bad" | "neutral" {
  if (rowKey === "_tongCP") {
    if (pct < 0) return "good";
    if (pct > 0) return "bad";
    return "neutral";
  }
  if (pct > 0) return "good";
  if (pct < 0) return "bad";
  return "neutral";
}

function yoyToneClass(tone: "good" | "bad" | "neutral", dense: boolean): string {
  if (tone === "good") {
    return dense ? "bg-emerald-100 text-emerald-800" : "bg-emerald-50 text-emerald-700";
  }
  if (tone === "bad") {
    return dense ? "bg-red-100 text-red-800" : "bg-red-50 text-red-700";
  }
  return dense ? "bg-black/[0.06] text-black/65" : "bg-black/[0.06] text-black/55";
}

function vsMonthPctClass(metric: string, pct: number): string {
  if (!Number.isFinite(pct)) return "text-black/35";
  if (metric === "_tongCP") {
    if (pct < 0) return "text-emerald-600";
    if (pct > 0) return "text-red-600";
    return "text-black/45";
  }
  if (pct > 0) return "text-emerald-600";
  if (pct < 0) return "text-red-600";
  return "text-black/45";
}

function metricDot(stroke: string) {
  return (props: { cx?: number; cy?: number; value?: number }) => {
    const { cx, cy, value } = props;
    if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    const isZero = value === 0;
    const r = isZero ? 4 : 3;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={stroke}
        stroke={isZero ? "#ffffff" : stroke}
        strokeWidth={isZero ? 2 : 0}
      />
    );
  };
}

/** Khớp Recharts `TooltipPayloadEntry`: `name` có thể là number. */
type MonthTooltipPayloadEntry = {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
  payload?: BctcMonthAlignedDatum;
};

/** Tooltip điểm tháng: với đường năm hiện tại, hiện % so với cùng tháng năm trước. */
function MonthCompareTooltip({
  active,
  payload,
  label,
  previousYearByThang,
  previousYear,
  currentYear,
}: {
  active?: boolean;
  payload?: readonly MonthTooltipPayloadEntry[];
  label?: unknown;
  previousYearByThang: Map<string, ColData>;
  previousYear: string | null;
  currentYear: string | null;
}) {
  if (!active || !payload?.length) return null;

  const datum = payload[0]?.payload;
  const thang = datum?.thang;
  const prevCol = thang ? previousYearByThang.get(thang) : null;

  return (
    <div className="max-w-[min(320px,92vw)] rounded-[10px] border border-[#EDE8E9] bg-white px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
      <div className="mb-1 font-bold text-[#1a1a2e]">{label != null ? String(label) : ""}</div>
      <ul className="m-0 space-y-1 p-0">
        {payload.map((item, i) => {
          const value = Number(item.value);
          const rawKey = String(item.dataKey ?? "");
          const parsed = parseOverviewSeriesDataKey(rawKey);
          let vsLine: string | null = null;
          let vsPctNum: number | null = null;
          if (
            parsed &&
            prevCol &&
            previousYear &&
            currentYear &&
            parsed.year === currentYear
          ) {
            const pv = rowFormulaValue(parsed.metric, prevCol);
            if (pv === 0 && value === 0) vsLine = null;
            else {
              vsPctNum = yoyPercentOrNull(value, pv);
              vsLine = vsPctNum === null ? "—" : fmtPctSub(vsPctNum);
            }
          }
          return (
            <li key={i} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-black/70">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate text-[11px]">
                    {item.name != null && item.name !== "" ? String(item.name) : "—"}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[#1a1a2e]">
                  {fmtMoneyFull(Number.isFinite(value) ? value : 0)}
                </span>
              </div>
              {vsLine !== null ? (
                <div className="flex justify-end pl-5 text-[10px] font-semibold tabular-nums text-black/45">
                  vs {previousYear}:{" "}
                  <span
                    className={cn(
                      "ml-1",
                      vsLine === "—"
                        ? "text-black/35"
                        : parsed
                          ? vsMonthPctClass(parsed.metric, vsPctNum ?? NaN)
                          : "text-black/35",
                    )}
                  >
                    {vsLine}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function extentForKeys(data: BctcMonthAlignedDatum[], keys: string[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }
  if (!Number.isFinite(min)) return { min: 0, max: 0 };
  return { min, max };
}

function renderSummaryRowCells({
  rowKey,
  row,
  target,
  met,
  vsKpiPct,
  currentYear,
  shareParentRow,
}: {
  rowKey: string;
  row: YoYAlignedMetric | undefined;
  target: number | null;
  met: boolean | null;
  vsKpiPct: number | null;
  currentYear: string | null;
  /** Dòng `_dtThuan` — dùng tính % cơ cấu cho dòng con doanh thu. */
  shareParentRow?: YoYAlignedMetric;
}) {
  const shareTotalPct =
    row != null && shareParentRow != null
      ? shareOfDtThuanPct(row.currentSum, shareParentRow.currentSum)
      : null;
  const shareAvgNumerator =
    row != null && row.currentActiveMonths > 0 ? row.currentSumForAvg : row?.currentSum;
  const shareAvgDenominator =
    shareParentRow != null && shareParentRow.currentActiveMonths > 0
      ? shareParentRow.currentSumForAvg
      : shareParentRow?.currentSum;
  const shareAvgPct =
    row != null && shareAvgNumerator != null && shareAvgDenominator != null
      ? shareOfDtThuanPct(shareAvgNumerator, shareAvgDenominator)
      : null;
  const shareTotalLabel = fmtShareOfDtThuan(shareTotalPct);
  const shareAvgLabel = fmtShareOfDtThuan(shareAvgPct);

  return (
    <>
      <td className="px-3 py-3 text-right tabular-nums text-black/75">
        {row ? fmtMoneyCompact(row.baselineSum) : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-[#BC8AF9]">
        {target != null ? fmtMoneyCompact(target) : "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums font-semibold text-[#1a1a2e]">
        {row ? (
          <div className="flex flex-col items-end gap-0.5">
            <span>{fmtMoneyCompact(row.currentSum)}</span>
            {shareTotalLabel ? (
              <span className="text-[10px] font-semibold tabular-nums text-black/45">{shareTotalLabel}</span>
            ) : null}
          </div>
        ) : (
          "—"
        )}
      </td>
      <td
        className="px-3 py-3 text-right tabular-nums text-black/70"
        title={
          row
            ? [
                avgMonthlyTooltip(row, currentYear),
                shareAvgLabel ? `Cơ cấu TB/tháng: ${shareAvgLabel}` : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
      >
        {row ? (
          <div className="flex flex-col items-end gap-0.5">
            <span>{avgMonthlyFromRow(row)}</span>
            {shareAvgLabel ? (
              <span className="text-[10px] font-semibold tabular-nums text-black/45">{shareAvgLabel}</span>
            ) : null}
          </div>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {row?.pct == null ? (
          <span className="text-black/40">—</span>
        ) : (
          <span
            className={cn(
              "inline-block rounded-lg px-2 py-0.5 text-[12px] font-bold tabular-nums",
              yoyToneClass(yoyTone(rowKey, row.pct), false),
            )}
          >
            {row.pct >= 0 ? "+" : ""}
            {row.pct.toFixed(1)}%
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {met == null ? (
          <span className="text-black/40">—</span>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                "inline-block rounded-lg px-2 py-0.5 text-[11px] font-extrabold",
                met ? "bg-indigo-50 text-indigo-800" : "bg-amber-50 text-amber-900",
              )}
            >
              {met ? "Đạt KPI" : "Chưa đạt"}
            </span>
            {vsKpiPct != null && Number.isFinite(vsKpiPct) ? (
              <span className="text-[10px] font-semibold tabular-nums text-black/45">
                {vsKpiPct >= 0 ? "+" : ""}
                {vsKpiPct.toFixed(1)}% so mục tiêu
              </span>
            ) : null}
          </div>
        )}
      </td>
    </>
  );
}

export default function BctcOverviewCharts({
  columns: columnsProp,
  deferFullBctcHydration = false,
  source = "manual",
}: Props) {
  const isAuto = source === "auto";
  const [columns, setColumns] = useState<BaoCaoColumn[]>(() => {
    if (typeof window === "undefined") return columnsProp;
    if (!deferFullBctcHydration || isAuto) return columnsProp;
    const cached = readOverviewBctcCache();
    return cached?.length ? rowsToInitialColumns(cached) : columnsProp;
  });
  useEffect(() => {
    if (deferFullBctcHydration && !isAuto && readOverviewBctcCache()?.length) return;
    setColumns(columnsProp);
  }, [columnsProp, deferFullBctcHydration, isAuto]);

  useEffect(() => {
    if (!deferFullBctcHydration || isAuto) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/admin/api/overview/bctc-rows-full");
        const j = (await res.json()) as { ok?: boolean; rows?: TcBaoCaoTaiChinhRow[] };
        if (!cancelled && j.ok && Array.isArray(j.rows)) {
          setColumns(rowsToInitialColumns(j.rows));
          writeOverviewBctcCache(j.rows);
        }
      } catch {
        /* ignore */
      }
    };
    const ric =
      typeof requestIdleCallback !== "undefined" ? requestIdleCallback(run) : undefined;
    const tid = ric === undefined ? window.setTimeout(run, 1) : undefined;
    return () => {
      cancelled = true;
      if (ric !== undefined) cancelIdleCallback(ric);
      if (tid !== undefined) window.clearTimeout(tid);
    };
  }, [deferFullBctcHydration, isAuto]);

  const { currentYear, previousYear, plotYears } = useMemo(
    () => resolveCurrentPreviousYears(columns),
    [columns],
  );

  const chartData = useMemo(
    () => buildBctcAlignedYearSplitSeries(columns, SERIES_KEYS, plotYears),
    [columns, plotYears],
  );

  /** Mục tiêu doanh thu từng tháng = cùng tháng năm trước × (1 + KPI%). */
  const chartDataWithRevenueKpi = useMemo(() => {
    if (!previousYear) return chartData;
    return chartData.map((row) => {
      const prev = row[`_dtThuan__${previousYear}`];
      const _dtThuan__kpi =
        typeof prev === "number" && Number.isFinite(prev)
          ? Math.round(prev * (1 + KPI_TARGET_GROWTH_PCT / 100))
          : undefined;
      return { ...row, _dtThuan__kpi };
    });
  }, [chartData, previousYear]);

  const chartHasNumbers = useMemo(
    () =>
      chartData.some((row) =>
        plotYears.some((y) => SERIES_KEYS.some((k) => row[`${k}__${y}`] != null)),
      ),
    [chartData, plotYears],
  );

  const previousYearByThang = useMemo(
    () => (previousYear ? buildYearThangColDataMap(columns, previousYear) : new Map<string, ColData>()),
    [columns, previousYear],
  );

  const yoySummary = useMemo(() => {
    if (!currentYear || !previousYear) return [];
    return yoYAlignedTotalsVsBaseline(
      columns,
      previousYear,
      currentYear,
      SERIES_KEYS,
      LABEL_BY_KEY,
    );
  }, [columns, currentYear, previousYear]);

  const maxPairedMonths = useMemo(
    () => (yoySummary.length ? Math.max(...yoySummary.map((s) => s.pairedMonths)) : 0),
    [yoySummary],
  );

  const summaryByKey = useMemo(
    () => Object.fromEntries(yoySummary.map((s) => [s.rowKey, s])),
    [yoySummary],
  );

  const subjectYoySummary = useMemo(() => {
    if (!currentYear || !previousYear) return [];
    return yoYAlignedTotalsVsBaseline(
      columns,
      previousYear,
      currentYear,
      SUBJECT_ROW_KEYS,
      SUBJECT_LABEL_BY_KEY,
    );
  }, [columns, currentYear, previousYear]);

  const subjectSummaryByKey = useMemo(
    () => Object.fromEntries(subjectYoySummary.map((s) => [s.rowKey, s])),
    [subjectYoySummary],
  );

  const [revenueBySubjectOpen, setRevenueBySubjectOpen] = useState(false);

  if (columns.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#EAEAEA] bg-white px-6 py-12 text-center">
        <span className="text-3xl" aria-hidden>
          📊
        </span>
        <p className="m-0 text-sm font-semibold text-[#888]">
          {isAuto ? "Chưa có dữ liệu BCTC tự động" : "Chưa có kỳ dữ liệu BCTC"}
        </p>
        <p className="m-0 max-w-sm text-[12px] text-black/45">
          {isAuto ? (
            <>
              Gom từ học phí đã thanh toán, thu chi khác, họa cụ, lương… Xem chi tiết tại{" "}
              <Link href="/admin/dashboard/bctc-tu-dong" className="font-semibold text-[#7c3aed] underline">
                BCTC — nguồn tự động
              </Link>
              .
            </>
          ) : (
            "Nhập số tại Báo cáo tài chính để xem biểu đồ tổng quan."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">
          {isAuto ? "BCTC tổng quan — nguồn tự động" : "BCTC tổng quan"}
        </h2>
        {isAuto ? (
          <p className="mt-1 mb-0 text-[12px] leading-snug text-black/50">
            Tổng hợp từ giao dịch thực tế (học phí, thu chi khác, họa cụ, lương…), ánh xạ sang cùng chỉ tiêu BCTC.
            Học phí phân bổ theo <span className="font-semibold text-black/60">kỳ học</span> (đầu–cuối kỳ), không
            theo tháng thu tiền — TB/tháng thường thấp hơn BCTC nhập tay.{" "}
            <Link href="/admin/dashboard/bctc-tu-dong" className="font-semibold text-[#7c3aed] hover:underline">
              Xem ma trận chi tiết
            </Link>
          </p>
        ) : (
          <p className="mt-1 mb-0 text-[12px] leading-snug text-black/50">
            Dữ liệu từ{" "}
            <Link
              href="/admin/dashboard/bao-cao-tai-chinh"
              className="font-semibold text-[#7c3aed] hover:underline"
            >
              Báo cáo tài chính
            </Link>{" "}
            (nhập tay).
          </p>
        )}
      </div>

      {currentYear && previousYear && maxPairedMonths > 0 ? (
        <div className="overflow-hidden rounded-[14px] border border-[#EDE8E9] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[#EDE8E9] bg-[#fafafa] px-4 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9E8A90]">
              Tổng hợp so với năm trước ({previousYear} → {currentYear})
            </div>
            <div className="mt-0.5 text-[11px] text-black/45">
              Các tháng có đủ dữ liệu ở cả hai năm:{" "}
              <strong className="font-semibold text-black/55">{maxPairedMonths}</strong> tháng · KPI kỳ vọng = tổng{" "}
              {previousYear} × {100 + KPI_TARGET_GROWTH_PCT}%
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9E8A90]">
                  <th className="sticky left-0 z-[1] border-b border-[#EDE8E9] bg-white px-4 py-3">Chỉ tiêu</th>
                  <th className="border-b border-[#EDE8E9] px-3 py-3 text-right tabular-nums">
                    Tổng {previousYear}
                  </th>
                  <th className="border-b border-[#EDE8E9] px-3 py-3 text-right tabular-nums">
                    KPI (+{KPI_TARGET_GROWTH_PCT}%)
                  </th>
                  <th className="border-b border-[#EDE8E9] px-3 py-3 text-right tabular-nums">
                    Tổng {currentYear}
                  </th>
                  <th
                    className="border-b border-[#EDE8E9] px-3 py-3 text-right tabular-nums"
                    title="Tổng các tháng có phát sinh (đến tháng hiện tại) ÷ số tháng đó"
                  >
                    TB/tháng
                  </th>
                  <th className="border-b border-[#EDE8E9] px-3 py-3 text-right tabular-nums">YoY</th>
                  <th className="border-b border-[#EDE8E9] px-4 py-3 text-right tabular-nums">Vs KPI</th>
                </tr>
              </thead>
              <tbody>
                {OVERVIEW_SERIES.map((s) => {
                  const row = summaryByKey[s.rowKey];
                  const dtThuanParentRow = summaryByKey["_dtThuan"];
                  const target =
                    row != null ? targetSumFromBaseline(row.baselineSum) : null;
                  const met =
                    row != null && target != null
                      ? kpiTargetMet(s.rowKey, row.currentSum, target)
                      : null;
                  const vsKpiPct =
                    row != null && target != null && target !== 0
                      ? ((row.currentSum - target) / target) * 100
                      : null;
                  const isRevenueParent = s.rowKey === "_dtThuan";
                  return (
                    <Fragment key={s.rowKey}>
                      <tr className="border-b border-[#f4f4f5] last:border-b-0">
                        <td className="sticky left-0 bg-white px-4 py-3 font-semibold text-[#323232]">
                          <div className="flex items-center gap-1.5">
                            {isRevenueParent ? (
                              <button
                                type="button"
                                onClick={() => setRevenueBySubjectOpen((v) => !v)}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/[0.05] hover:text-black/70"
                                aria-expanded={revenueBySubjectOpen}
                                aria-label={
                                  revenueBySubjectOpen
                                    ? "Thu gọn doanh thu theo môn học"
                                    : "Xem doanh thu theo từng môn học"
                                }
                                title="Doanh thu theo từng môn học"
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    revenueBySubjectOpen && "rotate-180",
                                  )}
                                  aria-hidden
                                />
                              </button>
                            ) : (
                              <span className="inline-block h-6 w-6 shrink-0" aria-hidden />
                            )}
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full align-middle"
                              style={{ background: s.color }}
                            />
                            <span className="min-w-0">{s.label}</span>
                          </div>
                        </td>
                        {renderSummaryRowCells({
                          rowKey: s.rowKey,
                          row,
                          target,
                          met,
                          vsKpiPct,
                          currentYear,
                        })}
                      </tr>
                      {isRevenueParent && revenueBySubjectOpen
                        ? REVENUE_BY_SUBJECT.map((sub) => {
                            const subRow = subjectSummaryByKey[sub.rowKey];
                            const subTarget =
                              subRow != null ? targetSumFromBaseline(subRow.baselineSum) : null;
                            const subMet =
                              subRow != null && subTarget != null
                                ? kpiTargetMet(sub.rowKey, subRow.currentSum, subTarget)
                                : null;
                            const subVsKpiPct =
                              subRow != null && subTarget != null && subTarget !== 0
                                ? ((subRow.currentSum - subTarget) / subTarget) * 100
                                : null;
                            return (
                              <tr
                                key={`${s.rowKey}__${sub.rowKey}`}
                                className="border-b border-[#f4f4f5] bg-[#fafafa]/80 last:border-b-0"
                              >
                                <td className="sticky left-0 bg-[#fafafa] px-4 py-2.5 pl-12 text-[12px] font-medium text-black/65">
                                  {sub.label}
                                </td>
                                {renderSummaryRowCells({
                                  rowKey: sub.rowKey,
                                  row: subRow,
                                  target: subTarget,
                                  met: subMet,
                                  vsKpiPct: subVsKpiPct,
                                  currentYear,
                                  shareParentRow: dtThuanParentRow,
                                })}
                              </tr>
                            );
                          })
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : currentYear && previousYear ? (
        <div className="rounded-[14px] border border-dashed border-[#EDE8E9] bg-white px-4 py-3 text-[13px] text-black/50">
          Chưa có tháng nào trùng giữa {previousYear} và {currentYear} — nhập đủ cùng các tháng để xem % và bảng tổng hợp.
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[#EDE8E9] bg-white px-4 py-3 text-[13px] text-black/50">
          Cần ít nhất dữ liệu tháng cho <strong className="font-semibold">hai năm liền kề</strong> (năm hiện tại và năm
          trước) để so sánh %.
        </div>
      )}

      <div className="rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#9E8A90]">
          Xu hướng theo tháng — từng chỉ tiêu
        </div>
        {!chartHasNumbers ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <p className="m-0 max-w-md text-[13px] font-semibold text-black/55">
              Cần dữ liệu theo <strong className="font-semibold">tháng</strong> trong BCTC (không chỉ Σ quý).
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {OVERVIEW_SERIES.map((s) => {
              const row = summaryByKey[s.rowKey];
              const dataForChart = s.rowKey === "_dtThuan" ? chartDataWithRevenueKpi : chartData;
              const extentKeys =
                s.rowKey === "_dtThuan" && previousYear
                  ? [...plotYears.map((y) => `${s.rowKey}__${y}`), "_dtThuan__kpi"]
                  : plotYears.map((y) => `${s.rowKey}__${y}`);
              const ext = extentForKeys(dataForChart, extentKeys);
              const showZero = ext.min <= 0 && ext.max >= 0;
              const revenueKpiTotal =
                s.rowKey === "_dtThuan" && summaryByKey["_dtThuan"]
                  ? targetSumFromBaseline(summaryByKey["_dtThuan"].baselineSum)
                  : null;

              return (
                <div
                  key={s.rowKey}
                  className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="text-[14px] font-bold text-[#1a1a2e]">{s.label}</span>
                      </span>
                      {s.rowKey === "_dtThuan" && revenueKpiTotal != null ? (
                        <span
                          className="inline-flex max-w-full items-center rounded-lg border border-[#BC8AF9]/40 bg-[#faf5ff] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#7c3aed]"
                          title="Trùng cách tính cột KPI (+20%) trong bảng tổng hợp phía trên"
                        >
                          Mục tiêu KPI doanh thu: {fmtMoneyCompact(revenueKpiTotal)}
                        </span>
                      ) : null}
                    </div>
                    {previousYear && currentYear && row?.pct != null ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-extrabold tabular-nums",
                          yoyToneClass(yoyTone(s.rowKey, row.pct), true),
                        )}
                      >
                        {row.pct >= 0 ? "+" : ""}
                        {row.pct.toFixed(1)}% so với {previousYear}
                      </span>
                    ) : (
                      <span className="text-[11px] text-black/40">Chưa so sánh được %</span>
                    )}
                  </div>
                  <div className="h-[180px] w-full min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataForChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={C.grid} vertical={false} />
                        {showZero ? (
                          <ReferenceLine
                            y={0}
                            stroke="#64748b"
                            strokeWidth={1.5}
                            strokeDasharray="5 5"
                            ifOverflow="extendDomain"
                          />
                        ) : null}
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: C.muted }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          height={28}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: C.muted }}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                          tickFormatter={(v: number) => fmtMoneyCompact(v)}
                        />
                        <Tooltip
                          content={(tipProps) => (
                            <MonthCompareTooltip
                              {...tipProps}
                              previousYearByThang={previousYearByThang}
                              previousYear={previousYear}
                              currentYear={currentYear}
                            />
                          )}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: 11,
                            paddingTop: 6,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px 14px",
                            rowGap: 6,
                          }}
                          formatter={(value) => <span className="text-[11px] font-medium text-black/70">{value}</span>}
                        />
                        {s.rowKey === "_dtThuan" && previousYear ? (
                          <Line
                            type="monotone"
                            dataKey="_dtThuan__kpi"
                            name={`KPI doanh thu (+${KPI_TARGET_GROWTH_PCT}% cùng kỳ ${previousYear})`}
                            stroke="#a855f7"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            connectNulls={false}
                            dot={false}
                            activeDot={{ r: 4, fill: "#a855f7" }}
                          />
                        ) : null}
                        {previousYear ? (
                          <Line
                            type="monotone"
                            dataKey={`${s.rowKey}__${previousYear}`}
                            name={`${previousYear} (năm trước)`}
                            stroke={C.previousStroke}
                            strokeWidth={2}
                            connectNulls={false}
                            dot={metricDot(C.previousStroke)}
                            activeDot={{ r: 5 }}
                          />
                        ) : null}
                        {currentYear ? (
                          <Line
                            type="monotone"
                            dataKey={`${s.rowKey}__${currentYear}`}
                            name={`${currentYear} (năm hiện tại)`}
                            stroke={s.color}
                            strokeWidth={2.5}
                            connectNulls={false}
                            dot={metricDot(s.color)}
                            activeDot={{ r: 6 }}
                          />
                        ) : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
