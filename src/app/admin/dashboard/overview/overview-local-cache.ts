import type { TcBaoCaoTaiChinhRow } from "@/lib/data/admin-bao-cao-tai-chinh";
import type { MkDataAnalysisRow } from "@/lib/data/admin-report-mkt";

/** Bump khi đổi shape cache / semantics (vd. kỳ overview «-1»). */
const MK_KEY = "sineart-admin-overview-mk-full-v2";
const BCTC_KEY = "sineart-admin-overview-bctc-full-v2";

export function readOverviewMkCache(): MkDataAnalysisRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: unknown };
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;
    return parsed.rows as MkDataAnalysisRow[];
  } catch {
    return null;
  }
}

export function writeOverviewMkCache(rows: MkDataAnalysisRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MK_KEY, JSON.stringify({ t: Date.now(), rows }));
  } catch {
    /* quota / private mode */
  }
}

export function readOverviewBctcCache(): TcBaoCaoTaiChinhRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BCTC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: unknown };
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;
    return parsed.rows as TcBaoCaoTaiChinhRow[];
  } catch {
    return null;
  }
}

export function writeOverviewBctcCache(rows: TcBaoCaoTaiChinhRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BCTC_KEY, JSON.stringify({ t: Date.now(), rows }));
  } catch {
    /* quota */
  }
}
