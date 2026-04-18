"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MK_INPUT_COLS, type MkDataAnalysisRow, type MkNumericKey } from "@/lib/data/admin-report-mkt";
import { cn } from "@/lib/utils";

import {
  filterMkRowsByRange,
  formatYMDLocal,
  formatYmdVi,
  resolveActiveRange,
  type MkDatePreset,
} from "./marketing-date-range";
import { colIsPct, rowsToChartData, sortMkRowsByDate, withNetCumulative } from "./marketing-series";

/** Palette tham khảo Framer `MKT analystic.txt` — chỉ dùng cột có trong `MK_INPUT_COLS` / bảng nhập liệu. */
const C = {
  pink: "#E8527A",
  orange: "#E8855A",
  peach: "#F2B49A",
  blue: "#4A7EC4",
  amber: "#C4923A",
  green: "#3A9E72",
  border: "#EDE8E9",
  grid: "#F3EEEF",
  muted: "#9E8A90",
} as const;

type DashTab = "ads" | "hocvien" | "fanpage" | "web" | "group";

function fNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString("vi-VN");
}

function fK(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

function compactTick(n: number): string {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}B`;
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
};

function MkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-[min(360px,92vw)] rounded-[10px] border border-[#EDE8E9] bg-white px-3.5 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
      <div className="mb-1.5 font-bold text-[#1a1a2e]">{label}</div>
      <ul className="m-0 space-y-1 p-0">
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? "");
          const col = MK_INPUT_COLS.find((c) => c.key === key);
          const v = item.value;
          const num = typeof v === "number" ? v : Number(v);
          const display =
            col != null && colIsPct(col)
              ? `${Number.isFinite(num) ? num.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "—"}%`
              : Number.isFinite(num)
                ? compactTick(num)
                : "—";
          return (
            <li key={i} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2 text-black/70">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[#1a1a2e]">{display}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tooltip cho chuỗi `net` / CTR không có trong MK_INPUT_COLS */
function SimpleTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-[min(360px,92vw)] rounded-[10px] border border-[#EDE8E9] bg-white px-3.5 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
      <div className="mb-1.5 font-bold text-[#1a1a2e]">{label}</div>
      <ul className="m-0 space-y-1 p-0">
        {payload.map((item, i) => {
          const v = item.value;
          const num = typeof v === "number" ? v : Number(v);
          return (
            <li key={i} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2 text-black/70">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[#1a1a2e]">
                {Number.isFinite(num) ? `${compactTick(num)}${suffix}` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
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

function KpiCard({
  label,
  value,
  sub,
  extra,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Dòng phụ (ví dụ «Đang học — tổng») — hiển thị dưới `sub`. */
  extra?: string;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-[14px] border border-[#EDE8E9] bg-white px-4 py-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="text-lg" aria-hidden>
        {icon}
      </div>
      <div className="text-xl font-extrabold tracking-tight text-[#1C1C1E]">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#9E8A90]">{label}</div>
      {sub ? <div className="text-[10px] text-[#9E8A90]">{sub}</div> : null}
      {extra ? (
        <div className="mt-0.5 text-[10px] font-semibold leading-snug text-emerald-800/90">{extra}</div>
      ) : null}
    </div>
  );
}

type Props = {
  rows: MkDataAnalysisRow[];
  hocVienDangHoc: number | null;
};

export default function MarketingDataAnalysisCharts({ rows, hocVienDangHoc }: Props) {
  const sorted = useMemo(() => sortMkRowsByDate(rows), [rows]);

  const [datePreset, setDatePreset] = useState<MkDatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activeRange = useMemo(
    () => resolveActiveRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const filteredSorted = useMemo(
    () => filterMkRowsByRange(sorted, activeRange),
    [sorted, activeRange],
  );

  const chartData = useMemo(() => rowsToChartData(filteredSorted), [filteredSorted]);
  const chartWithNet = useMemo(() => withNetCumulative(chartData), [chartData]);

  const [dashTab, setDashTab] = useState<DashTab>("ads");

  const latest = chartData[chartData.length - 1];
  const totalHVMoi = useMemo(
    () => filteredSorted.reduce((s, r) => s + (r.fb_hoc_vien_moi ?? 0), 0),
    [filteredSorted],
  );
  const totalHVNghi = useMemo(
    () => filteredSorted.reduce((s, r) => s + (r.fb_hoc_vien_nghi ?? 0), 0),
    [filteredSorted],
  );
  const avgCTD = useMemo(() => {
    const valid = filteredSorted.filter((r) => r.ti_le_chuyen_doi_sang_hoc_vien != null);
    if (!valid.length) return null;
    const sum = valid.reduce((s, r) => s + (r.ti_le_chuyen_doi_sang_hoc_vien ?? 0), 0);
    return sum / valid.length;
  }, [filteredSorted]);

  const pieData = useMemo(
    () => [
      { name: "Mới", value: Math.max(0, totalHVMoi) },
      { name: "Nghỉ", value: Math.max(0, totalHVNghi) },
    ],
    [totalHVMoi, totalHVNghi],
  );

  const bounceData = useMemo(() => chartData.filter((r) => r.web_ti_le_thoat_bounce_rate != null), [chartData]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#EAEAEA] bg-white px-6 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          📉
        </span>
        <p className="m-0 max-w-md text-sm leading-relaxed text-black/55">
          Chưa có kỳ dữ liệu marketing. Thêm kỳ và nhập số tại{" "}
          <Link href="/admin/dashboard/report-mkt" className="font-semibold text-[#BC8AF9] underline-offset-2 hover:underline">
            Marketing analytics
          </Link>
          .
        </p>
      </div>
    );
  }

  const tabBtn = (id: DashTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setDashTab(id)}
      className={cn(
        "rounded-full border-[1.5px] px-3.5 py-1.5 text-[12px] font-semibold transition",
        dashTab === id
          ? "border-[#E8527A] bg-[#E8527A] text-white"
          : "border-[#EDE8E9] bg-white text-[#9E8A90] hover:border-black/10",
      )}
    >
      {label}
    </button>
  );

  const startCustomFromToday = () => {
    const t = new Date();
    setCustomTo(formatYMDLocal(t));
    setCustomFrom(formatYMDLocal(new Date(t.getFullYear(), t.getMonth(), 1)));
  };

  const rangeFilterBtn = (id: MkDatePreset, label: string, title: string) => (
    <button
      key={id}
      type="button"
      title={title}
      onClick={() => {
        if (id === "custom") {
          setDatePreset("custom");
          startCustomFromToday();
        } else {
          setDatePreset(id);
        }
      }}
      className={cn(
        "rounded-full border-[1.5px] px-2.5 py-1 text-[11px] font-semibold transition",
        datePreset === id
          ? "border-[#E8527A] bg-[#E8527A] text-white"
          : "border-[#EDE8E9] bg-white text-[#9E8A90] hover:border-black/10",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">Marketing Data Analysis</h2>
        <Link
          href="/admin/dashboard/report-mkt"
          className="inline-flex shrink-0 items-center rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-[#323232] shadow-sm transition hover:border-[#BC8AF9]/40 hover:bg-[#fafafa]"
        >
          Mở bảng nhập liệu
        </Link>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-[#EDE8E9] bg-white/80 px-3 py-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9E8A90]">
            Khoảng thời gian
          </span>
          <span className="truncate text-[11px] text-black/50">
            {activeRange ? (
              <>
                {formatYmdVi(activeRange.startYmd)} → {formatYmdVi(activeRange.endYmd)}
              </>
            ) : (
              "Toàn bộ các kỳ đã nhập"
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {rangeFilterBtn("all", "Tất cả", "Mọi kỳ trong bảng")}
          {rangeFilterBtn("week", "Tuần", "7 ngày gần nhất (đến hôm nay)")}
          {rangeFilterBtn("month", "Tháng", "Đầu tháng đến hôm nay")}
          {rangeFilterBtn("quarter", "Quý", "Đầu quý đến hôm nay")}
          {rangeFilterBtn("year", "Năm", "1/1 đến hôm nay")}
          {rangeFilterBtn("custom", "Từ … đến …", "Chọn ngày cụ thể")}
        </div>
        {datePreset === "custom" ? (
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
          </div>
        ) : null}
      </div>

      {sorted.length > 0 && filteredSorted.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-950">
          Không có kỳ nào trong khoảng đã chọn (hoặc kỳ không có ngày hợp lệ).
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <KpiCard
          label="Học viên mới"
          value={fNum(totalHVMoi)}
          sub={`−${fNum(totalHVNghi)} nghỉ`}
          extra={
            hocVienDangHoc != null
              ? `Đang học — tổng (${fNum(hocVienDangHoc)})`
              : undefined
          }
          icon="🎓"
          color={C.pink}
        />
        <KpiCard
          label="Net HV"
          value={`${totalHVMoi - totalHVNghi >= 0 ? "+" : ""}${fNum(totalHVMoi - totalHVNghi)}`}
          sub={activeRange ? "trong khoảng chọn" : "tổng kỳ"}
          icon="📈"
          color={C.green}
        />
        <KpiCard
          label="Tỉ lệ CĐ TB"
          value={avgCTD == null ? "—" : `${(avgCTD * 100).toFixed(1)}%`}
          sub="→ Học viên"
          icon="🎯"
          color={C.orange}
        />
        <KpiCard
          label="Lượt xem"
          value={latest?.luot_xem != null && Number.isFinite(latest.luot_xem) ? fK(latest.luot_xem) : "—"}
          sub="kỳ gần nhất"
          icon="👁"
          color={C.blue}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Nhóm biểu đồ">
        {tabBtn("ads", "Ads")}
        {tabBtn("hocvien", "Học viên")}
        {tabBtn("fanpage", "Fanpage")}
        {tabBtn("web", "Web")}
        {tabBtn("group", "Group")}
      </div>

      {dashTab === "ads" ? (
        <div className="flex flex-col gap-3">
          <Card>
            <SecTitle color={C.pink}>Tin nhắn theo kỳ</SecTitle>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mkGads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.pink} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.pink} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mkGnat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.orange} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fK} />
                  <Tooltip content={<MkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="fb_tin_nhan_ads"
                    name="Tin nhắn Ads"
                    stroke={C.pink}
                    fill="url(#mkGads)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="fb_tin_nhan_tu_nhien"
                    name="Tin nhắn tự nhiên"
                    stroke={C.orange}
                    fill="url(#mkGnat)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SecTitle color={C.orange}>Tỉ lệ chuyển đổi → Học viên</SecTitle>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                  />
                  <Tooltip content={<MkTooltip />} />
                  <Bar dataKey="ti_le_chuyen_doi_sang_hoc_vien" name="Tỉ lệ CĐ → HV" radius={[5, 5, 0, 0]} maxBarSize={26}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? C.orange : C.peach} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SecTitle color={C.pink}>Chi phí theo kỳ</SecTitle>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fK}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fK}
                    width={48}
                  />
                  <Tooltip content={<MkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="chi_phi_chay_ads"
                    name="Chi phí chạy Ads"
                    stroke={C.pink}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="chi_phi_trung_binh_mot_tin_nhan"
                    name="Chi phí TB / tin nhắn"
                    stroke={C.amber}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}

      {dashTab === "hocvien" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Card className="flex min-w-0 shrink-0 flex-col items-center lg:w-[200px]">
              <SecTitle color={C.pink}>Tổng kỳ</SecTitle>
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
                      <Cell fill={C.pink} />
                      <Cell fill={C.peach} />
                    </Pie>
                    <Tooltip formatter={(value) => fNum(value == null ? NaN : Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex justify-center gap-4 text-[11px] text-[#9E8A90]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: C.pink }} /> Mới
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: C.peach }} /> Nghỉ
                </span>
              </div>
            </Card>
            <Card className="min-w-0 flex-1">
              <SecTitle color={C.orange}>Mới vs Nghỉ mỗi kỳ</SecTitle>
              <div className="h-[165px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 6, right: 6, left: -8, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 9, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<MkTooltip />} />
                    <Bar dataKey="fb_hoc_vien_moi" name="Mới" fill={C.pink} radius={[4, 4, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="fb_hoc_vien_nghi" name="Nghỉ" fill={C.peach} radius={[4, 4, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <Card>
            <SecTitle color={C.green}>Net học viên tích lũy</SecTitle>
            <div className="h-[130px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartWithNet} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <Tooltip content={<SimpleTooltip suffix="" />} />
                  <Line type="monotone" dataKey="net" name="Net tích lũy" stroke={C.green} strokeWidth={2.5} dot={{ r: 3, fill: C.green }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}

      {dashTab === "fanpage" ? (
        <div className="flex flex-col gap-3">
          <Card>
            <SecTitle color={C.pink}>Lượt xem &amp; Người xem</SecTitle>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fK} />
                  <Tooltip content={<MkTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="luot_xem"
                    name="Lượt xem"
                    stroke={C.pink}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: C.pink }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="nguoi_xem"
                    name="Người xem"
                    stroke={C.orange}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3, fill: C.orange }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["fb_luot_tuong_tac_voi_noi_dung", "Lượt tương tác", C.blue] as const,
                ["fb_luot_truy_cap", "Lượt truy cập", C.orange] as const,
              ] as const
            ).map(([key, title, stroke]) => (
              <Card key={key}>
                <SecTitle color={stroke}>{title}</SecTitle>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`mkFan${key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={stroke} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="periodLabel" tick={{ fontSize: 9, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip content={<MkTooltip />} />
                      <Area
                        type="monotone"
                        dataKey={key as MkNumericKey}
                        name={title}
                        stroke={stroke}
                        fill={`url(#mkFan${key})`}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <SecTitle color={C.blue}>Theo dõi, phản hồi, CTR &amp; nội dung</SecTitle>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 36, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fK}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: C.muted }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <Tooltip content={<MkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="fb_luot_theo_doi"
                    name="Lượt theo dõi"
                    stroke={C.pink}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="fb_so_luot_click_vao_lien_ket_ctr"
                    name="CTR (click link)"
                    stroke={C.amber}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="fb_so_luong_noi_dung_dang"
                    name="Số nội dung đăng"
                    stroke={C.green}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fb_toc_do_phan_hoi_tin_nhan"
                    name="Tốc độ phản hồi"
                    stroke={C.blue}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}

      {dashTab === "web" ? (
        <div className="flex flex-col gap-3">
          <Card>
            <SecTitle color={C.blue}>Pageviews &amp; Người vào web</SecTitle>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mkWebPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.blue} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fK} />
                  <Tooltip content={<MkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="web_tong_pageviews"
                    name="Tổng Pageviews"
                    stroke={C.blue}
                    fill="url(#mkWebPv)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="web_so_nguoi_vao_web"
                    name="Người vào web"
                    stroke={C.pink}
                    strokeWidth={2}
                    dot={{ r: 3, fill: C.pink }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <SecTitle color={C.amber}>Bounce Rate</SecTitle>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bounceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: C.muted }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    />
                    <Tooltip content={<MkTooltip />} />
                    <Bar dataKey="web_ti_le_thoat_bounce_rate" name="Bounce Rate" radius={[5, 5, 0, 0]} maxBarSize={26}>
                      {bounceData.map((r, i) => (
                        <Cell
                          key={i}
                          fill={(r.web_ti_le_thoat_bounce_rate ?? 0) > 70 ? C.pink : C.peach}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <SecTitle color={C.green}>Thời gian TB (giây)</SecTitle>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<MkTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="web_thoi_gian_trung_binh_s"
                      name="Thời gian TB (giây)"
                      stroke={C.green}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {dashTab === "group" ? (
        <div className="flex flex-col gap-3">
          <Card>
            <SecTitle color={C.green}>Thành viên hoạt động</SecTitle>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fK} />
                  <Tooltip content={<MkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="group_hv_thanh_vien_hoat_dong"
                    name="Group HV hoạt động"
                    stroke={C.green}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="group_st_thanh_vien_hoat_dong"
                    name="Group ST hoạt động"
                    stroke={C.orange}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <SecTitle color={C.blue}>Nội dung mới &amp; yêu cầu tham gia</SecTitle>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fK} />
                  <Tooltip content={<MkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="group_hv_noi_dung_moi" name="Nội dung mới (HV)" stroke={C.pink} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  <Line type="monotone" dataKey="group_st_noi_dung_moi" name="Nội dung mới (ST)" stroke={C.peach} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  <Line
                    type="monotone"
                    dataKey="group_hv_yeu_cau_tham_gia"
                    name="Yêu cầu tham gia (HV)"
                    stroke={C.blue}
                    strokeWidth={2}
                    strokeDasharray="3 2"
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="group_st_yeu_cau_tham_gia"
                    name="Yêu cầu tham gia (ST)"
                    stroke={C.amber}
                    strokeWidth={2}
                    strokeDasharray="3 2"
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
