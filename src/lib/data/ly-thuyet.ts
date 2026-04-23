import "server-only";

import { createStaticClient } from "@/lib/supabase/static";
import type {
  LyThuyet,
  LyThuyetCard,
  LyThuyetRow,
} from "@/types/ly-thuyet";
import { NHOM_ORDER } from "@/types/ly-thuyet";

import {
  buildLyThuyetSlug,
  calcReadingMin,
} from "./ly-thuyet-shared";

/* Re-export các helper thuần để server code chỉ cần import từ một chỗ.
   Client code nên import trực tiếp từ `./ly-thuyet-shared`. */
export {
  buildLyThuyetHref,
  buildLyThuyetSlug,
  calcReadingMin,
  slugifyLyThuyet,
} from "./ly-thuyet-shared";

/** Normalize 1 row từ DB → dạng enrich (có slug, readingMin, trimmed title…). */
export function enrichLyThuyet(row: LyThuyetRow): LyThuyet {
  const ten = row.ten_ly_thuyet?.trim() || "Bài chưa đặt tên";
  const nhom = row.thuoc_nhom?.trim() || null;
  const tagList = Array.isArray(row.tags) ? row.tags.filter(Boolean) : [];
  return {
    ...row,
    slug: buildLyThuyetSlug(row),
    ten,
    nhom,
    readingMin: calcReadingMin(row.content ?? row.short_content ?? ""),
    tagList,
  };
}

/** Rút gọn 1 enrich → card dùng ở landing/related. */
export function toCard(item: LyThuyet): LyThuyetCard {
  return {
    id: item.id,
    slug: item.slug,
    ten: item.ten,
    shortContent: item.short_content,
    thumbnail: item.thumbnail,
    nhom: item.nhom,
    readingMin: item.readingMin,
    tags: item.tagList,
  };
}

/** Chỉ chọn các cột cần cho list; tránh kéo `content` dài về client. */
const LIST_COLUMNS =
  "id, created_at, ten_ly_thuyet, short_content, thumbnail, thuoc_nhom, tags, slug";
/** Cột đầy đủ cho detail page. */
const FULL_COLUMNS =
  "id, created_at, ten_ly_thuyet, video, video_tham_khao_khac, short_content, content, thumbnail, thuoc_nhom, tags, slug";

/**
 * Lấy toàn bộ bài lý thuyết — sắp xếp theo `thuoc_nhom` (ổn định theo
 * `NHOM_ORDER`), rồi `id` tăng dần trong cùng nhóm để prev/next predictable.
 *
 * Primary path: query có cột `slug` (sau khi DB đã chạy migration
 * `ADD COLUMN slug text UNIQUE`). Nếu lỗi (schema cache cũ / role thiếu
 * grant / cột chưa tồn tại) → retry bỏ `slug` và log để debug.
 */
export async function fetchAllLyThuyet(): Promise<LyThuyet[]> {
  const supabase = createStaticClient();
  if (!supabase) {
    console.error(
      "[ly-thuyet] createStaticClient() returned null — thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY?"
    );
    return [];
  }

  let rows: LyThuyetRow[] | null = null;

  const first = await supabase
    .from("dt_ly_thuyet_nen_tang")
    .select(LIST_COLUMNS)
    .order("thuoc_nhom", { ascending: true })
    .order("id", { ascending: true });

  if (first.error) {
    console.warn(
      "[ly-thuyet] fetchAllLyThuyet primary query failed, retrying without `slug` column:",
      first.error.message
    );
    const retry = await supabase
      .from("dt_ly_thuyet_nen_tang")
      .select(LIST_COLUMNS.replace(", slug", ""))
      .order("thuoc_nhom", { ascending: true })
      .order("id", { ascending: true });
    if (retry.error) {
      console.error(
        "[ly-thuyet] fetchAllLyThuyet retry also failed:",
        retry.error.message,
        "— check RLS (SELECT policy for anon) và GRANT trên dt_ly_thuyet_nen_tang. Xem sql/fix_dt_ly_thuyet_nen_tang_grants.sql."
      );
      return [];
    }
    rows = (retry.data ?? []) as unknown as LyThuyetRow[];
  } else {
    rows = (first.data ?? []) as unknown as LyThuyetRow[];
  }

  if (!rows || rows.length === 0) {
    console.warn(
      "[ly-thuyet] fetchAllLyThuyet returned 0 rows — table trống hoặc anon SELECT bị RLS chặn."
    );
  }

  return rows.map(enrichLyThuyet).sort(sortByNhomOrder);
}

/**
 * Detail page — filter theo cột `slug` (primary path, 1 round-trip).
 * Nếu query cột `slug` lỗi (schema cache cũ / cột chưa tồn tại) → fallback
 * fetch all + match slug JS-side (đã được `enrichLyThuyet` sinh ra từ
 * `slug` DB hoặc slugify `ten_ly_thuyet`).
 */
