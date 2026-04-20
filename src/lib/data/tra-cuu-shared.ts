/**
 * Helpers & types client-safe cho `tra_cuu_thong_tin`.
 * KHÔNG import bất kỳ module server-only (supabase/server, next/headers, cache...).
 * Dùng được từ cả server lẫn client component.
 */

import { TRA_CUU_TYPE_OPTIONS, type TraCuuTypeValue } from "@/lib/admin/tra-cuu-schema";

export { TRA_CUU_TYPE_OPTIONS };
export type { TraCuuTypeValue };

export type TraCuuListItem = {
  id: number;
  slug: string | null;
  title: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  nam: number | null;
  excerpt: string | null;
  is_featured: boolean;
  published_at: string;
  truong_ids: number[];
  type: TraCuuTypeValue[];
};

export type TraCuuDetail = TraCuuListItem & {
  body_html: string | null;
  updated_at: string | null;
};

export type TruongLookup = {
  id: number;
  ten: string;
};

// ─── Helpers format ─────────────────────────────────────────────────────

export function traCuuTypeLabel(v: string): string {
  return TRA_CUU_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

export function buildTraCuuHref(slug: string | null): string {
  if (!slug) return "/tra-cuu-thong-tin";
  return `/tra-cuu-thong-tin/${slug}`;
}

/** Format ngày Việt Nam: "10 thg 2, 2026" (dùng chung style với blog). */
export function formatDateVi(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

/** Ước tính số phút đọc từ HTML content. */
export function estimateReadMinutes(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function extractHeadings(html: string): { id: string; text: string }[] {
  const matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return matches.map((m, i) => {
    const raw = m[1]!.replace(/<[^>]+>/g, "").trim();
    return { id: `heading-${i}`, text: raw };
  });
}

export function injectHeadingIds(html: string): string {
  let idx = 0;
  return html.replace(/<h2([^>]*)>/gi, (_, attrs: string) => {
    const cleaned = String(attrs).replace(/\sid=["'][^"']*["']/i, "");
    return `<h2${cleaned} id="heading-${idx++}">`;
  });
}
