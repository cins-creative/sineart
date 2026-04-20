import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { htmlToPlainText } from "@/lib/admin/sanitize-admin-html";

export type MktBlog = {
  id: number;
  created_at: string;
  title: string | null;
  thumbnail: string | null;
  feature: boolean | null;
  nguon: string | null;
  image_alt: string | null;
  opening: string | null;
  content: string | null;
  ending: string | null;
};

export type BlogListItem = Pick<
  MktBlog,
  "id" | "created_at" | "title" | "thumbnail" | "feature" | "nguon" | "opening"
>;

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

/** `/blog/{id}-{slug}` — id đứng đầu để reverse-extract khi fetch. */
export function buildBlogSlug(id: number, title: string | null): string {
  const tail = title ? slugifyTitle(title) : "bai-viet";
  return `${id}-${tail}`;
}

/** Lấy `id` từ slug dạng `{id}-{tail}`. */
export function idFromBlogSlug(slug: string): number | null {
  const n = parseInt(slug, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Ước tính số phút đọc (200 từ / phút). */
export function estimateReadMinutes(...htmlParts: (string | null)[]): number {
  const text = htmlParts.map((h) => (h ? htmlToPlainText(h) : "")).join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Trích danh sách heading `h2` từ HTML content để render TOC. */
export function extractHeadings(html: string): { id: string; text: string }[] {
  const matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return matches.map((m, i) => {
    const raw = m[1]!.replace(/<[^>]+>/g, "").trim();
    return { id: `heading-${i}`, text: raw };
  });
}

/** Inject `id` vào mỗi `<h2>` trong HTML để anchor TOC hoạt động. */
export function injectHeadingIds(html: string): string {
  let idx = 0;
  return html.replace(/<h2([^>]*)>/gi, () => `<h2 id="heading-${idx++}">`);
}

/** Format ngày tháng Việt: "10 thg 2, 2026" */
export function formatDateVi(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

// ─── Supabase queries ─────────────────────────────────────────────────────────

async function fetchBlogByIdUncached(id: number): Promise<MktBlog | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("mkt_blogs")
    .select("id, created_at, title, thumbnail, feature, nguon, image_alt, opening, content, ending")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as MktBlog;
}

export const fetchBlogById = cache(fetchBlogByIdUncached);

async function fetchRelatedBlogsUncached(
  currentId: number,
  limit = 4
): Promise<BlogListItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mkt_blogs")
    .select("id, created_at, title, thumbnail, feature, nguon, opening")
    .neq("id", currentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as BlogListItem[];
}

export const fetchRelatedBlogs = cache(fetchRelatedBlogsUncached);

async function fetchAdjacentBlogsUncached(
  currentId: number,
  createdAt: string
): Promise<{ prev: BlogListItem | null; next: BlogListItem | null }> {
  const supabase = await createClient();
  if (!supabase) return { prev: null, next: null };

  const [prevRes, nextRes] = await Promise.all([
    supabase
      .from("mkt_blogs")
      .select("id, created_at, title, thumbnail, feature, nguon, opening")
      .lt("created_at", createdAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mkt_blogs")
      .select("id, created_at, title, thumbnail, feature, nguon, opening")
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    prev: prevRes.data as BlogListItem | null,
    next: nextRes.data as BlogListItem | null,
  };
}

export const fetchAdjacentBlogs = cache(fetchAdjacentBlogsUncached);
