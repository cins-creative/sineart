import type { MkDatePreset } from "./marketing-date-range";

/** @deprecated Redirect → traffic-web. Tab nhập tay đã gỡ. */
export const OVERVIEW_SECTION_MARKETING = "marketing-data-analysis" as const;
/** Segment URL — BCTC nhập tay (tc_bao_cao_tai_chinh) */
export const OVERVIEW_SECTION_BCTC = "bctc-tong-quan" as const;
/** Segment URL — BCTC gom từ giao dịch (cùng UI tổng quan) */
export const OVERVIEW_SECTION_BCTC_AUTO = "bctc-nguon-tu-dong" as const;
/** Segment URL — theo dõi HV từ DB */
export const OVERVIEW_SECTION_HV_TRACKING = "theo-doi-hoc-vien" as const;
/** MKT — traffic web GA4 */
export const OVERVIEW_SECTION_WEB_TRAFFIC = "traffic-web" as const;
/** MKT — Google Search Console */
export const OVERVIEW_SECTION_SEARCH_CONSOLE = "search-console" as const;
/** MKT — Meta Fanpage + Ads */
export const OVERVIEW_SECTION_META_INSIGHTS = "meta-insights" as const;

export const MKT_OVERVIEW_SECTIONS = [
  OVERVIEW_SECTION_WEB_TRAFFIC,
  OVERVIEW_SECTION_SEARCH_CONSOLE,
  OVERVIEW_SECTION_META_INSIGHTS,
] as const;

export type MktOverviewSectionSlug = (typeof MKT_OVERVIEW_SECTIONS)[number];

export const BCTC_OVERVIEW_SECTIONS = [
  OVERVIEW_SECTION_BCTC,
  OVERVIEW_SECTION_BCTC_AUTO,
] as const;

export type BctcOverviewSectionSlug = (typeof BCTC_OVERVIEW_SECTIONS)[number];

export type OverviewSectionSlug =
  | BctcOverviewSectionSlug
  | typeof OVERVIEW_SECTION_HV_TRACKING
  | MktOverviewSectionSlug;

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

const SECTIONS = new Set<string>([
  ...BCTC_OVERVIEW_SECTIONS,
  OVERVIEW_SECTION_HV_TRACKING,
  ...MKT_OVERVIEW_SECTIONS,
]);

const PERIODS = new Set<string>([
  OVERVIEW_PERIOD_WEEK,
  OVERVIEW_PERIOD_MONTH,
  OVERVIEW_PERIOD_QUARTER,
  OVERVIEW_PERIOD_YEAR,
  OVERVIEW_PERIOD_ALL,
  OVERVIEW_PERIOD_CUSTOM,
]);

export const OVERVIEW_DEFAULT_PATH = `/admin/dashboard/overview/${OVERVIEW_SECTION_WEB_TRAFFIC}/${OVERVIEW_PERIOD_MONTH}`;

export function isMktOverviewSection(v: string): v is MktOverviewSectionSlug {
  return (MKT_OVERVIEW_SECTIONS as readonly string[]).includes(v);
}

export function isBctcOverviewSection(v: string): v is BctcOverviewSectionSlug {
  return (BCTC_OVERVIEW_SECTIONS as readonly string[]).includes(v);
}

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
