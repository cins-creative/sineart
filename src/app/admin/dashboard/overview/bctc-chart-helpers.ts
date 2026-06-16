import {
  buildDisplayCols,
  n,
  ROWS,
  THANG_FULL_ORDER,
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
  /** Tháng đầy đủ («Tháng 1»…) — để ghép với baseline năm 2025 trong tooltip */
  thang?: string;
  /** true = cột Σ quý */
  isQuarter: boolean;
} & Record<string, number>;

/** Năm chuẩn để so sánh trên dashboard (năm hiện tại vs năm này). */
export const BCTC_BASELINE_COMPARE_YEAR = "2025";

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
      thang: col.isQuarter ? undefined : col.thang || undefined,
    } as BctcPeriodDatum;
    for (const key of seriesKeys) {
      datum[key] = rowFormulaValue(key, data);
    }
    return datum;
  });
}

/** `thang` → ColData đã gộp ô kỳ (tháng) cho một năm. */
export function buildYearThangColDataMap(columns: BaoCaoColumn[], year: string): Map<string, ColData> {
  const display = buildDisplayCols(columns);
  const m = new Map<string, ColData>();
  for (const c of display) {
    if (c.isQuarter || !c.thang) continue;
    if (c.nam !== year) continue;
    m.set(c.thang, colDataForMetrics(c));
  }
  return m;
}

/** Năm lớn nhất trong dữ liệu nhưng sau năm baseline (vd. 2026 để so với 2025). */
export function latestYearAfterBaseline(columns: BaoCaoColumn[], baselineYear: string): string | null {
  const b = parseInt(baselineYear, 10);
  if (!Number.isFinite(b)) return null;
  let best: number | null = null;
  for (const c of columns) {
    const y = parseInt(c.nam, 10);
    if (!Number.isFinite(y) || y <= b) continue;
    if (best === null || y > best) best = y;
  }
  return best !== null ? String(best) : null;
}

export type YoYAlignedMetric = {
  rowKey: string;
  label: string;
  pct: number | null;
  currentSum: number;
  baselineSum: number;
  pairedMonths: number;
  /** Tháng cặp có phát sinh khác 0 ở năm hiện tại (để TB/tháng). */
  currentActiveMonths: number;
  /** Tổng năm hiện tại chỉ các tháng dùng cho TB/tháng (YTD + có phát sinh). */
  currentSumForAvg: number;
};

const WEAK_BASELINE_RATIO = 0.02;
const EXTREME_YOY_ABS_PCT = 400;

/**
 * % YoY an toàn hiển thị: mẫu số quá nhỏ so với quy mô, hoặc |%| cực đoan → null.
 */
export function yoyPercentOrNull(currentSum: number, baselineSum: number): number | null {
  if (baselineSum === 0) {
    return currentSum === 0 ? 0 : null;
  }
  const raw = ((currentSum - baselineSum) / baselineSum) * 100;
  if (!Number.isFinite(raw)) return null;
  const scale = Math.max(Math.abs(baselineSum), Math.abs(currentSum), 1);
  if (Math.abs(baselineSum) < scale * WEAK_BASELINE_RATIO) return null;
  if (Math.abs(raw) > EXTREME_YOY_ABS_PCT) return null;
  return raw;
}

/** Tháng đã qua trong năm lịch (không tính tháng tương lai cho TB/tháng). */
function isThangEligibleForMonthlyAvg(thang: string, year: string): boolean {
  const y = parseInt(year, 10);
  if (!Number.isFinite(y)) return true;
  const mi = THANG_FULL_ORDER.indexOf(thang);
  if (mi < 0) return true;
  const now = new Date();
  if (y < now.getFullYear()) return true;
  if (y > now.getFullYear()) return false;
  return mi <= now.getMonth();
}

/**
 * Cộng dồn theo **các tháng có mặt ở cả hai năm** (cùng kỳ đã nhập đủ cặp).
 *
 * % YoY: khi tổng năm trước quá nhỏ so với quy mô hiện tại, hoặc |%| quá lớn (lợi nhuận
 * đổi dấu / mốc gần 0), trả `pct: null` để UI hiển thị "—" thay vì số gây hiểu nhầm.
 */
