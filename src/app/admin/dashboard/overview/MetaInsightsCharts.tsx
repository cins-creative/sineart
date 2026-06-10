"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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

import type { MetaInsightsReport } from "@/lib/data/meta-marketing-insights";
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
  pink: "#E8527A",
  blue: "#4A7EC4",
  green: "#3A9E72",
  orange: "#E8855A",
  grid: "#F3EEEF",
  muted: "#9E8A90",
  prev: "#9E8A90",
} as const;

function fNum(v: number): string {
  return Math.round(v).toLocaleString("vi-VN");
}

function fMoney(v: number): string {
  return `${Math.round(v).toLocaleString("vi-VN")} ₫`;
}

function fDelta(v: number | null): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
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

function CompareKpi({
  label,
  value,
  delta,
  color,
  format = "num",
  tip,
}: {
  label: string;
  value: number;
  delta: number | null;
  color: string;
  format?: "num" | "money";
  tip: string;
}) {
  const deltaUp = delta != null && delta >= 0;
  return (
    <div
      className="min-w-[130px] flex-1 rounded-2xl border border-[#EDE8E9] bg-white px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div
        className="cursor-help text-[10px] font-extrabold tracking-wide text-[#9E8A90] underline decoration-dotted decoration-[#9E8A90]/40 underline-offset-2"
        title={tip}
      >
        {label}
      </div>
      <div className="mt-1 text-[20px] font-extrabold tabular-nums tracking-tight text-[#1a1a1a]">
        {format === "money" ? fMoney(value) : fNum(value)}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[11px] font-semibold tabular-nums",
          delta == null ? "text-black/40" : deltaUp ? "text-[#3A9E72]" : "text-[#DC2626]",
        )}
      >
        vs kỳ trước: {fDelta(delta)}
      </div>
    </div>
  );
}

function MetaSetupGuide() {
  return (
    <Card>
      <SecTitle color={C.blue}>Cấu hình Meta Graph API</SecTitle>
      <p className="mb-3 text-[12px] leading-relaxed text-black/60">
        Tab này đọc Fanpage + Ads trực tiếp từ Meta — thay nhập tay Marketing. Dùng{" "}
        <strong>System User token</strong> (Business Manager) để token không hết hạn 60 ngày.
      </p>
      <ol className="list-decimal space-y-2 pl-4 text-[12px] text-black/65">
        <li>Meta Developers → tạo App → thêm quyền Pages + Marketing API.</li>
        <li>Generate token với <code className="rounded bg-black/[0.04] px-1">read_insights</code> (bắt buộc — thiếu sẽ toàn 0),{" "}
          <code className="rounded bg-black/[0.04] px-1">pages_read_engagement</code>,{" "}
          <code className="rounded bg-black/[0.04] px-1">pages_show_list</code>,{" "}
          <code className="rounded bg-black/[0.04] px-1">business_management</code>,{" "}
          <code className="rounded bg-black/[0.04] px-1">ads_read</code> (Ads).
        </li>
        <li>Gán System User quyền Fanpage Sine Art + Ad Account.</li>
        <li>Env trên Vercel:
          <pre className="mt-1 overflow-x-auto rounded-lg bg-[#fafafa] p-2 text-[11px]">{`META_ACCESS_TOKEN=EAA...
META_PAGE_ID=123456789
META_AD_ACCOUNT_ID=act_123456789   # tuỳ chọn — Ads`}</pre>
        </li>
      </ol>
    </Card>
  );
}

type Props = {
  overviewPeriodSlug: OverviewPeriodSlug;
  customFromInitial: string;
  customToInitial: string;
  hrefPrefix: string;
};

