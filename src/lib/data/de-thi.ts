/**
 * Queries Supabase cho 2 trang public:
 *   - /tong-hop-de-thi          (listing)
 *   - /tong-hop-de-thi/[slug]   (detail)
 *
 * CHỈ DÙNG TỪ SERVER COMPONENT — import `next/headers` gián tiếp qua
 * `supabase/server`. Client component import helpers từ `./de-thi-shared`.
 */

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";

import { vnSlugify as vnSlugifyShared } from "./de-thi-shared";
import type { DeThiDetail, DeThiListItem } from "./de-thi-shared";

// Re-export tiện dùng từ server component.
export {
  buildDeThiHref,
  formatDateVi,
  monAccent,
  MON_CANONICAL,
  vnSlugify,
} from "./de-thi-shared";
export type {
  DeThiListItem,
  DeThiDetail,
  TruongLookup,
  MonValue,
  MonOption,
} from "./de-thi-shared";
export { fetchTruongLookup } from "./tra-cuu"; // reuse — cùng bảng dh_truong_dai_hoc

const LIST_COLS =
  "id, slug, ten, thumbnail_url, thumbnail_alt, nam, excerpt, created_at, truong_ids, loai, mon, loai_mau_hinh_hoa";
const DETAIL_COLS = `${LIST_COLS}, body_html, content_raw, updated_at`;

function asIntArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const it of v) {
    const n = Number(it);
    if (Number.isFinite(n)) out.push(Math.trunc(n));
  }
  return out;
}

function asStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const it of v) {
    if (typeof it === "string") {
      const t = it.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function mapListRow(raw: Record<string, unknown>): DeThiListItem {
  return {
    id: Number(raw.id),
    slug: (raw.slug as string | null) ?? null,
    ten: (raw.ten as string | null) ?? null,
    thumbnail_url: (raw.thumbnail_url as string | null) ?? null,
    thumbnail_alt: (raw.thumbnail_alt as string | null) ?? null,
    nam: raw.nam == null ? null : Number(raw.nam),
    excerpt: (raw.excerpt as string | null) ?? null,
    created_at: String(raw.created_at ?? ""),
    truong_ids: asIntArray(raw.truong_ids),
    loai: asStrArray(raw.loai),
    mon: asStrArray(raw.mon),
    loai_mau_hinh_hoa: asStrArray(raw.loai_mau_hinh_hoa),
  };
}

function mapDetail(raw: Record<string, unknown>): DeThiDetail {
  return {
    ...mapListRow(raw),
    body_html: (raw.body_html as string | null) ?? null,
    content_raw: (raw.content_raw as string | null) ?? null,
    updated_at: (raw.updated_at as string | null) ?? null,
  };
}

// ─── Supabase queries ───────────────────────────────────────────────

async function fetchAllDeThiUncached(): Promise<DeThiListItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mkt_de_thi")
    .select(LIST_COLS)
    .order("nam", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[de-thi] fetchAllDeThi error:", error);
    return [];
  }
  return (data ?? []).map((r) => mapListRow(r as Record<string, unknown>));
}

/** Toàn bộ list — client sẽ filter/search/paginate client-side (≤ 500 rows). */
export const fetchAllDeThi = cache(fetchAllDeThiUncached);

async function fetchDeThiBySlugUncached(slug: string): Promise<DeThiDetail | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const tryLookup = async (candidate: string) => {
    const { data } = await supabase
      .from("mkt_de_thi")
      .select(DETAIL_COLS)
      .eq("slug", candidate)
      .maybeSingle();
    return data ?? null;
  };

  // 1) exact match (slug đã chuẩn hoá trong DB sẽ hit ở đây)
  let row = await tryLookup(slug);

  // 2) fallback: decode + normalize → xử lý URL cũ có dấu (đã được encode)
  if (!row) {
    const decoded = (() => {
      try {
        return decodeURIComponent(slug);
      } catch {
        return slug;
      }
    })();
    const normalized = vnSlugifyShared(decoded);
    if (normalized && normalized !== slug) {
      row = await tryLookup(normalized);
    }
  }

  if (!row) return null;
  return mapDetail(row as Record<string, unknown>);
}

export const fetchDeThiBySlug = cache(fetchDeThiBySlugUncached);

/**
 * Đề thi liên quan — theo brief:
 *   - Fetch cùng môn (overlap `mon`) sort nam desc, limit 12
 *   - Post-process: đẩy các item có cùng `loai_mau_hinh_hoa` lên trước
 *   - Nếu item hiện tại không có `mon`, fallback lấy mới nhất
 */
async function fetchRelatedDeThiUncached(
  currentId: number,
  mon: string[],
  loaiMau: string[],
  limit = 6
): Promise<DeThiListItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let rows: DeThiListItem[] = [];

  if (mon.length > 0) {
    const { data } = await supabase
      .from("mkt_de_thi")
      .select(LIST_COLS)
      .neq("id", currentId)
      .overlaps("mon", mon)
      .order("nam", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.max(12, limit * 2));
    rows = (data ?? []).map((r) => mapListRow(r as Record<string, unknown>));
  }

  if (rows.length === 0) {
    const { data } = await supabase
      .from("mkt_de_thi")
      .select(LIST_COLS)
      .neq("id", currentId)
      .order("nam", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    rows = (data ?? []).map((r) => mapListRow(r as Record<string, unknown>));
    return rows.slice(0, limit);
  }

  // Ưu tiên cùng loai_mau_hinh_hoa
  if (loaiMau.length > 0) {
    const mauSet = new Set(loaiMau);
    const sameMau: DeThiListItem[] = [];
    const others: DeThiListItem[] = [];
    for (const it of rows) {
      if (it.loai_mau_hinh_hoa.some((m) => mauSet.has(m))) sameMau.push(it);
      else others.push(it);
    }
    rows = [...sameMau, ...others];
  }

  return rows.slice(0, limit);
}

export const fetchRelatedDeThi = cache(fetchRelatedDeThiUncached);

/**
 * Slug list cho `generateStaticParams`.
 * DÙNG `createStaticClient` (anon, không đụng cookies) — vì
 * `generateStaticParams` chạy lúc build, không có HTTP request context.
 */
async function fetchAllDeThiSlugsUncached(): Promise<string[]> {
  const supabase = createStaticClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mkt_de_thi")
    .select("slug")
    .not("slug", "is", null)
    .limit(1000);
  if (error || !data) return [];
  return data
    .map((r) => String((r as { slug?: unknown }).slug ?? "").trim())
    .filter(Boolean);
}

export const fetchAllDeThiSlugs = cache(fetchAllDeThiSlugsUncached);
