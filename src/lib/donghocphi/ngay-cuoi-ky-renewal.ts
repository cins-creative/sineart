/**
 * Quy ước gia hạn kỳ học phí (buổi ≈ ngày lịch) — khớp `computeRenewalBlock` trong `payment-client.tsx`.
 */

export function parseLocalDateFromIso(iso: string | null | undefined): Date | null {
  if (iso == null || String(iso).trim() === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo, d);
}

export function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addCalendarDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  return x;
}

export function formatIsoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Số ngày lịch từ a → b (b trước a → âm). */
export function diffCalendarDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

/**
 * Ngày cuối kỳ sau khi cộng `so_buoi` (ngày lịch):
 * - Có `ngay_cuoi_ky` hiện tại và còn hiệu lực (≥ hôm nay): mới = cuối kỳ + so_buoi.
 * - Kỳ đã hết hoặc chưa có ngày cuối: mới = hôm nay + so_buoi.
 */
export function computeNgayCuoiKyFromRenewal(
  enrollmentNgayCuoiKy: string | null | undefined,
  themBuoiRaw: number | null | undefined
): string | null {
  const themBuoi = Math.max(0, Math.round(Number(themBuoiRaw) || 0));
  if (themBuoi <= 0) return null;
  const today0 = startOfTodayLocal();
  const cuoi = parseLocalDateFromIso(enrollmentNgayCuoiKy ?? null);
  if (cuoi && cuoi >= today0) {
    return formatIsoLocalDate(addCalendarDays(cuoi, themBuoi));
  }
  return formatIsoLocalDate(addCalendarDays(today0, themBuoi));
}

/** Số ngày học còn lại trong kỳ (từ hôm nay đến `ngay_cuoi_ky`, hai đầu mốc). */
export function buoiConLaiTrongKy(ngayCuoiKy: string | null | undefined): number {
  const today0 = startOfTodayLocal();
  const cuoi = parseLocalDateFromIso(ngayCuoiKy ?? null);
  if (!cuoi) return 0;
  const diff = diffCalendarDays(today0, cuoi);
  return diff < 0 ? 0 : diff + 1;
}