export default function MetaInsightsCharts({
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
  const [payload, setPayload] = useState<MetaInsightsReport | null>(null);

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
      const res = await fetch(`/admin/api/overview/meta-insights?${qs.toString()}`);
      const json = (await res.json()) as MetaInsightsReport & { ok?: boolean; error?: string; code?: string };
      if (res.status === 503 || json.code === "not_configured") {
        setNotConfigured(true);
        setPayload(null);
        return;
      }
      if (!res.ok || json.ok === false || !json.timeSeries) {
        throw new Error(json.error ?? "Không tải được dữ liệu Meta.");
      }
      setPayload(json);
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
    () => (payload?.timeSeries ?? []).map((r) => ({ ...r, periodLabel: r.label })),
    [payload],
  );

  const compareBarData = useMemo(() => {
    if (!payload) return [];
    const cur = payload.totals;
    const prev = payload.compareTotals;
    const rows = [
      { metric: "Lượt xem FP", current: cur.pageMediaViews, previous: prev.pageMediaViews },
      { metric: "Tương tác", current: cur.pageEngagements, previous: prev.pageEngagements },
      { metric: "Theo dõi mới", current: cur.pageFollows, previous: prev.pageFollows },
    ];
    if (payload.hasAdAccount) {
      rows.push(
        { metric: "Tin nhắn Ads", current: cur.adMessages, previous: prev.adMessages },
        { metric: "Lượt bấm Ads", current: cur.adClicks, previous: prev.adClicks },
      );
    }
    return rows;
  }, [payload]);

  const periodPillClass = (active: boolean) =>
    cn(
      "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
      active
        ? "border border-[#E8527A]/40 bg-[#fff4eb] text-[#323232]"
        : "border border-transparent bg-black/[0.03] text-black/60 hover:bg-black/[0.06]",
    );

  const customDefaultHref = `${hrefPrefix}/${OVERVIEW_PERIOD_CUSTOM}?tu=${encodeURIComponent(customFrom)}&den=${encodeURIComponent(customTo)}`;
  const isMonthly = payload?.granularity === "month";

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div>
        <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">
          Meta — Fanpage &amp; Ads{payload?.pageName ? `: ${payload.pageName}` : ""}
        </h2>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-[#EDE8E9] bg-white/80 px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">Khoảng thời gian</span>
          <span className="truncate text-[11px] text-black/50">
            {payload?.rangeLabel ?? (loading ? "Đang tải…" : "—")}
            {payload ? ` · so với ${payload.compareRangeLabel}` : null}
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
            <label className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="text-[#9E8A90]">Từ</span>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-[#EDE8E9] px-2 py-1 text-[12px]" />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="text-[#9E8A90]">Đến</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-[#EDE8E9] px-2 py-1 text-[12px]" />
            </label>
            <button
              type="button"
              onClick={() =>
                router.replace(
                  `${hrefPrefix}/${OVERVIEW_PERIOD_CUSTOM}?tu=${encodeURIComponent(customFrom)}&den=${encodeURIComponent(customTo)}`,
                )
              }
              className="rounded-lg border border-[#E8527A]/40 bg-[#fff4eb] px-2.5 py-1 text-[11px] font-semibold"
            >
              Áp dụng
            </button>
          </div>
        ) : null}
      </div>

      {notConfigured ? <MetaSetupGuide /> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">{error}</div> : null}

      {loading && !payload && !notConfigured ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-black/50">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Đang tải dữ liệu Meta…
        </div>
      ) : null}

      {payload ? (
        <>
          <div className="flex flex-wrap gap-2.5">
            <CompareKpi
              label="Lượt xem Fanpage"
              value={payload.totals.pageMediaViews}
              delta={payload.deltas.pageMediaViews}
              color={C.blue}
              tip="Số lần nội dung Fanpage (ảnh, video, bài viết) được xem trong kỳ."
            />
            <CompareKpi
              label="Tương tác nội dung"
              value={payload.totals.pageEngagements}
              delta={payload.deltas.pageEngagements}
              color={C.green}
              tip="Tổng lượt thích, bình luận, chia sẻ và tương tác khác với bài đăng Fanpage."
            />
            <CompareKpi
              label="Theo dõi mới (ngày)"
              value={payload.totals.pageFollows}
              delta={payload.deltas.pageFollows}
              color={C.blue}
              tip="Số người mới theo dõi Fanpage mỗi ngày — cộng dồn trong kỳ đã chọn."
            />
            {payload.hasAdAccount ? (
              <>
                <CompareKpi
                  label="Chi phí quảng cáo"
                  value={payload.totals.adSpend}
                  delta={payload.deltas.adSpend}
                  color={C.pink}
                  format="money"
                  tip="Tổng tiền đã chi cho quảng cáo Meta (Facebook/Instagram) trong kỳ."
                />
                <CompareKpi
                  label="Tin nhắn từ Ads"
                  value={payload.totals.adMessages}
                  delta={payload.deltas.adMessages}
                  color={C.orange}
                  tip="Số tin nhắn Messenger mà khách gửi sau khi bấm vào quảng cáo."
                />
                <CompareKpi
                  label="Lượt bấm link quảng cáo"
                  value={payload.totals.adClicks}
                  delta={payload.deltas.adClicks}
                  color={C.pink}
                  tip="Số lần người dùng bấm vào link trong quảng cáo (đến website hoặc trang đích)."
                />
              </>
            ) : null}
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
              Không có dữ liệu Meta trong khoảng đã chọn.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Card>
                <SecTitle color={C.blue}>Fanpage theo thời gian{isMonthly ? " (tháng)" : " (ngày)"}</SecTitle>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v, n) => [fNum(Number(v)), String(n)]} />
                      <Bar yAxisId="left" dataKey="pageMediaViews" name="Lượt xem" fill={C.blue} radius={[3, 3, 0, 0]} barSize={14} />
                      <Line yAxisId="right" type="monotone" dataKey="pageEngagements" name="Tương tác" stroke={C.green} strokeWidth={2} dot={{ r: 2 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {payload.hasAdAccount ? (
                <Card>
                  <SecTitle color={C.pink}>Ads theo thời gian</SecTitle>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke={C.grid} vertical={false} />
                        <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v, n) => [fNum(Number(v)), String(n)]} />
                        <Bar yAxisId="left" dataKey="adSpend" name="Chi phí (₫)" fill={C.pink} radius={[3, 3, 0, 0]} barSize={14} />
                        <Line yAxisId="right" type="monotone" dataKey="adMessages" name="Tin nhắn" stroke={C.orange} strokeWidth={2} dot={{ r: 2 }} />
                        <Line yAxisId="right" type="monotone" dataKey="adClicks" name="Lượt bấm link" stroke={C.blue} strokeWidth={2} strokeDasharray="4 2" dot={false} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null}

              <Card>
                <SecTitle color={C.orange}>So sánh kỳ hiện tại vs kỳ trước</SecTitle>
                <p className="-mt-2 mb-2 text-[10px] text-black/45">
                  Kỳ trước: {payload.compareRangeLabel} — cùng số ngày với kỳ đang chọn.
                </p>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareBarData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid stroke={C.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="metric" width={100} tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v) => fNum(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="current" name="Kỳ này" fill={C.blue} radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="previous" name="Kỳ trước" fill={C.prev} radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
