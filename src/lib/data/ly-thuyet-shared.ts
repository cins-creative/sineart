/**
 * Helper thuần (không đụng Supabase) — dùng được cả ở client + server.
 *
 * Tách riêng khỏi `ly-thuyet.ts` vì file đó có `import "server-only"`
 * (để block accidentally leak service-role client xuống bundle client);
 * client components như `KienThucNenTangView` cần slugify + URL builder
 * nên phải ở file không khoá server.
 */

import type { LyThuyetRow } from "@/types/ly-thuyet";

/**
 * Slugify tiếng Việt — đồng nhất với pattern `slugifyTenBaiTap` trong
 * `src/lib/he-thong-bai-tap/slug.ts` nhưng dùng dấu gạch ngang (URL-friendly
 * cho SEO blog, khác với bài-tập dùng underscore để phân biệt route type).
 *   "Cơ sở tạo hình" → "co-so-tao-hinh"
 */
export function slugifyLyThuyet(input: string): string {
  return input
    .trim()
    .replace(/\u0110/g, "D")
    .replace(/\u0111/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * Sinh slug cho 1 bài — ƯU TIÊN cột `dt_ly_thuyet_nen_tang.slug` trong DB.
 * Admin nhập slug tiếng Việt đã chuẩn hoá ở `QuanLyLyThuyet` / SQL seed,
 * và cột có UNIQUE index nên không cần compound với id.
 *
 * Fallback thứ tự:
 *   1. `row.slug` (trim, non-empty) — luôn thắng nếu DB đã set.
 *   2. `slugify(ten_ly_thuyet)` — khi cột slug còn null (rows cũ chưa
 *      backfill hoặc DB chưa migrate).
 *   3. `bai-{id}` — khi cả 2 trên fail (tên toàn ký tự đặc biệt).
 */
export function buildLyThuyetSlug(row: LyThuyetRow): string {
  const fromDb = typeof row.slug === "string" ? row.slug.trim() : "";
  if (fromDb.length > 0) return fromDb;
  const base = slugifyLyThuyet(row.ten_ly_thuyet ?? "");
  if (base.length > 0) return base;
  return `bai-${row.id}`;
}

/** Reading time — 200 words/phút; 1 phút min, 60 phút max. */
export function calcReadingMin(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(60, Math.max(1, Math.ceil(words / 200)));
}

/** URL builder — dùng ở mọi `<Link>` tới bài (cả server + client). */
export function buildLyThuyetHref(slug: string): string {
  return `/kien-thuc-nen-tang/${slug}`;
}