export function yoYAlignedTotalsVsBaseline(
  columns: BaoCaoColumn[],
  baselineYear: string,
  currentYear: string,
  seriesKeys: string[],
  labelByKey: Record<string, string>,
): YoYAlignedMetric[] {
  const baseMap = buildYearThangColDataMap(columns, baselineYear);
  const curMap = buildYearThangColDataMap(columns, currentYear);
  const out: YoYAlignedMetric[] = [];

  for (const key of seriesKeys) {
    let baselineSum = 0;
    let currentSum = 0;
    let pairedMonths = 0;
    let currentActiveMonths = 0;
    let currentSumForAvg = 0;
    for (const thang of THANG_FULL_ORDER) {
      const b = baseMap.get(thang);
      const c = curMap.get(thang);
      if (b === undefined || c === undefined) continue;
      const bv = rowFormulaValue(key, b);
      const cv = rowFormulaValue(key, c);
      baselineSum += bv;
      currentSum += cv;
      pairedMonths++;
      if (cv !== 0 && isThangEligibleForMonthlyAvg(thang, currentYear)) {
        currentSumForAvg += cv;
        currentActiveMonths++;
      }
    }

    const pct = pairedMonths > 0 ? yoyPercentOrNull(currentSum, baselineSum) : null;

    out.push({
      rowKey: key,
      label: labelByKey[key] ?? key,
      pct,
      currentSum,
      baselineSum,
      pairedMonths,
      currentActiveMonths,
      currentSumForAvg,
    });
  }
  return out;
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

/**
 * Một hàng trục X = một tháng (T1…T12); mỗi chỉ tiêu tách theo `metricKey__YYYY`.
 * Index cho phép `string | number | undefined` để không xung đột `label`/`thang` (string) với đường series (number).
 */
export type BctcMonthAlignedDatum = {
  label: string;
  thang: string;
  [key: string]: string | number | undefined;
};

const DATA_KEY_YEAR = /^(.+)__(\d{4})$/;

export function parseOverviewSeriesDataKey(dataKey: string): { metric: string; year: string } | null {
  const m = DATA_KEY_YEAR.exec(dataKey);
  if (!m) return null;
  return { metric: m[1], year: m[2] };
}

/**
 * So sánh **năm hiện tại** (năm lớn nhất có dữ liệu tháng) với **năm trước** (năm liền kề, chỉ khi có dữ liệu tháng).
 */
export function resolveCurrentPreviousYears(columns: BaoCaoColumn[]): {
  currentYear: string | null;
  previousYear: string | null;
  plotYears: string[];
} {
  const display = buildDisplayCols(columns);
  const monthYears = new Set<string>();
  for (const c of display) {
    if (!c.isQuarter && c.thang) monthYears.add(c.nam);
  }
  const sorted = Array.from(monthYears).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (sorted.length === 0) return { currentYear: null, previousYear: null, plotYears: [] };
  const currentYear = sorted[sorted.length - 1]!;
  const prevCal = String(parseInt(currentYear, 10) - 1);
  const previousYear = sorted.includes(prevCal) ? prevCal : null;
  const plotYears =
    previousYear !== null ? [previousYear, currentYear] : [currentYear];
  return { currentYear, previousYear, plotYears };
}

/** Năm baseline cố định + năm mới nhất sau baseline (legacy). */
export function resolvePlotYearsForOverview(columns: BaoCaoColumn[], baselineYear: string): string[] {
  const high = latestYearAfterBaseline(columns, baselineYear);
  const set = new Set<string>();
  if (buildYearThangColDataMap(columns, baselineYear).size > 0) {
    set.add(baselineYear);
  }
  if (high && buildYearThangColDataMap(columns, high).size > 0) {
    set.add(high);
  }
  if (set.size > 0) {
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }
  const ys = [...new Set(columns.map((c) => c.nam))]
    .filter(Boolean)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (ys.length === 0) return [];
  return ys.slice(-Math.min(2, ys.length));
}

/**
 * 12 điểm trục X (tháng 1→12); mỗi ô chỉ tiêu có khóa `seriesKey__year`.
 */
export function buildBctcAlignedYearSplitSeries(
  columns: BaoCaoColumn[],
  seriesKeys: string[],
  plotYears: string[],
): BctcMonthAlignedDatum[] {
  const display = buildDisplayCols(columns);
  const monthsOnly = display.filter((c) => !c.isQuarter);
  const map = new Map<string, ColData>();
  for (const c of monthsOnly) {
    if (!c.thang) continue;
    map.set(`${c.nam}|${c.thang}`, colDataForMetrics(c));
  }

  const data: BctcMonthAlignedDatum[] = [];
  for (const thang of THANG_FULL_ORDER) {
    const row: BctcMonthAlignedDatum = {
      label: THANG_FULL_TO_SHORT[thang] ?? thang,
      thang,
    };
    for (const year of plotYears) {
      const cd = map.get(`${year}|${thang}`);
      for (const key of seriesKeys) {
        const field = `${key}__${year}`;
        row[field] = cd !== undefined ? rowFormulaValue(key, cd) : undefined;
      }
    }
    data.push(row);
  }
  return data;
}
