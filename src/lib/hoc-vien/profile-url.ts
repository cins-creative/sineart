/** Chuẩn hoá email để so khớp session ↔ segment URL */
export function normalizeStudentEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Giải mã segment động `/hoc-vien/[email]` (Next có thể truyền đã decode một phần). */
export function normalizeEmailProfileSegment(encodedSegment: string): string {
  let s = encodedSegment;
  try {
    s = decodeURIComponent(encodedSegment);
  } catch {
    /* giữ nguyên */
  }
  return s.trim().toLowerCase();
}

/** Link trang cá nhân học viên — `null` nếu không đủ email hợp lệ. */
export function hocVienProfileHref(email: string | null | undefined): string | null {
  const e = normalizeStudentEmail(email);
  if (!e || !e.includes("@")) return null;
  return `/hoc-vien/${encodeURIComponent(e)}`;
}
