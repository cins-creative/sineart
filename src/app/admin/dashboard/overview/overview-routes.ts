import type { MkDatePreset } from "./marketing-date-range";

/** Segment URL — tab Marketing */
export const OVERVIEW_SECTION_MARKETING = "marketing-data-analysis" as const;
/** Segment URL — tab BCTC */
export const OVERVIEW_SECTION_BCTC = "bctc-tong-quan" as const;

export type OverviewSectionSlug =
  | typeof OVERVIEW_SECTION_MARKETING
  | typeof OVERVIEW_SECTION_BCTC;

export const OVERVIEW_PERIOD_WEEK = "tuan" as const;
export const OVERVIEW_PERIOD_MONTH = "thang" as const;
export const OVERVIEW_PERIOD_QUARTER = "quy" as const;
export const OVERVIEW_PERIOD_YEAR = "nam" as const;
export const OVERVIEW_PERIOD_ALL = "tat-ca" as const;
export const OVERVIEW_PERIOD_CUSTOM = "tuy-chon" as const;

export type OverviewPeriodSlug =
  | typeof OVERVIEW_PERIOD_WEEK
  | typeof OVERVIEW_PERIOD_MONTH
  | typeof OVERVIEW_PERIOD_QUARTER
  | typeof OVERVIEW_PERIOD_YEAR
  | typeof OVERVIEW_PERIOD_ALL
  | typeof OVERVIEW_PERIOD_CUSTOM;

const SECTIONS = new Set<string>([OVERVIEW_SECTION_MARKETING, OVERVIEW_SECTION_BCTC]);

const PERIODS = new Set<string>([
  OVERVIEW_PERIOD_WEEK,
  OVERVIEW_PERIOD_MONTH,
  OVERVIEW_PERIOD_QUARTER,
  OVERVIEW_PERIOD_YEAR,
  OVERVIEW_PERIOD_ALL,
  OVERVIEW_PERIOD_CUSTOM,
]);

export const OVERVIEW_DEFAULT_PATH = `/admin/dashboard/overview/${OVERVIEW_SECTION_MARKETING}/${OVERVIEW_PERIOD_MONTH}`;

export function isOverviewSectionSlug(v: string): v is OverviewSectionSlug {
  return SECTIONS.has(v);
}

export function isOverviewPeriodSlug(v: string): v is OverviewPeriodSlug {
  return PERIODS.has(v);
}

/** Ánh xạ segment URL → preset filter ngày (marketing). */
export function overviewPeriodSlugToMkPreset(slug: OverviewPeriodSlug): MkDatePreset {
  switch (slug) {
    case OVERVIEW_PERIOD_WEEK:
      return "week";
    case OVERVIEW_PERIOD_MONTH:
      return "month";
    case OVERVIEW_PERIOD_QUARTER:
      return "quarter";
    case OVERVIEW_PERIOD_YEAR:
      return "year";
    case OVERVIEW_PERIOD_ALL:
      return "all";
    case OVERVIEW_PERIOD_CUSTOM:
      return "custom";
    default:
      return "month";
  }
}

export function mkPresetToOverviewPeriodSlug(preset: MkDatePreset): OverviewPeriodSlug {
  switch (preset) {
    case "week":
      return OVERVIEW_PERIOD_WEEK;
    case "month":
      return OVERVIEW_PERIOD_MONTH;
    case "quarter":
      return OVERVIEW_PERIOD_QUARTER;
    case "year":
      return OVERVIEW_PERIOD_YEAR;
    case "all":
      return OVERVIEW_PERIOD_ALL;
    case "custom":
      return OVERVIEW_PERIOD_CUSTOM;
    default:
      return OVERVIEW_PERIOD_MONTH;
  }
}
