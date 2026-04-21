/**
 * Queries Supabase cho 2 trang public:
 *   - /tra-cuu-thong-tin         (listing)
 *   - /tra-cuu-thong-tin/[slug]  (detail)
 *
 * CHỈ DÙNG TỪ SERVER COMPONENT — import `next/headers` gián tiếp qua `supabase/server`.
 * Client component phải import helpers từ `./tra-cuu-shared` thay vì file này.
 */

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { TraCuuTypeValue } from "@/lib/admin/tra-cuu-schema";

import type { TraCuuDetail, TraCuuListItem, TruongLookup } from "./tra-cuu-shared";
import { TRA_CUU_TYPE_OPTIONS } from "./tra-cuu-shared";

// Re-export cho tiện từ server component (không phá import cũ).
export {
  TRA_CUU_TYPE_OPTIONS,
  traCuuTypeLabel,
  buildTraCuuHref,
  formatDateVi,
  estimateReadMinutes,
  extractHeadings,
  injectHeadingIds,
} from "./tra-cuu-shared";
export type {
  TraCuuTypeValue,
  TraCuuListItem,
  TraCuuDetail,
  TruongLookup,
} from "./tra-cuu-shared";

const LIST_COLS =
  "id, slug, title, thumbnail_url, thumbnail_alt, nam, excerpt, is_featured, published_at, truong_ids, type";
const DETAIL_COLS = `${LIST_COLS}, body_html, updated_at, album`;

const TYPE_VALUES: ReadonlySet<string> = new Set(TRA_CUU_TYPE_OPTIONS.map((o) => o.value));

function asIntArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const it of v) {
    const n = Number(it);
    if (Number.isFinite(n)) out.push(Math.trunc(n));
  }
  return out;
}

function asTypeArray(v: unknown): TraCuuTypeValue[] {
  if (!Array.isArray(v)) return [];
  const out: TraCuuTypeValue[] = [];
  for (const it of v) {
    if (typeof it === "string" && TYPE_VALUES.has(it)) out.push(it as TraCuuTypeValue);
  }
  return out;
}

function mapListRow(raw: Record<string, unknown>): TraCuuListItem {
  return {
    id: Number(raw.id),
    slug: (raw.slug as string | null) ?? null,
    title: (raw.title as string | null) ?? null,
    thumbnail_url: (raw.thumbnail_url as string | null) ?? null,
    thumbnail_alt: (raw.thumbnail_alt as string | null) ?? null,
    nam: raw.nam == null ? null : Number(raw.nam),
    excerpt: (raw.excerpt as string | null) ?? null,
    is_featured: !!raw.is_featured,
    published_at: String(raw.published_at ?? ""),
    truong_ids: asIntArray(raw.truong_ids),
    type: asTypeArray(raw.type),
  };
}

/**
 * Parse album: hỗ trợ cả 3 dạng lưu trong DB:
 *   1. Postgres `text[]` → JS array
 *   2. `jsonb` array → JS array
 *   3. `text` chứa JSON-encoded array (legacy từ form admin)
 */
function asStrArray(v: unknown): string[] {
  if (v == null) return [];
  let arr: unknown = v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        arr = JSON.parse(t);
      } catch {
        return [];
      }
    } else {
      return [t];
    }
  }
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const it of arr) {
    if (typeof it === "string") {
      const t = it.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function mapDetail(raw: Record<string, unknown>): TraCuuDetail {
  return {
    ...mapListRow(raw),
    body_html: (raw.body_html as string | null) ?? null,
    updated_at: (raw.updated_at as string | null) ?? null,
    album: asStrArray(raw.album),
  };
}

// ─── Supabase queries ───────────────────────────────────────────────────

async function fetchAllTraCuuUncached(): Promise<TraCuuListItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tra_cuu_thong_tin")
    .select(LIST_COLS)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("[tra-cuu] fetchAllTraCuu error:", error);
    return [];
  }
  return (data ?? []).map((r) => mapListRow(r as Record<string, unknown>));
}

/** Toàn bộ list — client sẽ filter/search/paginate client-side (≤ 500 rows). */
export const fetchAllTraCuu = cache(fetchAllTraCuuUncached);

async function fetchTruongLookupUncached(): Promise<TruongLookup[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("dh_truong_dai_hoc")
    .select("id, ten_truong_dai_hoc")
    .order("ten_truong_dai_hoc", { ascending: true });

  if (error || !data) return [];
  return data
    .map((r): TruongLookup | null => {
      const row = r as { id?: unknown; ten_truong_dai_hoc?: unknown };
      const id = Number(row.id);
      const ten =
        typeof row.ten_truong_dai_hoc === "string" ? row.ten_truong_dai_hoc.trim() : "";
      if (!Number.isFinite(id) || !ten) return null;
      return { id, ten };
    })
    .filter((x): x is TruongLookup => x !== null);
}

export const fetchTruongLookup = cache(fetchTruongLookupUncached);

async function fetchTraCuuBySlugUncached(slug: string): Promise<TraCuuDetail | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tra_cuu_thong_tin")
    .select(DETAIL_COLS)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapDetail(data as Record<string, unknown>);
}

export const fetchTraCuuBySlug = cache(fetchTraCuuBySlugUncached);

/**
 * Lấy bài liên quan: ưu tiên cùng `truong_ids`, rồi đến cùng `type`, sort theo ngày.
 * @param currentId id của bài hiện tại để loại khỏi kết quả
 */
async function fetchRelatedTraCuuUncached(
  currentId: number,
  truongIds: number[],
  limit = 4,
): Promise<TraCuuListItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  if (truongIds.length === 0) {
    const { data } = await supabase
      .from("tra_cuu_thong_tin")
      .select(LIST_COLS)
      .neq("id", currentId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []).map((r) => mapListRow(r as Record<string, unknown>));
  }

  const { data } = await supabase
    .from("tra_cuu_thong_tin")
    .select(LIST_COLS)
    .neq("id", currentId)
    .overlaps("truong_ids", truongIds)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((r) => mapListRow(r as Record<string, unknown>));
}

export const fetchRelatedTraCuu = cache(fetchRelatedTraCuuUncached);

/** Bài trước/sau theo `published_at` — dùng cho thanh prev/next ở detail. */
async function fetchAdjacentTraCuuUncached(
  currentId: number,
  publishedAt: string,
): Promise<{ prev: TraCuuListItem | null; next: TraCuuListItem | null }> {
  const supabase = await createClient();
  if (!supabase) return { prev: null, next: null };

  const [prevRes, nextRes] = await Promise.all([
    supabase
      .from("tra_cuu_thong_tin")
      .select(LIST_COLS)
      .lt("published_at", publishedAt)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tra_cuu_thong_tin")
      .select(LIST_COLS)
      .gt("published_at", publishedAt)
      .order("published_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    prev: prevRes.data
      ? mapListRow(prevRes.data as Record<string, unknown>)
      : null,
    next: nextRes.data
      ? mapListRow(nextRes.data as Record<string, unknown>)
      : null,
  };
}

export const fetchAdjacentTraCuu = cache(fetchAdjacentTraCuuUncached);
