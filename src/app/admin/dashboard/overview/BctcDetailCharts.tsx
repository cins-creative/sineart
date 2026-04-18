"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BaoCaoColumn } from "@/lib/data/bao-cao-tai-chinh-config";
import { cn } from "@/lib/utils";

import {
  buildBctcSeriesData,
  fmtMoneyCompact,
  fmtMoneyFull,
  type BctcPeriodDatum,
} from "./bctc-chart-helpers";

const C = {
  grid: "#E8E4E5",
  muted: "#9E8A90",
} as const;

/** Xu hướng P&amp;L + thuế (chi tiết hơn tab tổng quan). */
const DETAIL_PLL_KEYS = [
  "_dtThuan",
  "_tongCP",
  "_tongLuong",
  "_tongThue",
  "_lnTruocThue",
  "_lnSauThue",
] as const;

const DETAIL_PLL_META: { rowKey: string; label: string; color: string }[] = [
  { rowKey: "_dtThuan", label: "DT thuần BH & DV", color: "#3b82f6" },
  { rowKey: "_tongCP", label: "Tổng chi phí", color: "#ef4444" },
  { rowKey: "_tongLuong", label: "Tổng lương", color: "#f59e0b" },
  { rowKey: "_tongThue", label: "Tổng thuế & BHXH", color: "#64748b" },
  { rowKey: "_lnTruocThue", label: "LN trước thuế", color: "#8b5cf6" },
  { rowKey: "_lnSauThue", label: "LN sau thuế (~6%)", color: "#10b981" },
];

/** Cơ cấu doanh thu theo nhóm (công thức trong bảng). */
const DETAIL_REV_KEYS = ["_dtTTM", "_dtHinhHoa", "_dtBCM", "_dtOnline", "_dtOffline"] as const;

const DETAIL_REV_META: { rowKey: string; label: string; color: string }[] = [
  { rowKey: "_dtTTM", label: "DT TTM", color: "#E8527A" },
  { rowKey: "_dtHinhHoa", label: "DT Hình họa", color: "#f97316" },
  { rowKey: "_dtBCM", label: "DT BCM", color: "#a855f7" },
  { rowKey: "_dtOnline", label: "Tổng DT Online", color: "#0ea5e9" },
  { rowKey: "_dtOffline", label: "Tổng DT Offline", color: "#059669" },
];

type Props = { columns: BaoCaoColumn[] };

function BctcTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-[min(380px,92vw)] rounded-[10px] border border-[#EDE8E9] bg-white px-3.5 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
      <div className="mb-1.5 font-bold text-[#1a1a2e]">{label}</div>
      <ul className="m-0 space-y-1 p-0">
        {payload.map((item, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2 text-black/70">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-[#1a1a2e]">{fmtMoneyFull(Number(item.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BctcDetailCharts({ columns }: Props) {
  const pllKeys = useMemo(() => [...DETAIL_PLL_KEYS], []);
  const revKeys = useMemo(() => [...DETAIL_REV_KEYS], []);

  const dataPll = useMemo(() => buildBctcSeriesData(columns, pllKeys), [columns, pllKeys]);
  const dataRev = useMemo(() => buildBctcSeriesData(columns, revKeys), [columns, revKeys]);

  const barKeys = ["_dtThuan", "_tongCP", "_lnSauThue"];
  const barData = useMemo(() => {
    const base = buildBctcSeriesData(columns, barKeys);
    return base.map((d) => ({
      label: d.label,
      dtThuan: d._dtThuan as number,
      tongCP: d._tongCP as number,
      lnSau: d._lnSauThue as number,
    }));
  }, [columns]);

  if (dataPll.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#EAEAEA] bg-white px-6 py-12 text-center">
        <span className="text-3xl" aria-hidden>
          📊
        </span>
        <p className="m-0 text-sm font-semibold text-[#888]">Chưa có kỳ dữ liệu BCTC</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">BCTC chi tiết</h2>
          <p className="mt-1 text-[13px] leading-snug text-black/50">
            Biểu đồ theo dữ liệu đã nhập; xem bảng đầy đủ các chỉ tiêu trên trang riêng.
          </p>
        </div>
        <Link
          href="/admin/dashboard/bao-cao-tai-chinh"
          className="inline-flex shrink-0 items-center rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#323232] shadow-sm transition hover:border-[#BC8AF9]/40 hover:bg-[#fafafa]"
        >
          Xem bảng
        </Link>
      </div>

      <div className={cn("rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]")}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9E8A90]">
          Kết quả kinh doanh &amp; thuế theo kỳ
        </div>
        <div className="h-[min(380px,48vh)] w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPll as BctcPeriodDatum[]} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: C.muted }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={dataPll.length > 8 ? -35 : 0}
                textAnchor={dataPll.length > 8 ? "end" : "middle"}
                height={dataPll.length > 8 ? 56 : 36}
              />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fmtMoneyCompact} />
              <Tooltip content={<BctcTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {DETAIL_PLL_META.map((s) => (
                <Line
                  key={s.rowKey}
                  type="monotone"
                  dataKey={s.rowKey}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={1.8}
                  dot={{ r: 2.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cn("rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]")}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9E8A90]">
          Doanh thu theo nhóm (công thức bảng)
        </div>
        <div className="h-[min(340px,42vh)] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataRev as BctcPeriodDatum[]} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: C.muted }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={dataRev.length > 8 ? -35 : 0}
                textAnchor={dataRev.length > 8 ? "end" : "middle"}
                height={dataRev.length > 8 ? 56 : 36}
              />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fmtMoneyCompact} />
              <Tooltip content={<BctcTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {DETAIL_REV_META.map((s) => (
                <Line
                  key={s.rowKey}
                  type="monotone"
                  dataKey={s.rowKey}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={1.8}
                  dot={{ r: 2.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cn("rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]")}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9E8A90]">
          So sánh DT thuần · Chi phí · LN sau thuế (cột kỳ)
        </div>
        <div className="h-[min(320px,40vh)] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barGap={2}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: C.muted }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={barData.length > 8 ? -35 : 0}
                textAnchor={barData.length > 8 ? "end" : "middle"}
                height={barData.length > 8 ? 56 : 36}
              />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={fmtMoneyCompact} />
              <Tooltip content={<BctcTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="dtThuan" name="DT thuần" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tongCP" name="Tổng chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lnSau" name="LN sau thuế" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
