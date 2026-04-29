import type { MetadataRoute } from "next";

import { buildBlogSlug } from "@/lib/data/blog";
import { fetchAllDeThiSlugs } from "@/lib/data/de-thi";
import { fetchAllEbooks } from "@/lib/data/ebook";
import { createStaticClient } from "@/lib/supabase/static";

const SITE = "https://sineart.vn";

/** Giữ khớp logic chuẩn hoá slug lớp trong courses-page (không export hàm gốc). */
function normalizeClassSlug(urlClass: string | null | undefined): string {
  const raw = String(urlClass ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const m = u.pathname.match(/\/khoa-hoc\/([^/?#]+)/i);
      if (m?.[1]) return m[1].trim().toLowerCase();
      return u.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }
  return raw
    .replace(/^\/+|\/+$/g, "")
    .replace(/^khoa-hoc\//i, "")
    .toLowerCase();
}

/** Các trang tĩnh dưới `/kien-thuc-nen-tang/*` (không gồm `[slug]` động). */
const KIEN_THUC_STATIC_SEGMENTS = [
  "bo-cuc-sac-do",
  "bo-cuc-trong-thiet-ke",
  "bo-cuc-trong-tranh",
  "cac-he-mau-vat-ly",
  "co-so-tao-hinh",
  "diem-tap-trung",
  "gam-mau",
  "he-thong-mau-munsell",
  "khong-gian-mau",
  "ly-thuyet-hoa-sac",
  "ly-thuyet-phoi-canh",
  "ly-thuyet-vat-lieu",
  "mau-sac-qua-thiet-bi-dien-tu",
  "mo-hinh-cong-tru-mau",
  "nguyen-ly-thi-giac",
  "phoi-canh-khi-quyen",
  "phuong-phap-ve-cau-truc",
  "phuong-phap-ve-gioi-han",
  "shading-la-gi",
  "thuoc-tinh-mau-sac",
  "ti-le-co-the-nguoi",
] as const;

type PriorityCfg = { priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] };

function cfg(path: string): PriorityCfg {
  if (path === "/" || path === "") return { priority: 1, changeFrequency: "daily" };
  if (path === "/khoa-hoc") return { priority: 0.9, changeFrequency: "weekly" };
  if (path.startsWith("/khoa-hoc/")) return { priority: 0.8, changeFrequency: "weekly" };
  if (path === "/blogs") return { priority: 0.7, changeFrequency: "daily" };
  if (path.startsWith("/blogs/")) return { priority: 0.7, changeFrequency: "weekly" };
  if (path === "/gallery") return { priority: 0.6, changeFrequency: "monthly" };
  if (path.startsWith("/gallery")) return { priority: 0.6, changeFrequency: "monthly" };
  if (path === "/tra-cuu-thong-tin") return { priority: 0.6, changeFrequency: "monthly" };
  if (path.startsWith("/tra-cuu-thong-tin/")) return { priority: 0.55, changeFrequency: "monthly" };
  return { priority: 0.5, changeFrequency: "monthly" };
}

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();
  const entries: MetadataRoute.Sitemap = [];

  const push = (path: string, lastModified?: Date) => {
    const url = `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
    const { priority, changeFrequency } = cfg(path);
    entries.push({
      url,
      lastModified: lastModified ?? new Date(),
      changeFrequency,
      priority,
    });
  };

  const staticPaths = [
    "/",
    "/khoa-hoc",
    "/blogs",
    "/gallery",
    "/tra-cuu-thong-tin",
    "/tong-hop-de-thi",
    "/ebook",
    "/kien-thuc-nen-tang",
    "/thi-thu",
    "/donghocphi",
  ];

  for (const p of staticPaths) push(p);

  for (const seg of KIEN_THUC_STATIC_SEGMENTS) {
    push(`/kien-thuc-nen-tang/${seg}`);
  }

  if (!supabase) {
    return entries;
  }

  const [
    lopRes,
    blogsRes,
    traCuuRes,
    deThiSlugs,
    ebooks,
    baiTapRes,
  ] = await Promise.all([
    supabase.from("ql_lop_hoc").select("url_class").not("url_class", "is", null).limit(500),
    supabase.from("mkt_blogs").select("id, title").limit(3000),
    supabase.from("tra_cuu_thong_tin").select("slug").not("slug", "is", null).limit(3000),
    fetchAllDeThiSlugs(),
    fetchAllEbooks(),
    supabase.from("hv_he_thong_bai_tap").select("url_bai_tap").not("url_bai_tap", "is", null).limit(2000),
  ]);

  const slugSet = new Set<string>();
  for (const row of lopRes.data ?? []) {
    const r = row as { url_class?: string | null };
    const s = normalizeClassSlug(r.url_class);
    if (s) slugSet.add(s);
  }
  for (const s of slugSet) push(`/khoa-hoc/${s}`);

  for (const row of blogsRes.data ?? []) {
    const r = row as { id?: number; title?: string | null };
    const id = Number(r.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const slug = buildBlogSlug(id, r.title ?? null);
    push(`/blogs/${slug}`);
  }

  for (const row of traCuuRes.data ?? []) {
    const r = row as { slug?: string | null };
    const s = String(r.slug ?? "").trim();
    if (s) push(`/tra-cuu-thong-tin/${encodeURIComponent(s)}`);
  }

  for (const slug of deThiSlugs) {
    if (slug) push(`/tong-hop-de-thi/${encodeURIComponent(slug)}`);
  }

  for (const e of ebooks) {
    const s = String(e.slug ?? "").trim();
    if (s) push(`/ebook/${encodeURIComponent(s)}`);
  }

  for (const row of baiTapRes.data ?? []) {
    const r = row as { url_bai_tap?: string | null };
    const s = String(r.url_bai_tap ?? "").trim();
    if (s) push(`/he-thong-bai-tap/${encodeURIComponent(s)}`);
  }

  const seen = new Set<string>();
  const deduped: MetadataRoute.Sitemap = [];
  for (const e of entries) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    deduped.push(e);
  }

  return deduped;
}
