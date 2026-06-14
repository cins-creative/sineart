"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  HvEnrollmentTrackingResult,
  HvTrackingGroupMetrics,
} from "@/lib/data/admin-hv-enrollment-tracking";
import { cn } from "@/lib/utils";

import {
  OVERVIEW_PERIOD_ALL,
  OVERVIEW_PERIOD_CUSTOM,
  OVERVIEW_PERIOD_MONTH,
  OVERVIEW_PERIOD_QUARTER,
  OVERVIEW_PERIOD_WEEK,
  OVERVIEW_PERIOD_YEAR,
  type OverviewPeriodSlug,
} from "./overview-routes";

const C = {
  green: "#3A9E72",
  red: "#DC2626",
  net: "#4A7EC4",
  violet: "#7c3aed",
  orange: "#E8855A",
  grid: "#F3EEEF",
  muted: "#9E8A90",
} as const;

type ChartFocus = "compare" | "moi" | "nghi" | "net";
type MetricGroup = "enrollment" | "student";

const GROUP_LABELS: Record<
  MetricGroup,
  { title: string; hint: string; moi: string; nghi: string; netSub: string }
> = {
  enrollment: {
    title: "Theo ghi danh lớp",
    hint: "Đã thu HP · theo từng dòng ghi danh (lọc môn/lớp nếu chọn)",
    moi: "Ghi danh mới",
    nghi: "Nghỉ ghi danh",
    netSub: "ghi danh mới − nghỉ ghi danh",
  },
  student: {
    title: "Theo học viên",
    hint: "Hồ sơ mới / TT tư vấn Nghỉ · mỗi HV tối đa 1 lần trong kỳ",
    moi: "Học viên mới",
    nghi: "Học viên nghỉ",
    netSub: "học viên mới − học viên nghỉ",
  },
};

function fNum(v: number): string {
  return Math.round(v).toLocaleString("vi-VN");
}

function NetZeroReferenceLine() {
  return (
    <ReferenceLine
      y={0}
      stroke="#334155"
      strokeWidth={2}
      strokeOpacity={0.9}
      ifOverflow="extendDomain"
      label={{
        value: "0",
        position: "insideTopLeft",
        fill: "#64748b",
        fontSize: 10,
        fontWeight: 700,
      }}
    />
  );
}

function NetChartYAxis({ tickFontSize = 10 }: { tickFontSize?: number }) {
  return (
    <YAxis
      tick={{ fontSize: tickFontSize, fill: C.muted }}
      tickLine={false}
      axisLine={false}
      allowDecimals={false}
      domain={[
        (min: number) => Math.min(Math.floor(min), 0),
        (max: number) => Math.max(Math.ceil(max), 0),
      ]}
    />
  );
}

function TrackingXAxis({
  daily,
  pointCount,
  tickFontSize = 9,
}: {
  daily: boolean;
  pointCount: number;
  tickFontSize?: number;
}) {
  const dense = daily && pointCount > 12;
  return (
    <XAxis
      dataKey="periodLabel"
      interval={daily ? 0 : "preserveStartEnd"}
      minTickGap={daily ? 0 : 5}
      angle={dense ? -42 : 0}
      textAnchor={dense ? "end" : "middle"}
      height={dense ? 52 : 28}
      tick={{ fontSize: dense ? 8 : tickFontSize, fill: C.muted }}
      tickLine={false}
      axisLine={false}
    />
  );
}

function chartBottomMargin(daily: boolean, pointCount: number): number {
  if (!daily) return 0;
  if (pointCount > 20) return 28;
  if (pointCount > 12) return 22;
  return 4;
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SecTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-4 w-[3px] shrink-0 rounded-sm" style={{ background: color }} />
      <span className="text-[12px] font-bold text-[#323232]">{children}</span>
    </div>
  );
}

