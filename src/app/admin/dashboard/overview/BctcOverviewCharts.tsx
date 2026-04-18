"use client";

import { useMemo } from "react";
import {
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

import { buildBctcSeriesData, fmtMoneyCompact, fmtMoneyFull, type BctcPeriodDatum } from "./bctc-chart-helpers";

const C = {
  grid: "#E8E4E5",
  muted: "#9E8A90",
} as const;

const OVERVIEW_SERIES: { rowKey: keyof BctcPeriodDatum; label: string; color: string }[] = [
  { rowKey: "_dtThuan", label: "Doanh thu", color: "#3b82f6" },
  { rowKey: "_tongCP", label: "Chi phí", color: "#ef4444" },
  { rowKey: "_tongLuong", label: "Lương", color: "#f59e0b" },
  { rowKey: "_lnTruocThue", label: "LN trước thuế", color: "#8b5cf6" },
  { rowKey: "_lnSauThue", label: "LN sau thuế", color: "#10b981" },
];

const SERIES_KEYS = OVERVIEW_SERIES.map((s) => s.rowKey as string);

type Props = { columns: BaoCaoColumn[] };

function BctcTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-[min(360px,92vw)] rounded-[10px] border border-[#EDE8E9] bg-white px-3.5 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
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

export default function BctcOverviewCharts({ columns }: Props) {
  const data = useMemo(() => buildBctcSeriesData(columns, SERIES_KEYS), [columns]);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#EAEAEA] bg-white px-6 py-12 text-center">
        <span className="text-3xl" aria-hidden>
          📊
        </span>
        <p className="m-0 text-sm font-semibold text-[#888]">Chưa có kỳ dữ liệu BCTC</p>
        <p className="m-0 max-w-sm text-[12px] text-black/45">Nhập số tại Báo cáo tài chính để xem biểu đồ tổng quan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="m-0 text-lg font-bold tracking-tight text-[#323232]">BCTC tổng quan</h2>
        <p className="mt-1 text-[13px] leading-snug text-black/50">
          Doanh thu thuần (BH&amp;DV), chi phí, lương và lợi nhuận theo kỳ — nguồn cùng bảng báo cáo tài chính.
        </p>
      </div>

      <div className={cn("rounded-[14px] border border-[#EDE8E9] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]")}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9E8A90]">
          Xu hướng theo kỳ
        </div>
        <div className="h-[min(420px,52vh)] w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: C.muted }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={data.length > 8 ? -35 : 0}
                textAnchor={data.length > 8 ? "end" : "middle"}
                height={data.length > 8 ? 56 : 36}
              />
              <YAxis
                tick={{ fontSize: 10, fill: C.muted }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtMoneyCompact(v)}
              />
              <Tooltip content={<BctcTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {OVERVIEW_SERIES.map((s) => (
                <Line
                  key={s.rowKey}
                  type="monotone"
                  dataKey={s.rowKey}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
