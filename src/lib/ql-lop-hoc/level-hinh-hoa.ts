/** Giá trị lưu DB — khớp constraint `ql_lop_hoc_level_hinh_hoa_check` */
export const LEVEL_HINH_HOA_VALUES = [
  "Chuyên tượng",
  "Chuyên chân dung",
  "Chuyên toàn thân",
] as const;

export type LevelHinhHoaDb = (typeof LEVEL_HINH_HOA_VALUES)[number];

const SET = new Set<string>(LEVEL_HINH_HOA_VALUES);

/** Thumbnail tĩnh trong `public/donghocphi/level-hinh-hoa/` — dùng trên thẻ chọn lớp. */
const LEVEL_HINH_HOA_THUMB_SRC: Record<LevelHinhHoaDb, string> = {
  "Chuyên tượng": "/donghocphi/level-hinh-hoa/chuyen-tuong.png",
  "Chuyên chân dung": "/donghocphi/level-hinh-hoa/chuyen-chan-dung.png",
  "Chuyên toàn thân": "/donghocphi/level-hinh-hoa/chuyen-toan-than.png",
};

export function isLevelHinhHoaDb(v: string | null | undefined): v is LevelHinhHoaDb {
  const t = v != null ? String(v).trim() : "";
  return t.length > 0 && SET.has(t);
}

/** Public URL ảnh minh hoạ cho từng loại, hoặc `null` nếu không khớp. */
export function levelHinhHoaThumbSrc(level: string | null | undefined): string | null {
  const v = String(level ?? "").trim();
  if (!isLevelHinhHoaDb(v)) return null;
  return LEVEL_HINH_HOA_THUMB_SRC[v];
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

export function parseLevelHinhHoaFromForm(raw: string | null | undefined): LevelHinhHoaDb | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  return isLevelHinhHoaDb(v) ? (v as LevelHinhHoaDb) : null;
}
