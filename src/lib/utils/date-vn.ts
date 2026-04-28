const VN_TZ = "Asia/Ho_Chi_Minh";

/** YYYY-MM-DD theo múi giờ VN — so sánh «cùng ngày» (sau 24:00 VN = ngày mới). */
export function ymdVietnam(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isSameVnCalendarDay(a: Date, b: Date): boolean {
  return ymdVietnam(a) === ymdVietnam(b);
}