export async function fetchLyThuyetBySlug(slug: string): Promise<LyThuyet | null> {
  if (!slug) return null;
  const supabase = createStaticClient();
  if (!supabase) return null;

  const direct = await supabase
    .from("dt_ly_thuyet_nen_tang")
    .select(FULL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (!direct.error && direct.data) {
    return enrichLyThuyet(direct.data as unknown as LyThuyetRow);
  }

  if (direct.error) {
    console.warn(
      `[ly-thuyet] fetchLyThuyetBySlug("${slug}") primary query failed, fallback to full-scan:`,
      direct.error.message
    );
  }

  // Fallback: fetch all (full columns, không select slug để tránh lỗi lặp).
  const all = await supabase
    .from("dt_ly_thuyet_nen_tang")
    .select(FULL_COLUMNS.replace(", slug", ""));

  if (all.error || !all.data) {
    if (all.error) {
      console.error(
        `[ly-thuyet] fetchLyThuyetBySlug("${slug}") fallback failed:`,
        all.error.message
      );
    }
    return null;
  }

  const items = (all.data as unknown as LyThuyetRow[]).map(enrichLyThuyet);
  return items.find((r) => r.slug === slug) ?? null;
}

/** Prev / Next trong cùng nhóm theo thứ tự `id`. */
export function computePrevNext(
  all: LyThuyet[],
  current: LyThuyet
): { prev: LyThuyetCard | null; next: LyThuyetCard | null } {
  const sameNhom = all
    .filter((r) => (r.nhom ?? "") === (current.nhom ?? ""))
    .sort((a, b) => a.id - b.id);
  const idx = sameNhom.findIndex((r) => r.id === current.id);
  const prev = idx > 0 ? toCard(sameNhom[idx - 1]!) : null;
  const next =
    idx >= 0 && idx < sameNhom.length - 1 ? toCard(sameNhom[idx + 1]!) : null;
  return { prev, next };
}

/** Bài cùng nhóm, loại chính nó, tối đa `limit` bài (ưu tiên id gần nhất). */
export function computeRelated(
  all: LyThuyet[],
  current: LyThuyet,
  limit = 4
): LyThuyetCard[] {
  const sameNhom = all.filter(
    (r) => r.id !== current.id && (r.nhom ?? "") === (current.nhom ?? "")
  );
  // Ưu tiên bài gần id hiện tại nhất (cùng chương logic).
  sameNhom.sort(
    (a, b) => Math.abs(a.id - current.id) - Math.abs(b.id - current.id)
  );
  return sameNhom.slice(0, limit).map(toCard);
}

/** Group all → Record<nhom, items[]> theo `NHOM_ORDER`. */
export function groupByNhom(items: LyThuyet[]): Array<{
  nhom: string;
  items: LyThuyet[];
}> {
  const map = new Map<string, LyThuyet[]>();
  for (const it of items) {
    const key = it.nhom ?? "Khác";
    const bucket = map.get(key) ?? [];
    bucket.push(it);
    map.set(key, bucket);
  }
  const ordered: Array<{ nhom: string; items: LyThuyet[] }> = [];
  for (const nhom of NHOM_ORDER) {
    const bucket = map.get(nhom);
    if (bucket && bucket.length > 0) {
      ordered.push({ nhom, items: bucket });
      map.delete(nhom);
    }
  }
  // Các nhóm "khác" (không thuộc enum) xếp cuối, theo alpha.
  Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .forEach(([nhom, bucket]) => ordered.push({ nhom, items: bucket }));
  return ordered;
}

function sortByNhomOrder(a: LyThuyet, b: LyThuyet): number {
  const ia = NHOM_ORDER.indexOf((a.nhom ?? "") as never);
  const ib = NHOM_ORDER.indexOf((b.nhom ?? "") as never);
  const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
  const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
  if (ra !== rb) return ra - rb;
  return a.id - b.id;
}

/** Cho `generateStaticParams` — trả về danh sách slug đã unique. */
export async function fetchAllLyThuyetSlugs(): Promise<string[]> {
  const items = await fetchAllLyThuyet();
  return items.map((r) => r.slug);
}

/**
 * Breadcrumb path. Luôn bắt đầu bằng `Thư viện` (trang landing) và kết thúc
 * bằng tên bài. Nếu có `nhom` thì chèn vào giữa.
 */
export function buildBreadcrumbs(item: LyThuyet): Array<{
  label: string;
  href?: string;
}> {
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Thư viện", href: "/kien-thuc-nen-tang" },
  ];
  if (item.nhom) {
    crumbs.push({ label: item.nhom });
  }
  crumbs.push({ label: item.ten });
  return crumbs;
}