function KpiGroupSection({
  group,
  metrics,
  metricGroup,
  chartFocus,
  onSelect,
  children,
}: {
  group: MetricGroup;
  metrics: HvTrackingGroupMetrics;
  metricGroup: MetricGroup;
  chartFocus: ChartFocus;
  onSelect: (group: MetricGroup, focus: ChartFocus) => void;
  children?: React.ReactNode;
}) {
  const meta = GROUP_LABELS[group];
  const isActiveGroup = metricGroup === group;

  return (
    <section className="rounded-[14px] border border-[#EDE8E9] bg-white/90 p-3 shadow-[0_1px_6px_rgba(0,0,0,0.04)] md:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="m-0 text-[13px] font-bold tracking-tight text-[#323232]">{meta.title}</h3>
          <p className="mt-0.5 text-[11px] text-black/45">{meta.hint}</p>
        </div>
        {children}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <KpiCard
          label={meta.moi}
          value={fNum(metrics.moi)}
          sub="trong khoảng chọn"
          color={C.green}
          active={isActiveGroup && chartFocus === "moi"}
          onClick={() => onSelect(group, "moi")}
        />
        <KpiCard
          label={meta.nghi}
          value={fNum(metrics.nghi)}
          sub="trong khoảng chọn"
          color={C.red}
          active={isActiveGroup && chartFocus === "nghi"}
          onClick={() => onSelect(group, "nghi")}
        />
        <KpiCard
          label="Net"
          value={`${metrics.net >= 0 ? "+" : ""}${fNum(metrics.net)}`}
          sub={meta.netSub}
          color={C.net}
          active={isActiveGroup && chartFocus === "net"}
          onClick={() => onSelect(group, "net")}
        />
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "min-w-[120px] flex-1 rounded-2xl border border-[#EDE8E9] bg-white px-4 py-3 text-left shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition",
    onClick && "cursor-pointer hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]",
  );

  const style: CSSProperties = {
    borderTopColor: color,
    borderTopWidth: 3,
    ...(active ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${color}` } : {}),
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} style={style} aria-pressed={active}>
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">{label}</div>
        <div className="mt-1 text-[22px] font-extrabold tabular-nums tracking-tight text-[#1a1a1a]">{value}</div>
        {sub ? <div className="mt-0.5 text-[11px] text-black/50">{sub}</div> : null}
      </button>
    );
  }

  return (
    <div className={className} style={style}>
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">{label}</div>
      <div className="mt-1 text-[22px] font-extrabold tabular-nums tracking-tight text-[#1a1a1a]">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-black/50">{sub}</div> : null}
    </div>
  );
}

type Props = {
  overviewPeriodSlug: OverviewPeriodSlug;
  customFromInitial: string;
  customToInitial: string;
  hvTrackingHrefPrefix: string;
};

export default function HvEnrollmentTrackingCharts({
  overviewPeriodSlug,
  customFromInitial,
  customToInitial,
  hvTrackingHrefPrefix,
}: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(customFromInitial);
  const [customTo, setCustomTo] = useState(customToInitial);
  const [monHoc, setMonHoc] = useState<string>("all");
  const [lopHoc, setLopHoc] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<HvEnrollmentTrackingResult | null>(null);
  const [metricGroup, setMetricGroup] = useState<MetricGroup>("enrollment");
  const [chartFocus, setChartFocus] = useState<ChartFocus>("compare");

  const selectMetric = useCallback((group: MetricGroup, focus: ChartFocus) => {
    setMetricGroup(group);
    setChartFocus((prev) => (metricGroup === group && prev === focus ? "compare" : focus));
  }, [metricGroup]);

  useEffect(() => {
    setCustomFrom(customFromInitial);
    setCustomTo(customToInitial);
  }, [customFromInitial, customToInitial]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ period: overviewPeriodSlug });
      if (overviewPeriodSlug === OVERVIEW_PERIOD_CUSTOM) {
        qs.set("tu", customFrom);
        qs.set("den", customTo);
      }
      if (monHoc !== "all") qs.set("monHoc", monHoc);
      if (lopHoc !== "all") qs.set("lopHoc", lopHoc);

      const res = await fetch(`/admin/api/overview/hv-enrollment-tracking?${qs.toString()}`);
      const json = (await res.json()) as HvEnrollmentTrackingResult & { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false || !json.series) {
        throw new Error(json.error ?? "Không tải được dữ liệu.");
      }
      setPayload({
        series: json.series,
        enrollment: json.enrollment,
        student: json.student,
        activeEnrollments: json.activeEnrollments ?? 0,
        rangeLabel: json.rangeLabel,
        granularity: json.granularity ?? "day",
        mode: json.mode,
        filters: json.filters,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [overviewPeriodSlug, customFrom, customTo, monHoc, lopHoc]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const chartData = useMemo(
    () =>
      (payload?.series ?? []).map((row) => ({
        ...row[metricGroup],
        periodLabel: row.label,
      })),
    [payload, metricGroup],
  );

  const activeGroupMetrics = payload?.[metricGroup];
  const groupMeta = GROUP_LABELS[metricGroup];

  const netCumulative = useMemo(() => {
    let acc = 0;
    return chartData.map((row) => {
      acc += row.net;
      return { ...row, netCumulative: acc };
    });
  }, [chartData]);

  const pieData = useMemo(() => {
    if (!activeGroupMetrics) return [];
    return [
      { name: groupMeta.moi, value: activeGroupMetrics.moi, color: C.green },
      { name: groupMeta.nghi, value: activeGroupMetrics.nghi, color: C.red },
    ].filter((d) => d.value > 0);
  }, [activeGroupMetrics, groupMeta]);

  const chartTitle = useMemo(() => {
    switch (chartFocus) {
      case "moi":
        return `${groupMeta.moi} theo kỳ`;
      case "nghi":
        return `${groupMeta.nghi} theo kỳ`;
      case "net":
        return `Net ${groupMeta.title.toLowerCase()} (tích lũy)`;
      default:
        return `${groupMeta.moi} vs ${groupMeta.nghi} theo kỳ`;
    }
  }, [chartFocus, groupMeta]);

  const chartTitleColor = useMemo(() => {
    switch (chartFocus) {
      case "moi":
        return C.green;
      case "nghi":
        return C.red;
      case "net":
        return C.net;
      default:
        return C.green;
    }
  }, [chartFocus]);

  const isDailyChart = payload?.granularity === "day";
  const mainChartData = chartFocus === "net" ? netCumulative : chartData;
  const chartPoints = mainChartData.length;
  const lineChartMargin = {
    top: 6,
    right: 8,
    left: 0,
    bottom: chartBottomMargin(isDailyChart, chartPoints),
  };
  const netChartMargin = {
    top: 6,
    right: 8,
    left: 0,
    bottom: chartBottomMargin(isDailyChart, netCumulative.length),
  };
  const mainChartHeight = isDailyChart && chartPoints > 12 ? 240 : 200;
  const netChartHeight = isDailyChart && netCumulative.length > 12 ? 200 : 160;

  const lopOptions = useMemo(() => {
    if (!payload) return [];
    if (monHoc === "all") return payload.filters.lopHoc;
    const monId = Number(monHoc);
    return payload.filters.lopHoc.filter((l) => l.monHocId === monId);
  }, [payload, monHoc]);

  const periodPillClass = (active: boolean) =>
    cn(
      "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
      active
        ? "border border-[#E8527A]/40 bg-[#fff4eb] text-[#323232]"
        : "border border-transparent bg-black/[0.03] text-black/60 hover:bg-black/[0.06]",
    );

  const customDefaultHref = `${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_CUSTOM}?tu=${encodeURIComponent(customFrom)}&den=${encodeURIComponent(customTo)}`;

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">Theo dõi học viên</h2>
        </div>
        <Link
          href="/admin/dashboard/quan-ly-hoc-vien"
          className="inline-flex shrink-0 items-center rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-[#323232] shadow-sm transition hover:border-[#BC8AF9]/40 hover:bg-[#fafafa]"
        >
          Mở Quản lý học viên
        </Link>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-[#EDE8E9] bg-white/80 px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">Khoảng thời gian</span>
          <span className="truncate text-[11px] text-black/50">
            {payload?.rangeLabel ?? (loading ? "Đang tải…" : "—")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_ALL}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_ALL)}>
            Tất cả
          </Link>
          <Link href={`${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_WEEK}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_WEEK)}>
            Tuần
          </Link>
          <Link href={`${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_MONTH}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_MONTH)}>
            Tháng
          </Link>
          <Link href={`${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_QUARTER}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_QUARTER)}>
            Quý
          </Link>
          <Link href={`${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_YEAR}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_YEAR)}>
            Năm
          </Link>
          <Link href={customDefaultHref} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_CUSTOM)}>
            Từ … đến …
          </Link>
        </div>
        {overviewPeriodSlug === OVERVIEW_PERIOD_CUSTOM ? (
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#323232]">
              <span className="text-[#9E8A90]">Từ</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-[#EDE8E9] bg-white px-2 py-1 text-[12px] text-[#1a1a1a]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#323232]">
              <span className="text-[#9E8A90]">Đến</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-[#EDE8E9] bg-white px-2 py-1 text-[12px] text-[#1a1a1a]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                router.replace(
                  `${hvTrackingHrefPrefix}/${OVERVIEW_PERIOD_CUSTOM}?tu=${encodeURIComponent(customFrom)}&den=${encodeURIComponent(customTo)}`,
                );
              }}
              className="rounded-lg border border-[#E8527A]/40 bg-[#fff4eb] px-2.5 py-1 text-[11px] font-semibold text-[#323232] transition hover:bg-[#fdeef6]"
            >
              Áp dụng
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-[#EDE8E9] bg-white/80 px-3 py-3 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[11px] font-semibold text-[#323232]">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">Môn học</span>
          <select
            value={monHoc}
            onChange={(e) => {
              setMonHoc(e.target.value);
              setLopHoc("all");
            }}
            className="rounded-lg border border-[#EDE8E9] bg-white px-2.5 py-2 text-[12px] text-[#1a1a1a]"
          >
            <option value="all">Toàn trung tâm</option>
            {(payload?.filters.monHoc ?? []).map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.ten}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[11px] font-semibold text-[#323232]">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">Lớp học</span>
          <select
            value={lopHoc}
            onChange={(e) => setLopHoc(e.target.value)}
            disabled={monHoc === "all" && lopOptions.length === 0}
            className="rounded-lg border border-[#EDE8E9] bg-white px-2.5 py-2 text-[12px] text-[#1a1a1a] disabled:opacity-50"
          >
            <option value="all">{monHoc === "all" ? "Tất cả lớp" : "Tất cả lớp môn này"}</option>
            {lopOptions.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.ten}
              </option>
            ))}
          </select>
        </label>
        {payload?.mode === "enrollment" ? (
          <p className="mb-1 text-[11px] text-black/45">
            Lọc môn/lớp chỉ áp dụng nhóm <strong>ghi danh</strong>. Nhóm học viên luôn toàn trung tâm.
          </p>
        ) : (
          <p className="mb-1 text-[11px] text-black/45">
            Ghi danh: đã thu HP · ngày đầu / cuối kỳ. Học viên: tạo hồ sơ / TT tư vấn Nghỉ.
          </p>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">{error}</div>
      ) : null}

      {loading && !payload ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-black/50">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Đang tải dữ liệu học viên…
        </div>
      ) : payload ? (
        <>
          <div className="flex flex-col gap-3">
            <KpiGroupSection
              group="enrollment"
              metrics={payload.enrollment}
              metricGroup={metricGroup}
              chartFocus={chartFocus}
              onSelect={selectMetric}
            />
            <KpiGroupSection
              group="student"
              metrics={payload.student}
              metricGroup={metricGroup}
              chartFocus={chartFocus}
              onSelect={selectMetric}
            />
            <KpiCard
              label="Còn hạn (hôm nay)"
              value={fNum(payload.activeEnrollments)}
              sub="ghi danh đang học · snapshot QLHV"
              color={C.violet}
            />
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
              Không có dữ liệu trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row">
                {pieData.length > 0 && chartFocus !== "net" ? (
                  <Card className="flex min-w-0 shrink-0 flex-col items-center lg:w-[200px]">
                    <SecTitle color={C.green}>Tổng kỳ</SecTitle>
                    <div className="h-[150px] w-full max-w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={62}
                            dataKey="value"
                            paddingAngle={3}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => fNum(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-1 flex justify-center gap-4 text-[11px] text-[#9E8A90]">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: C.green }} /> {groupMeta.moi}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: C.red }} /> {groupMeta.nghi}
                      </span>
                    </div>
                  </Card>
                ) : null}
                <Card className="min-w-0 flex-1">
                  <SecTitle color={chartTitleColor}>{chartTitle}</SecTitle>
                  {isDailyChart ? (
                    <p className="-mt-2 mb-2 text-[10px] font-medium text-black/45">Mỗi điểm = một ngày (dd/mm)</p>
                  ) : null}
                  <div className="w-full" style={{ height: mainChartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mainChartData} margin={lineChartMargin}>
                        <CartesianGrid stroke={C.grid} vertical={false} />
                        <TrackingXAxis daily={isDailyChart} pointCount={chartPoints} tickFontSize={9} />
                        {chartFocus === "net" ? (
                          <NetChartYAxis tickFontSize={9} />
                        ) : (
                          <YAxis
                            tick={{ fontSize: 10, fill: C.muted }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                        )}
                        <Tooltip
                          formatter={(value, name) => [fNum(Number(value)), String(name)]}
                          labelFormatter={(label) => String(label)}
                        />
                        {(chartFocus === "compare" || chartFocus === "moi") && (
                          <Line
                            type="monotone"
                            dataKey="moi"
                            name={groupMeta.moi}
                            stroke={C.green}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: C.green }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {(chartFocus === "compare" || chartFocus === "nghi") && (
                          <Line
                            type="monotone"
                            dataKey="nghi"
                            name={groupMeta.nghi}
                            stroke={C.red}
                            strokeWidth={2.5}
                            strokeDasharray={chartFocus === "compare" ? "5 4" : undefined}
                            dot={{ r: 3, fill: C.red }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {chartFocus === "net" && (
                          <>
                            <NetZeroReferenceLine />
                            <Line
                              type="monotone"
                              dataKey="netCumulative"
                              name="Net tích lũy"
                              stroke={C.net}
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: C.net }}
                              activeDot={{ r: 5 }}
                            />
                          </>
                        )}
                        {chartFocus === "compare" ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
              {chartFocus !== "net" ? (
                <Card>
                  <SecTitle color={C.net}>Net tích lũy</SecTitle>
                  {isDailyChart ? (
                    <p className="-mt-2 mb-2 text-[10px] font-medium text-black/45">Mỗi điểm = một ngày (dd/mm)</p>
                  ) : null}
                  <div className="w-full" style={{ height: netChartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={netCumulative} margin={netChartMargin}>
                        <CartesianGrid stroke={C.grid} vertical={false} />
                        <TrackingXAxis daily={isDailyChart} pointCount={netCumulative.length} tickFontSize={10} />
                        <NetChartYAxis />
                        <Tooltip
                          formatter={(value) => [fNum(Number(value)), "Net tích lũy"]}
                          labelFormatter={(label) => String(label)}
                        />
                        <NetZeroReferenceLine />
                        <Line
                          type="monotone"
                          dataKey="netCumulative"
                          name="Net tích lũy"
                          stroke={C.net}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: C.net }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {loading && payload ? (
        <div className="pointer-events-none fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-[#EDE8E9] bg-white px-3 py-1.5 text-[11px] text-black/55 shadow-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang cập nhật…
        </div>
      ) : null}
    </div>
  );
}
