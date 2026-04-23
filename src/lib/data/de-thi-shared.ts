/**
 * Helpers & types client-safe cho `mkt_de_thi`.
 * KHÔNG import module server-only (supabase/server, next/headers, cache...).
 * Dùng được từ cả server lẫn client component.
 *
 * Base route: `/tong-hop-de-thi` (cũng là href trong NavBar → Thư viện → Đề thi).
 */

// ─── Môn (subject) ───────────────────────────────────────────────────
// Khớp giá trị trong DB (`mkt_de_thi.mon` — text[]).
// Dataset hiện tại chủ yếu chỉ có «Bố cục màu» và «Trang trí màu» — các giá trị
// khác (Digital, Hình họa…) để sẵn cho tương lai nhưng chỉ hiển thị trong UI
// nếu thực tế có trong dữ liệu.

export type MonValue = string;

export type MonOption = {
  value: string;
  /** Màu accent cho pill / chip; match design tokens `--cat-*`. */
  accent: string;
};

/** Danh mục chính hiện tại. `accent` = token màu category design system. */
export const MON_CANONICAL: readonly MonOption[] = [
  { value: "Bố cục màu", accent: "#6efec0" },
  { value: "Trang trí màu", accent: "#bb89f8" },
  { value: "Hình họa", accent: "#fde859" },
  { value: "Digital", accent: "#f8a668" },
] as const;

/** Màu mặc định cho môn không khớp canonical. */
const DEFAULT_MON_ACCENT = "rgba(45,32,32,.1)";

export function monAccent(m: string): string {
  const hit = MON_CANONICAL.find((o) => o.value === m);
  return hit?.accent ?? DEFAULT_MON_ACCENT;
}

// ─── Types ───────────────────────────────────────────────────────────

export type DeThiListItem = {
  id: number;
  slug: string | null;
  /** Cột trong DB là `ten`, giữ nguyên tên field để tránh map thừa. */
  ten: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  nam: number | null;
  excerpt: string | null;
  created_at: string;
  truong_ids: number[];
  loai: string[];
  mon: string[];
  /** Phân loại mẫu (Tượng / Tĩnh vật / Người …). Optional filter. */
  loai_mau_hinh_hoa: string[];
};

export type DeThiDetail = DeThiListItem & {
  body_html: string | null;
  content_raw: string | null;
  updated_at: string | null;
};

export type TruongLookup = {
  id: number;
  ten: string;
};

// ─── Helpers format ──────────────────────────────────────────────────

export function buildDeThiHref(slug: string | null): string {
  if (!slug) return "/tong-hop-de-thi";
  return `/tong-hop-de-thi/${slug}`;
}

/**
 * Chuẩn hoá chuỗi tiếng Việt thành slug ASCII (a-z0-9-).
 * Match đúng logic PostgreSQL function `sineart_slug_ascii` ở `sql/normalize_mkt_de_thi_slugs.sql`.
 * Dùng:
 *   - Redirect 301 từ URL có dấu → canonical ASCII (Server Component detail page)
 *   - Preview / client nếu cần
 */
export function vnSlugify(input: string): string {
  if (!input) return "";
  // NFD giúp tách dấu ra khỏi ký tự gốc → xoá bằng regex.
  // Xử lý riêng `đ` / `Đ` vì NFD không tách.
  const nfd = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
  return nfd
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDateVi(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
}
