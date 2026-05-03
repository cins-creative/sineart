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

import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { normalizeEbookSlugSegment } from "@/lib/ebook-slug-normalize";
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

/** Không gồm mảng ảnh / embed / chi tiết — tránh 400 khi schema chưa có cột mới. */
const SELECT_COMPACT =
  "id, slug, title, so_trang, featured, categories, thumbnail, content, created_at, updated_at";

/** Tối thiểu để vẫn list được ebook — chỉ sort theo `created_at`. */
const SELECT_MINIMAL = "id, slug, title, created_at";

function logSupabaseError(context: string, err: unknown, level: "error" | "warn" = "error"): void {
  const payload =
    err && typeof err === "object"
      ? (() => {
          const o = err as { message?: string; code?: string; details?: string; hint?: string };
          return { message: o.message, code: o.code, details: o.details, hint: o.hint };
        })()
      : err;
  if (level === "warn") console.warn(context, payload);
  else console.error(context, payload);
}

/** Alias — cùng logic `normalizeEbookSlugSegment` (decode % + mọi dash Unicode). */
function normalizeEbookSlugForLookup(slug: string): string {
  return normalizeEbookSlugSegment(slug);
}

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
    // Rewrite account hash về Sine Art — fix ảnh bị 403 err=9426 vì legacy
    // admin paste URL với account hash cũ.
    const normalized = cfImageNormalizeAccount(t);
    return normalized ? [normalized] : [t];
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

/**
 * Thử từng tầng `select` + (nếu schema có) `order(featured)`; nếu lỗi thì sort chỉ theo `created_at`.
 * `SELECT_MINIMAL` không có `featured` — chỉ sort theo `created_at`.
 */
async function fetchMktEbooksList(
  supabase: NonNullable<ReturnType<typeof createStaticClient>>,
): Promise<{ data: Record<string, unknown>[]; usedSelect: string } | null> {
  const trySelectList = async (selectList: string, label: string) => {
    const onlyCreated = selectList === SELECT_MINIMAL;
    const orderModes: boolean[] = onlyCreated ? [false] : [true, false];
    for (const useFeatured of orderModes) {
      let q = supabase.from("mkt_ebooks").select(selectList);
      if (useFeatured) q = q.order("featured", { ascending: false });
      const { data, error } = await q.order("created_at", { ascending: false });
      if (!error) {
        if (selectList !== SELECT_COLS || !useFeatured) {
          console.warn("[ebook] fetchAllEbooks: using fallback", { label, useFeaturedOrder: useFeatured });
        }
        return {
          data: (data ?? []) as unknown as Record<string, unknown>[],
          usedSelect: selectList,
        };
      }
      logSupabaseError(
        `[ebook] mkt_ebooks list (${label}, featuredOrder=${useFeatured})`,
        error,
        "warn",
      );
    }
    return null;
  };

  let pack = await trySelectList(SELECT_COLS, "full");
  if (pack) return pack;

  pack = await trySelectList(SELECT_COMPACT, "compact");
  if (pack) return pack;

  pack = await trySelectList(SELECT_MINIMAL, "minimal");
  return pack;
}

async function fetchAllEbooksUncached(): Promise<EbookItem[]> {
  try {
    const supabase = createStaticClient();
    if (!supabase) return [];
    const pack = await fetchMktEbooksList(supabase);
    if (!pack) {
      console.error("[ebook] fetchAllEbooks: all select tiers failed");
      return [];
    }
    return pack.data.map((r) => mapRow(r));
  } catch (e) {
    console.warn("[ebook] fetchAllEbooks unexpected error:", e);
    return [];
  }
}

export const fetchAllEbooks = cache(fetchAllEbooksUncached);

async function fetchEbookBySlugUncached(
  slug: string,
): Promise<EbookItem | null> {
  const supabase = createStaticClient();
  if (!supabase) return null;
  const key = normalizeEbookSlugForLookup(slug);
  if (!key) return null;

  const tryOne = async (selectList: string) => {
    const { data, error } = await supabase
      .from("mkt_ebooks")
      .select(selectList)
      .eq("slug", key)
      .limit(1)
      .maybeSingle();
    if (error) {
      logSupabaseError("[ebook] fetchEbookBySlug query", error, "warn");
      return null;
    }
    return data ? mapRow(data as unknown as Record<string, unknown>) : null;
  };

  let hit = await tryOne(SELECT_COLS);
  if (hit) return hit;
  hit = await tryOne(SELECT_COMPACT);
  if (hit) return hit;
  hit = await tryOne(SELECT_MINIMAL);
  if (hit) return hit;

  /** Fallback: slug trong DB có thể chứa dash Unicode / ký tự ẩn — so khớp sau normalize. */
  const all = await fetchAllEbooks();
  const fromList =
    all.find((e) => normalizeEbookSlugForLookup(e.slug) === key) ??
    all.find((e) => normalizeEbookSlugForLookup(e.slug).toLowerCase() === key.toLowerCase());
  return fromList ?? null;
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
