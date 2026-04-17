import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Số ngày lịch từ hôm nay đến mốc `YYYY-MM-DD` (cả hai ngày tính vào) — khớp `buoiConLai` trên bước đóng học phí.
 * Hết hạn (mốc trước hôm nay) → `0`.
 */
export function calendarDaysRemainingInclusive(isoYmd: string | null | undefined): number | null {
  if (isoYmd == null) return null;
  const s = String(isoYmd).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)!;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(y, mo, d);
  end.setHours(0, 0, 0, 0);
  const ua = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const ub = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((ub - ua) / 86400000);
  if (diff < 0) return 0;
  return diff + 1;
}
