/** Chuẩn hoá email để so khớp session ↔ segment URL */
export function normalizeStudentEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Giải mã segment động `/hoc-vien/[email]/...` (Next có thể truyền đã decode một phần). */
export function normalizeEmailProfileSegment(encodedSegment: string): string {
  let s = encodedSegment;
  try {
    s = decodeURIComponent(encodedSegment);
  } catch {
    /* giữ nguyên */
  }
  return s.trim().toLowerCase();
}

/** Slug tab trang cá nhân học viên — khớp đường dẫn `/hoc-vien/{email}/{section}` */
export const HVP_PROFILE_SECTIONS = [
  "thong-tin",
  "lop-hoc",
  "he-thong-bai-tap",
  "bai-ve",
] as const;

export type HvpProfileSection = (typeof HVP_PROFILE_SECTIONS)[number];

export const HVP_DEFAULT_PROFILE_SECTION: HvpProfileSection = "thong-tin";

export function isHvpProfileSection(v: string): v is HvpProfileSection {
  return (HVP_PROFILE_SECTIONS as readonly string[]).includes(v);
}

/**
 * Link trang cá nhân học viên (một tab).
 * @param email — email học viên
 * @param section — mặc định `thong-tin`
 * @returns `null` nếu không đủ email hợp lệ
 */
export function hocVienProfileHref(
  email: string | null | undefined,
  section: HvpProfileSection = HVP_DEFAULT_PROFILE_SECTION
): string | null {
  const e = normalizeStudentEmail(email);
  if (!e || !e.includes("@")) return null;
  return `/hoc-vien/${encodeURIComponent(e)}/${section}`;
}
