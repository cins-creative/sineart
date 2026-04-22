/**
 * URL dạng: /he-thong-bai-tap/bai_{bai_so}-{slug_ten}[?mon={mon_hoc_id}]
 * Ví dụ: bai 8 + "Cách điệu" → `bai_8-cach_dieu`
 *
 * Nếu hai môn cùng `bai_so` + cùng slug tên, query `?mon={id}` sẽ disambiguate.
 * URL canonical không có query param vẫn hoạt động (fallback: ưu tiên bản `is_visible`).
 */

const SLUG_PART = /^bai_(\d+)-([a-z0-9_]+)$/i;

/** Chuẩn hoá tên bài → phần sau dấu `-` trong URL (chữ thường, gạch dưới). */
export function slugifyTenBaiTap(ten: string): string {
  return ten
    .trim()
    .replace(/\u0110/g, "D")
    .replace(/\u0111/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function buildHeThongBaiTapSlug(baiSo: number, tenBaiTap: string): string {
  const n = Math.max(0, Math.floor(Number(baiSo)) || 0);
  const tail = slugifyTenBaiTap(tenBaiTap) || "bai";
  return `bai_${n}-${tail}`;
}

/**
 * Build full href `/he-thong-bai-tap/{slug}[?mon={id}]`. Dùng cho mọi `<Link>` tới bài tập
 * để disambiguate khi `bai_so` + slug tên trùng giữa các môn.
 */
export function buildHeThongBaiTapHref(
  baiSo: number,
  tenBaiTap: string,
  monHocId?: number | null
): string {
  const slug = buildHeThongBaiTapSlug(baiSo, tenBaiTap);
  const mon = Number(monHocId);
  if (Number.isFinite(mon) && mon > 0) return `/he-thong-bai-tap/${slug}?mon=${mon}`;
  return `/he-thong-bai-tap/${slug}`;
}

export function parseHeThongBaiTapSlug(
  pathSegment: string
): { baiSo: number; titleSlug: string } | null {
  const m = SLUG_PART.exec(pathSegment.trim());
  if (!m) return null;
  const baiSo = Number(m[1]);
  if (!Number.isFinite(baiSo)) return null;
  return { baiSo, titleSlug: m[2].toLowerCase() };
}
