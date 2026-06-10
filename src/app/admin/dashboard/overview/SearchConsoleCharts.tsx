"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SearchConsoleReport } from "@/lib/data/search-console-gsc";
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
  blue: "#4A7EC4",
  pink: "#E8527A",
  green: "#3A9E72",
  grid: "#F3EEEF",
  muted: "#9E8A90",
} as const;

function fNum(v: number): string {
  return Math.round(v).toLocaleString("vi-VN");
}

function fPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function fPos(v: number): string {
  return v.toFixed(1);
}

function fK(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
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

function KpiCard({
  label,
  value,
  sub,
  color,
  tip,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  tip: string;
}) {
  return (
    <div
      className="min-w-[120px] flex-1 rounded-2xl border border-[#EDE8E9] bg-white px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div
        className="cursor-help text-[10px] font-extrabold tracking-wide text-[#9E8A90] underline decoration-dotted decoration-[#9E8A90]/40 underline-offset-2"
        title={tip}
      >
        {label}
      </div>
      <div className="mt-1 text-[22px] font-extrabold tabular-nums tracking-tight text-[#1a1a1a]">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-black/50">{sub}</div> : null}
    </div>
  );
}

type Props = {
  overviewPeriodSlug: OverviewPeriodSlug;
  customFromInitial: string;
  customToInitial: string;
  hrefPrefix: string;
};

export function SearchConsoleCharts({
  overviewPeriodSlug,
  customFromInitial,
  customToInitial,
  hrefPrefix,
}: Props) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(customFromInitial);
  const [customTo, setCustomTo] = useState(customToInitial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [payload, setPayload] = useState<SearchConsoleReport | null>(null);

  useEffect(() => {
    setCustomFrom(customFromInitial);
    setCustomTo(customToInitial);
  }, [customFromInitial, customToInitial]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const qs = new URLSearchParams({ period: overviewPeriodSlug });
      if (overviewPeriodSlug === OVERVIEW_PERIOD_CUSTOM) {
        qs.set("tu", customFrom);
        qs.set("den", customTo);
      }
      const res = await fetch(`/admin/api/overview/search-console?${qs.toString()}`);
      const json = (await res.json()) as SearchConsoleReport & {
        ok?: boolean;
        error?: string;
        code?: string;
      };
      if (res.status === 503 || json.code === "not_configured") {
        setNotConfigured(true);
        setPayload(null);
        return;
      }
      if (!res.ok || json.ok === false || !json.timeSeries) {
        throw new Error(json.error ?? "Không tải được dữ liệu Search Console.");
      }
      setPayload({
        rangeLabel: json.rangeLabel,
        granularity: json.granularity,
        dataLagNote: json.dataLagNote,
        totals: json.totals,
        timeSeries: json.timeSeries,
        topQueries: json.topQueries,
        topPages: json.topPages,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [overviewPeriodSlug, customFrom, customTo]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const chartData = useMemo(
    () =>
      (payload?.timeSeries ?? []).map((row) => ({
        ...row,
        periodLabel: row.label,
      })),
    [payload],
  );

  const topQueriesChart = useMemo(
    () =>
      (payload?.topQueries ?? []).slice(0, 12).map((q) => ({
        ...q,
        shortQuery: q.query.length > 32 ? `${q.query.slice(0, 30)}…` : q.query,
      })),
    [payload],
  );

  const topPagesChart = useMemo(
    () =>
      (payload?.topPages ?? []).slice(0, 12).map((p) => {
        let path = p.page;
        try {
          const u = new URL(p.page);
          path = u.pathname || p.page;
        } catch {
          /* giữ nguyên */
        }
        return {
          ...p,
          path,
          shortPath: path.length > 36 ? `${path.slice(0, 34)}…` : path,
        };
      }),
    [payload],
  );

  const isMonthly = payload?.granularity === "month";
  const denseDaily = !isMonthly && chartData.length > 14;

  const periodPillClass = (active: boolean) =>
    cn(
      "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
      active
        ? "border border-[#E8527A]/40 bg-[#fff4eb] text-[#323232]"
        : "border border-transparent bg-black/[0.03] text-black/60 hover:bg-black/[0.06]",
    );

  const customDefaultHref = `${hrefPrefix}/${OVERVIEW_PERIOD_CUSTOM}?tu=${encodeURIComponent(customFrom)}&den=${encodeURIComponent(customTo)}`;

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div>
        <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">Google Search</h2>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-[#EDE8E9] bg-white/80 px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">Khoảng thời gian</span>
          <span className="truncate text-[11px] text-black/50">
            {payload?.rangeLabel ?? (loading ? "Đang tải…" : "—")}
            {payload ? (isMonthly ? " · theo tháng" : " · theo ngày") : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`${hrefPrefix}/${OVERVIEW_PERIOD_ALL}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_ALL)}>
            12 tháng
          </Link>
          <Link href={`${hrefPrefix}/${OVERVIEW_PERIOD_YEAR}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_YEAR)}>
            Năm
          </Link>
          <Link href={`${hrefPrefix}/${OVERVIEW_PERIOD_QUARTER}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_QUARTER)}>
            Quý
          </Link>
          <Link href={`${hrefPrefix}/${OVERVIEW_PERIOD_MONTH}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_MONTH)}>
            Tháng
          </Link>
          <Link href={`${hrefPrefix}/${OVERVIEW_PERIOD_WEEK}`} className={periodPillClass(overviewPeriodSlug === OVERVIEW_PERIOD_WEEK)}>
            Tuần
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
                className="rounded-lg border border-[#EDE8E9] bg-white px-2 py-1 text-[12px]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#323232]">
              <span className="text-[#9E8A90]">Đến</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-[#EDE8E9] bg-white px-2 py-1 text-[12px]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                router.replace(
                  `${hrefPrefix}/${OVERVIEW_PERIOD_CUSTOM}?tu=${encodeURIComponent(customFrom)}&den=${encodeURIComponent(customTo)}`,
                );
              }}
              className="rounded-lg border border-[#E8527A]/40 bg-[#fff4eb] px-2.5 py-1 text-[11px] font-semibold text-[#323232]"
            >
              Áp dụng
            </button>
          </div>
        ) : null}
      </div>

      {notConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-950">
          Chưa cấu hình GSC — thêm <code className="rounded bg-black/[0.04] px-1">GSC_SITE_URL</code> và{" "}
          <code className="rounded bg-black/[0.04] px-1">GSC_OAUTH_*</code> rồi restart / redeploy.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-800">
          {error}
        </div>
      ) : null}

      {loading && !payload && !notConfigured ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-black/50">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Đang tải dữ liệu Search Console…
        </div>
      ) : null}

      {payload ? (
        <>
          <div className="flex flex-wrap gap-2.5">
            <KpiCard
              label="Lượt bấm"
              value={fNum(payload.totals.clicks)}
              sub="từ Google Search"
              color={C.blue}
              tip="Số lần người dùng bấm vào website từ kết quả tìm kiếm Google."
            />
            <KpiCard
              label="Lượt hiển thị"
              value={fNum(payload.totals.impressions)}
              sub="trên trang kết quả"
              color={C.pink}
              tip="Số lần trang xuất hiện trên Google — người dùng có thể thấy mà chưa bấm."
            />
            <KpiCard
              label="Tỷ lệ bấm"
              value={fPct(payload.totals.ctr)}
              color={C.green}
              tip="Lượt bấm ÷ lượt hiển thị. Càng cao, tiêu đề và mô tả trên Google càng hấp dẫn."
            />
            <KpiCard
              label="Vị trí TB"
              value={fPos(payload.totals.position)}
              sub="càng thấp càng tốt"
              color={C.blue}
              tip="Thứ hạng trung bình trên Google. Số nhỏ hơn nghĩa là gần đầu trang hơn."
            />
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
              Chưa có dữ liệu trong khoảng đã chọn — GSC có thể trễ 2–3 ngày.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Card>
                <SecTitle color={C.blue}>Lượt bấm &amp; hiển thị theo thời gian</SecTitle>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: denseDaily ? 22 : 4 }}>
                      <defs>
                        <linearGradient id="gscImp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.pink} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={C.pink} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis
                        dataKey="periodLabel"
                        interval={denseDaily ? 0 : "preserveStartEnd"}
                        angle={denseDaily ? -42 : 0}
                        textAnchor={denseDaily ? "end" : "middle"}
                        height={denseDaily ? 48 : 28}
                        tick={{ fontSize: denseDaily ? 8 : 10, fill: C.muted }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fK} />
                      <Tooltip
                        formatter={(value, name) => [fNum(Number(value)), String(name)]}
                        labelFormatter={(label) => String(label)}
                      />
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        name="Lượt hiển thị"
                        stroke={C.pink}
                        fill="url(#gscImp)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        name="Lượt bấm"
                        stroke={C.blue}
                        strokeWidth={2}
                        dot={{ r: 2, fill: C.blue }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {topQueriesChart.length > 0 ? (
                <Card>
                  <SecTitle color={C.green}>Top từ khóa (lượt bấm)</SecTitle>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topQueriesChart}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid stroke={C.grid} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={fK} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="shortQuery"
                          width={140}
                          tick={{ fontSize: 9, fill: C.muted }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value, name) => [fNum(Number(value)), String(name)]}
                          labelFormatter={(_, items) => {
                            const row = items?.[0]?.payload as { query?: string } | undefined;
                            return row?.query ?? "";
                          }}
                        />
                        <Bar dataKey="clicks" name="Lượt bấm" fill={C.blue} radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null}

              {topPagesChart.length > 0 ? (
                <Card>
                  <SecTitle color={C.blue}>Top trang (lượt bấm từ Google)</SecTitle>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topPagesChart}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid stroke={C.grid} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={fK} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="shortPath"
                          width={140}
                          tick={{ fontSize: 9, fill: C.muted }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value, name) => [fNum(Number(value)), String(name)]}
                          labelFormatter={(_, items) => {
                            const row = items?.[0]?.payload as { page?: string } | undefined;
                            return row?.page ?? "";
                          }}
                        />
                        <Bar dataKey="clicks" name="Lượt bấm" fill={C.green} radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null}

              {payload.topQueries.length > 0 ? (
                <Card className="overflow-x-auto">
                  <SecTitle color={C.green}>Chi tiết từ khóa</SecTitle>
                  <table className="w-full min-w-[520px] border-collapse text-[12px]">
                    <thead>
                      <tr className="border-b border-[#EDE8E9] text-left text-[10px] uppercase tracking-wide text-[#9E8A90]">
                        <th className="py-2 pr-3 font-extrabold">Từ khóa</th>
                        <th className="py-2 pr-3 font-extrabold text-right" title="Số lần bấm từ Google">
                          Lượt bấm
                        </th>
                        <th className="py-2 pr-3 font-extrabold text-right" title="Số lần hiển thị trên Google">
                          Hiển thị
                        </th>
                        <th className="py-2 pr-3 font-extrabold text-right" title="Tỷ lệ bấm ÷ hiển thị">
                          Tỷ lệ bấm
                        </th>
                        <th className="py-2 font-extrabold text-right" title="Vị trí trung bình trên Google">
                          Vị trí
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payload.topQueries.map((row) => (
                        <tr key={row.query} className="border-b border-[#F3EEEF] last:border-0">
                          <td className="max-w-[240px] truncate py-2 pr-3 font-medium text-[#323232]" title={row.query}>
                            {row.query}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fNum(row.clicks)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fNum(row.impressions)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fPct(row.ctr)}</td>
                          <td className="py-2 text-right tabular-nums">{fPos(row.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
