/**
 * Server-only queries cho bảng Supabase `mkt_ebooks`.
 *
 * Dùng `createStaticClient` (anon, không cookie) nên SAFE ở cả
 * `generateStaticParams` lẫn Server Component thường.
 *
 * Schema ref (`mkt_ebooks`):
 *   id bigint PK
 *   title text NOT NULL
 *   slug text
 *   so_trang int4            — số trang
 *   featured bool            — nổi bật
 *   categories text[]        — nhiều chủ đề / free-form
 *   thumbnail text           — Cloudflare Images URL (bìa)
 *   image_demo text[]        — 4 ảnh demo cho slide-over preview
 *   img_src_link text[]      — toàn bộ ảnh trang sách (đọc dạng grid)
 *   html_embed text          — iframe flipbook embed
 *   content text             — tóm tắt HTML
 *   noi_dung_sach text       — nội dung chi tiết HTML (tuỳ chọn)
 *   created_at / updated_at timestamptz
 *
 * Client component phải import helpers từ `./ebook-shared` thay vì file này
 * (để tránh transitive dependency `@supabase/supabase-js` load vào client
 * bundle — tuy `createStaticClient` không đụng `next/headers`, tách file giữ
 * client bundle gọn hơn).
 */

import { cache } from "react";

import { createStaticClient } from "@/lib/supabase/static";

import type { EbookItem } from "./ebook-shared";

// Re-export cho tiện từ server component (tránh phải import 2 file).
export type { EbookItem } from "./ebook-shared";
export {
  EBOOK_THUMB_GRADS,
  ebookCatColor,
  ebookGradFor,
  extractEbookCategories,
  buildEbookHref,
} from "./ebook-shared";

const SELECT_COLS =
  "id, slug, title, so_trang, featured, categories, thumbnail, image_demo, img_src_link, html_embed, content, noi_dung_sach, created_at, updated_at";

/**
 * Parse URL array — hỗ trợ cả 3 dạng lưu trong DB (giống pattern ở
 * `tra-cuu.ts#parseAlbum`):
 *   1. Postgres `text[]`  → JS array trực tiếp
 *   2. `jsonb` array      → JS array
 *   3. `text` chứa JSON-encoded array (legacy từ form admin) → cần parse
 *
 * Flatten mọi element string nào bản thân là JSON-array (trường hợp admin nhập
 * nhầm cả chuỗi `["..."]` vào 1 ô của mảng).
 */
function asUrlArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    const out: string[] = [];
    for (const x of v) out.push(...asUrlArray(x));
    return out;
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          const out: string[] = [];
          for (const x of parsed) out.push(...asUrlArray(x));
          return out;
        }
      } catch {
        /* fall through → treat as plain string */
      }
    }
    return [t];
  }
  return [];
}

function asUrlScalar(v: unknown): string | null {
  const arr = asUrlArray(v);
  return arr[0] ?? null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const it of v) {
    if (typeof it === "string" && it.trim().length > 0) out.push(it.trim());
  }
  return out;
}

function mapRow(raw: Record<string, unknown>): EbookItem {
  return {
    id: Number(raw.id),
    slug: String(raw.slug ?? ""),
    title: String(raw.title ?? ""),
    pages: raw.so_trang == null ? null : Number(raw.so_trang),
    featured: !!raw.featured,
    categories: asStringArray(raw.categories),
    thumbnail: asUrlScalar(raw.thumbnail),
    image_demo: asUrlArray(raw.image_demo),
    img_src_link: asUrlArray(raw.img_src_link),
    html_embed: (raw.html_embed as string | null) ?? null,
    content: (raw.content as string | null) ?? "",
    noi_dung_sach: (raw.noi_dung_sach as string | null) ?? "",
    created_at: (raw.created_at as string | null) ?? null,
    updated_at: (raw.updated_at as string | null) ?? null,
  };
}

async function fetchAllEbooksUncached(): Promise<EbookItem[]> {
  const supabase = createStaticClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mkt_ebooks")
    .select(SELECT_COLS)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[ebook] fetchAllEbooks error", error);
    return [];
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export const fetchAllEbooks = cache(fetchAllEbooksUncached);

async function fetchEbookBySlugUncached(
  slug: string,
): Promise<EbookItem | null> {
  const supabase = createStaticClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mkt_ebooks")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[ebook] fetchEbookBySlug error", error);
    return null;
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export const fetchEbookBySlug = cache(fetchEbookBySlugUncached);

async function fetchRelatedEbooksUncached(
  currentId: number,
  cats: string[],
  limit = 4,
): Promise<EbookItem[]> {
  const all = await fetchAllEbooks();
  const catSet = new Set(cats.map((c) => c.trim().toLowerCase()));
  const scored = all
    .filter((e) => e.id !== currentId)
    .map((e) => ({
      item: e,
      score: e.categories.reduce(
        (acc, c) => acc + (catSet.has(c.trim().toLowerCase()) ? 1 : 0),
        0,
      ),
    }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (Number(b.item.featured) !== Number(a.item.featured)) {
      return Number(b.item.featured) - Number(a.item.featured);
    }
    return (b.item.created_at ?? "").localeCompare(a.item.created_at ?? "");
  });
  return scored.slice(0, limit).map((s) => s.item);
}

export const fetchRelatedEbooks = cache(fetchRelatedEbooksUncached);

async function fetchAdjacentEbooksUncached(
  currentId: number,
): Promise<{ prev: EbookItem | null; next: EbookItem | null }> {
  const all = await fetchAllEbooks();
  const idx = all.findIndex((e) => e.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? (all[idx - 1] ?? null) : null,
    next: idx < all.length - 1 ? (all[idx + 1] ?? null) : null,
  };
}

export const fetchAdjacentEbooks = cache(fetchAdjacentEbooksUncached);
