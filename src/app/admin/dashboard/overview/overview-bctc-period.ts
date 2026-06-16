import {
  enumerateNamThangPairsInInclusiveRange,
  presetToOverviewMinusOneRange,
} from "./marketing-date-range";
import type { OverviewPeriodSlug } from "./overview-routes";
import {
  OVERVIEW_PERIOD_ALL,
  OVERVIEW_PERIOD_CUSTOM,
  OVERVIEW_PERIOD_MONTH,
  OVERVIEW_PERIOD_QUARTER,
  OVERVIEW_PERIOD_WEEK,
  OVERVIEW_PERIOD_YEAR,
} from "./overview-routes";
import type { BaoCaoColumn } from "@/lib/data/bao-cao-tai-chinh-config";

export type BctcMetaRow = { id: number; nam: string; thang: string };

/**
 * Cặp (nam, thang) BCTC khớp segment URL — **kỳ -1** (trùng logic marketing overview).
 */
export function bctcNamThangPairsForOverviewPeriod(
  period: OverviewPeriodSlug,
): { nam: string; thang: string }[] {
  switch (period) {
    case OVERVIEW_PERIOD_WEEK: {
      const r = presetToOverviewMinusOneRange("week");
      return enumerateNamThangPairsInInclusiveRange(r.startYmd, r.endYmd);
    }
    case OVERVIEW_PERIOD_MONTH: {
      const r = presetToOverviewMinusOneRange("month");
      return enumerateNamThangPairsInInclusiveRange(r.startYmd, r.endYmd);
    }
    case OVERVIEW_PERIOD_QUARTER: {
      const r = presetToOverviewMinusOneRange("quarter");
      return enumerateNamThangPairsInInclusiveRange(r.startYmd, r.endYmd);
    }
    case OVERVIEW_PERIOD_YEAR: {
      const r = presetToOverviewMinusOneRange("year");
      return enumerateNamThangPairsInInclusiveRange(r.startYmd, r.endYmd);
    }
    default:
      return [];
  }
}

/**
 * ID dòng `tc_bao_cao_tai_chinh` theo kỳ URL (subset).
 * `tat-ca` / `tuy-chon`: caller dùng full fetch — meta không lọc tại đây.
 */
export function filterBctcMetaIdsForOverviewPeriod(
  meta: BctcMetaRow[],
  period: OverviewPeriodSlug,
): number[] {
  if (meta.length === 0) return [];

  const pairs = bctcNamThangPairsForOverviewPeriod(period);
  if (pairs.length === 0) return [];

  const keySet = new Set(pairs.map((p) => `${p.nam}|${p.thang}`));
  const ids: number[] = [];
  for (const row of meta) {
    if (!row.thang) continue;
    const k = `${row.nam}|${row.thang}`;
    if (keySet.has(k)) ids.push(row.id);
  }
  return ids;
}

/** Lọc cột BCTC (thủ công hoặc tự động) theo segment kỳ URL. */
export function filterBctcColumnsForOverviewPeriod(
  columns: BaoCaoColumn[],
  period: OverviewPeriodSlug,
): BaoCaoColumn[] {
  if (period === OVERVIEW_PERIOD_ALL || period === OVERVIEW_PERIOD_CUSTOM) return columns;
  const pairs = bctcNamThangPairsForOverviewPeriod(period);
  if (pairs.length === 0) return columns;
  const keySet = new Set(pairs.map((p) => `${p.nam}|${p.thang}`));
  return columns.filter((c) => keySet.has(`${c.nam}|${c.thang}`));
}
