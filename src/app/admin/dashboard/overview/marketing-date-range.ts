import type { MkDataAnalysisRow } from "@/lib/data/admin-report-mkt";

/** Chuỗi `YYYY-MM-DD` — so sánh chuỗi được với ISO date-only. */
export type YmdString = string;

export type MkDatePreset = "all" | "week" | "month" | "quarter" | "year" | "custom";

export type MkDateRangeBound = { startYmd: YmdString; endYmd: YmdString };

export function formatYMDLocal(d: Date): YmdString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `ngay_thang_nhap` trong DB — lấy phần ngày chuẩn ISO. */
export function rowDateYmd(row: MkDataAnalysisRow): YmdString | null {
  const s = row.ngay_thang_nhap?.trim();
  if (!s) return null;
  const ymd = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

export function formatYmdVi(ymd: YmdString): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("vi-VN");
}

/**
 * Preset tính **lùi từ hôm nay** (local):
 * - Tuần: 7 ngày gần nhất (bao gồm hôm nay)
 * - Tháng / Quý / Năm: từ đầu kỳ lịch đến hôm nay
 */
export function presetToRange(preset: Exclude<MkDatePreset, "all" | "custom">): MkDateRangeBound {
  const today = new Date();
  const endYmd = formatYMDLocal(today);
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), q * 3, 1);
    return { startYmd: formatYMDLocal(start), endYmd };
  }
  const start = new Date(today.getFullYear(), 0, 1);
  return { startYmd: formatYMDLocal(start), endYmd };
}

export function normalizeCustomRange(
  customFrom: string,
  customTo: string,
): MkDateRangeBound {
  const todayYmd = formatYMDLocal(new Date());
  let from = customFrom.trim().slice(0, 10);
  let to = customTo.trim().slice(0, 10);
  if (!from && !to) return { startYmd: todayYmd, endYmd: todayYmd };
  if (!from) from = to || todayYmd;
  if (!to) to = from || todayYmd;
  if (from > to) [from, to] = [to, from];
  return { startYmd: from, endYmd: to };
}

export function resolveActiveRange(
  preset: MkDatePreset,
  customFrom: string,
  customTo: string,
): MkDateRangeBound | null {
  if (preset === "all") return null;
  if (preset === "custom") return normalizeCustomRange(customFrom, customTo);
  return presetToRange(preset);
}

export function filterMkRowsByRange(
  rows: MkDataAnalysisRow[],
  range: MkDateRangeBound | null,
): MkDataAnalysisRow[] {
  if (!range) return rows;
  return rows.filter((r) => {
    const ymd = rowDateYmd(r);
    if (!ymd) return false;
    return ymd >= range.startYmd && ymd <= range.endYmd;
  });
}
