/**
 * Types cho bảng `public.dt_ly_thuyet_nen_tang`.
 * Xem brief: `BRIEF_library_supabase_mapping.md`.
 */

export type ThuocNhom =
  | "Lý thuyết cơ sở"
  | "Bố cục"
  | "Giải phẫu"
  | "Màu sắc"
  | "Sắc độ"
  | "Vật liệu";

/** Thứ tự ưu tiên của các nhóm (dùng cho sidebar + landing) */
export const NHOM_ORDER: ThuocNhom[] = [
  "Lý thuyết cơ sở",
  "Bố cục",
  "Giải phẫu",
  "Màu sắc",
  "Sắc độ",
  "Vật liệu",
];

/**
 * Mapping nhóm → accent color token. Key dùng làm CSS var trên root trang
 * để mỗi card/hero "nhuộm" đúng màu chủ đạo của nhóm.
 */
export const GROUP_ACCENT: Record<string, string> = {
  "Lý thuyết cơ sở": "#ee5b9f", // mag
  "Bố cục": "#f8a668", // peach
  "Giải phẫu": "#bb89f8", // tt
  "Màu sắc": "#6efec0", // bc
  "Sắc độ": "#fde859", // hh
  "Vật liệu": "#2d2020", // ink
};

export interface LyThuyetRow {
  id: number;
  created_at: string;
  ten_ly_thuyet: string | null;
  video: string | null;
  video_tham_khao_khac: string | null;
  short_content: string | null;
  content: string | null;
  thumbnail: string | null;
  thuoc_nhom: string | null;
  tags: string[] | null;
  /** Cột slug có thể có hoặc chưa có tuỳ migration. */
  slug?: string | null;
}

/** Dạng đã enrich: luôn có `slug`, reading time tính sẵn. */
export interface LyThuyet extends LyThuyetRow {
  /** Slug luôn tồn tại sau bước `enrichLyThuyet`. */
  slug: string;
  /** Đã trim + fallback "Bài chưa đặt tên". */
  ten: string;
  /** Chuẩn hoá thuoc_nhom về `ThuocNhom` nếu match; else giữ nguyên hoặc null. */
  nhom: string | null;
  /** Thời gian đọc (phút) — tính từ `content` HTML. */
  readingMin: number;
  /** Tags không null, default `[]`. */
  tagList: string[];
}

/** Shape dùng cho card list (landing + related + prev/next). */
export interface LyThuyetCard {
  id: number;
  slug: string;
  ten: string;
  shortContent: string | null;
  thumbnail: string | null;
  nhom: string | null;
  readingMin: number;
  tags: string[];
}
