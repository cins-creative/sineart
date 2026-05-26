/**
 * Giá trị mặc định (seed) — fallback khi bảng `ql_loai_hinh_hoa_options` chưa có
 * dữ liệu hoặc chưa được tạo. Cột `ql_lop_hoc.level_hinh_hoa` giờ lưu CSV nên các
 * giá trị này không còn bị khoá bằng CHECK constraint.
 */
export const LEVEL_HINH_HOA_VALUES = [
  "Chuyên tượng",
  "Chuyên chân dung",
  "Chuyên toàn thân",
] as const;

export type LevelHinhHoaDb = (typeof LEVEL_HINH_HOA_VALUES)[number];

const SEPARATOR = ", ";

/** Thumbnail tĩnh trong `public/donghocphi/level-hinh-hoa/` — dùng trên thẻ chọn lớp. */
const LEVEL_HINH_HOA_THUMB_SRC: Record<string, string> = {
  "Chuyên tượng": "/donghocphi/level-hinh-hoa/chuyen-tuong.png",
  "Chuyên chân dung": "/donghocphi/level-hinh-hoa/chuyen-chan-dung.png",
  "Chuyên toàn thân": "/donghocphi/level-hinh-hoa/chuyen-toan-than.png",
};

/** Tách CSV thành mảng đã trim + bỏ rỗng + dedupe (giữ thứ tự xuất hiện). */
export function splitLevels(csv: string | null | undefined): string[] {
  if (!csv) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of String(csv).split(",")) {
    const v = part.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/** Ghép mảng giá trị thành CSV chuẩn (dùng `, ` làm separator). */
export function joinLevels(arr: readonly string[]): string {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const v of arr) {
    const t = String(v ?? "").trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    cleaned.push(t);
  }
  return cleaned.join(SEPARATOR);
}

/** Vẫn hữu ích cho UI cũ — check 1 giá trị có nằm trong seed defaults không. */
export function isLevelHinhHoaDb(v: string | null | undefined): v is LevelHinhHoaDb {
  const t = v != null ? String(v).trim() : "";
  return (LEVEL_HINH_HOA_VALUES as readonly string[]).includes(t);
}

/**
 * Public URL ảnh minh hoạ cho từng loại Hình họa.
 * Hỗ trợ cả input là 1 giá trị đơn lẻ và CSV nhiều giá trị.
 * Trả về thumbnail đầu tiên match được, hoặc `null` nếu không có giá trị nào khớp.
 */
export function levelHinhHoaThumbSrc(level: string | null | undefined): string | null {
  if (!level) return null;
  const items = splitLevels(level);
  for (const it of items) {
    const src = LEVEL_HINH_HOA_THUMB_SRC[it];
    if (src) return src;
  }
  return null;
}

/** Nhận diện môn «Hình họa» (vd. «Hình họa 2», «Hình họa Online»). */
export function isTenMonHinhHoa(tenMon: string | null | undefined): boolean {
  if (!tenMon) return false;
  const n = tenMon
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return n.includes("hinh hoa");
}

/**
 * Chấp nhận CSV / một giá trị / mảng nhiều dòng → trả về CSV chuẩn (`A, B, C`)
 * đã trim + dedupe. Trả về `null` nếu rỗng.
 */
export function parseLevelHinhHoaFromForm(
  raw: string | string[] | null | undefined,
): string | null {
  if (raw == null) return null;
  const parts: string[] = [];
  if (Array.isArray(raw)) {
    for (const v of raw) parts.push(...splitLevels(String(v)));
  } else {
    parts.push(...splitLevels(String(raw)));
  }
  const csv = joinLevels(parts);
  return csv ? csv : null;
}
