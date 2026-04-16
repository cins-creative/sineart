/**
 * URL dạng: /he-thong-bai-tap/bai_{bai_so}-{slug_ten}
 * Ví dụ: bai 8 + "Cách điệu" → `bai_8-cach_dieu`
 *
 * Lưu ý: nếu hai môn cùng `bai_so` + cùng slug tên → trùng URL; cần disambiguate sau (brief).
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

export function parseHeThongBaiTapSlug(
  pathSegment: string
): { baiSo: number; titleSlug: string } | null {
  const m = SLUG_PART.exec(pathSegment.trim());
  if (!m) return null;
  const baiSo = Number(m[1]);
  if (!Number.isFinite(baiSo)) return null;
  return { baiSo, titleSlug: m[2].toLowerCase() };
}
