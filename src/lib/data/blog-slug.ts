/** Slug & slugify cho `/blogs/[slug]` — không import Supabase (dùng được từ Client Component). */

/** Chuyển title thành slug ASCII-safe. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Slug URL `/blogs/[slug]` — chỉ từ tiêu đề (khớp Framer / Google index).
 * Tham số `id` giữ để không đổi chữ ký gọi hàm ở các component.
 */
export function buildBlogSlug(_id: number, title: string | null): string {
  return title ? slugifyTitle(title) : "bai-viet";
}

/** Legacy: slug dạng `123-ten-bai`. */
export function idFromBlogSlug(slug: string): number | null {
  const m = /^(\d+)-/.exec(slug);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
