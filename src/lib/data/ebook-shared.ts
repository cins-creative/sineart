/**
 * Client-safe types + pure helpers cho bảng `mkt_ebooks`.
 *
 * KHÔNG import bất cứ gì từ `next/headers` hoặc `@/lib/supabase/server` ở đây —
 * file này được dùng trong cả Client Component (EbookListClient) lẫn Server
 * Component. Query Supabase nằm ở `./ebook.ts`.
 */

export type EbookItem = {
  id: number;
  slug: string;
  title: string;
  /** `so_trang` — số trang sách */
  pages: number | null;
  featured: boolean;
  /** Free-form string array (chủ đề / danh mục) */
  categories: string[];
  /** Cloudflare Images URL — bìa sách */
  thumbnail: string | null;
  /** 4 ảnh demo cho slide-over preview */
  image_demo: string[];
  /** Toàn bộ ảnh trang sách — hiển thị dạng grid đọc */
  img_src_link: string[];
  /** Iframe/embed flipbook HTML */
  html_embed: string | null;
  /** Tóm tắt HTML */
  content: string;
  /** Nội dung chi tiết HTML (tuỳ chọn) */
  noi_dung_sach: string;
  created_at: string | null;
  updated_at: string | null;
};

/** Dãy gradient fallback cho thumbnail khi không có `thumbnail` ảnh thật. */
export const EBOOK_THUMB_GRADS = [
  "linear-gradient(135deg,#fde859,#f8a668)",
  "linear-gradient(135deg,#f8a668,#ee5b9f)",
  "linear-gradient(135deg,#bb89f8,#ee5b9f)",
  "linear-gradient(135deg,#6efec0,#3bd99e)",
  "linear-gradient(135deg,#fde859,#bb89f8)",
] as const;

export function ebookGradFor(id: number): string {
  const n = Number.isFinite(id) ? Math.abs(id) : 0;
  return EBOOK_THUMB_GRADS[n % EBOOK_THUMB_GRADS.length]!;
}

/**
 * Palette pill màu cho category — deterministic theo tên (hash FNV-1a).
 * Trả về cặp background + color phù hợp để dùng inline style.
 */
const CAT_PALETTE = [
  { bg: "rgba(248,166,104,.15)", fg: "#b35a1e" }, // cam
  { bg: "rgba(238,91,159,.15)", fg: "#b31e62" }, // hồng
  { bg: "rgba(187,137,248,.16)", fg: "#6735c2" }, // tím
  { bg: "rgba(110,254,192,.18)", fg: "#1d7a56" }, // mint
  { bg: "rgba(253,232,89,.22)", fg: "#8a6d12" }, // vàng
  { bg: "rgba(130,180,255,.18)", fg: "#1a5db8" }, // xanh
  { bg: "rgba(255,138,101,.18)", fg: "#b33e1e" }, // đỏ cam
  { bg: "rgba(120,200,180,.18)", fg: "#20695a" }, // teal
] as const;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
}

export function ebookCatColor(cat: string): { bg: string; fg: string } {
  const k = cat.trim().toLowerCase();
  if (!k) return CAT_PALETTE[0]!;
  const idx = fnv1a(k) % CAT_PALETTE.length;
  return CAT_PALETTE[idx]!;
}

/** Rút danh sách category duy nhất từ danh sách ebook, sort theo tần suất giảm dần. */
export function extractEbookCategories(items: EbookItem[]): string[] {
  const freq = new Map<string, number>();
  for (const it of items) {
    for (const c of it.categories) {
      const t = c.trim();
      if (!t) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "vi");
    })
    .map(([k]) => k);
}

export function buildEbookHref(slug: string): string {
  return `/ebook/${slug}`;
}
