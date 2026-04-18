import {
  buildDisplayCols,
  n,
  ROWS,
  THANG_FULL_TO_SHORT,
  type BaoCaoColumn,
  type ColData,
} from "@/lib/data/bao-cao-tai-chinh-config";

/** Dữ liệu ô (tháng hoặc quý đã gộp) để áp công thức ROWS. */
export function colDataForMetrics(col: BaoCaoColumn): ColData {
  return col.isQuarter === true ? (col.quarterData ?? col.data) : col.data;
}

export function rowFormulaValue(rowKey: string, data: ColData): number {
  const row = ROWS.find((r) => r.key === rowKey);
  if (row?.formula) return row.formula(data);
  return n(data[rowKey]);
}

export type BctcPeriodDatum = {
  label: string;
  nam: string;
  /** true = cột Σ quý */
  isQuarter: boolean;
} & Record<string, number>;

/** Chuỗi hiển thị trục X */
export function periodAxisLabel(col: BaoCaoColumn): string {
  if (col.isQuarter && col.quarterLabel) return col.quarterLabel;
  const t = THANG_FULL_TO_SHORT[col.thang] || col.thang;
  return `${t} ${col.nam}`.trim();
}

/**
 * Xây dữ liệu biểu đồ theo kỳ (ưu tiên **tháng**; nếu không có thì dùng cả quý).
 * `seriesKeys`: key chỉ tiêu trong `ROWS` (formula/result).
 */
export function buildBctcSeriesData(columns: BaoCaoColumn[], seriesKeys: string[]): BctcPeriodDatum[] {
  const display = buildDisplayCols(columns);
  const monthsOnly = display.filter((c) => !c.isQuarter);
  const use = monthsOnly.length > 0 ? monthsOnly : display;

  return use.map((col) => {
    const data = colDataForMetrics(col);
    const datum = {
      label: periodAxisLabel(col),
      nam: col.nam,
      isQuarter: !!col.isQuarter,
    } as BctcPeriodDatum;
    for (const key of seriesKeys) {
      datum[key] = rowFormulaValue(key, data);
    }
    return datum;
  });
}

/** Định dạng số tiền tooltip / trục */
export function fmtMoneyCompact(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}B`;
  if (abs >= 1e6) return `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1e3) return `${(v / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}k`;
  return Math.round(v).toLocaleString("vi-VN");
}

export function fmtMoneyFull(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString("vi-VN")} ₫`;
}
