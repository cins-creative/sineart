import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import {
  buildLyThuyetHref,
  fetchAllLyThuyetSlugs,
  fetchLyThuyetBySlug,
} from "@/lib/data/ly-thuyet";
import { GROUP_ACCENT } from "@/types/ly-thuyet";

import HeroFocusToggle from "../_components/HeroFocusToggle";
import LibraryContent from "../_components/LibraryContent";
import LibSidebarNav from "../_components/LibSidebarNav";
import { LibSidebarNavSkeleton } from "../_components/LibSidebarNav.skeleton";
import NavBarBoundary from "../_components/NavBarBoundary";
import { NavBarBoundarySkeleton } from "../_components/NavBarBoundary.skeleton";
import RelatedNav from "../_components/RelatedNav";
import { RelatedNavSkeleton } from "../_components/RelatedNav.skeleton";
import TocScrollSpy from "../_components/TocScrollSpy";

import "../kien-thuc-library.css";

/**
 * ISR — cùng chu kỳ với landing (10 phút). Trang detail chủ yếu là content
 * HTML do admin nhập, không đổi thường xuyên.
 */
export const revalidate = 600;

/* ─────────────────────────────────────────────────────────────────
 * TOC auto-extract: tìm mọi `<h2>` trong `content`, gán `id` dạng
 * `sec-N` (chèn vào HTML). Trả về danh sách {id, label} để render TOC
 * cột phải. Chỉ cover `<h2>` vì preview_v4 dùng `.div-title` là H2
 * duy nhất; H3 (`.sh3`) là sub-heading không hiển thị ở TOC chính.
 * ───────────────────────────────────────────────────────────────── */
function injectH2Ids(
  html: string
): { html: string; toc: Array<{ id: string; label: string }> } {
  if (!html) return { html: "", toc: [] };
  const toc: Array<{ id: string; label: string }> = [];
  let counter = 0;
  const out = html.replace(
    /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
    (_m, attrs: string, inner: string) => {
      counter += 1;
      const idMatch = /id\s*=\s*["']([^"']+)["']/i.exec(attrs);
      const id = idMatch ? idMatch[1] : `sec-${counter}`;
      const newAttrs = idMatch
        ? attrs
        : `${attrs} id="${id}"`.replace(/\s+/g, " ");
      const label = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      toc.push({ id, label });
      return `<h2${newAttrs}>${inner}</h2>`;
    }
  );
  return { html: out, toc };
}

/** Split tiêu đề thành 2 đoạn: phần trước + phần sau (in italic/gradient).
 *  Dùng để render `<h1>Cơ sở <em>tạo hình</em></h1>` giống preview_v4. */
function splitHeroTitle(ten: string): { a: string; b: string } {
  const clean = ten.replace(/\s+/g, " ").trim();
  if (clean.length <= 14 || !clean.includes(" ")) return { a: "", b: clean };
  const mid = Math.floor(clean.length / 2);
  let splitAt = clean.lastIndexOf(" ", mid);
  if (splitAt < clean.length / 4) splitAt = clean.indexOf(" ", mid);
  if (splitAt <= 0) return { a: "", b: clean };
  return {
    a: clean.slice(0, splitAt).trim(),
    b: clean.slice(splitAt + 1).trim(),
  };
}

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await fetchAllLyThuyetSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await fetchLyThuyetBySlug(slug);
  if (!row) return {};
  const desc =
    row.short_content?.trim() ||
    row.content?.replace(/<[^>]+>/g, " ").slice(0, 160).trim() ||
    undefined;
  const title = row.ten;
  const thumb = row.thumbnail
    ? cfImageForThumbnail(row.thumbnail) ?? row.thumbnail
    : undefined;
  return {
    title: `${title} — Thư viện Sine Art`,
    description: desc,
    alternates: {
      canonical: `https://sineart.vn${buildLyThuyetHref(row.slug)}`,
    },
    openGraph: {
      title,
      description: desc,
      images: thumb ? [{ url: thumb }] : [],
      type: "article",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: thumb ? [thumb] : [],
    },
  };
}

/**
 * Streaming strategy (xem STREAMING_REFACTOR.md):
 *
 * 1. Top-level `await fetchLyThuyetBySlug(slug)` — single-row lookup, rất
 *    nhanh. Cần thiết cho:
 *    - 404 check (`notFound()` phải ở top level để trả status HTTP đúng).
 *    - `generateMetadata` (đã await riêng).
 *    - Render critical content ngay: hero title, body HTML, toc, tags, JSON-LD.
 *
 * 2. Phần còn lại stream qua 3 Suspense boundary độc lập:
 *    - `<NavBarBoundary />` — fetch `courses` cho navbar (không liên quan bài).
 *    - `<LibSidebarNav />` — fetch toàn bộ bài lý thuyết cho sidebar trái.
 *    - `<RelatedNav />` — fetch toàn bộ bài cho prev/next + related ở cuối.
 *
 * Các fetch ở data layer đều được `React.cache()` wrap → `fetchAllLyThuyet()`
 * gọi từ `LibSidebarNav` + `RelatedNav` chỉ gây 1 round-trip Supabase thật
 * sự, boundary còn lại share promise qua request-scoped cache.
 */
export default async function LyThuyetDetailPage({ params }: Props) {
  const { slug } = await params;
  const current = await fetchLyThuyetBySlug(slug);
  if (!current) notFound();

  /* ────────────────── Derived data (từ current, không DB) ────────────────── */
  const { html: contentHtml, toc } = injectH2Ids(current.content ?? "");
  const heroSplit = splitHeroTitle(current.ten);
  const accent = GROUP_ACCENT[current.nhom ?? ""] ?? "#ee5b9f";

  /* JSON-LD Article + BreadcrumbList */
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: current.ten,
    description: current.short_content ?? undefined,
    author: { "@type": "Organization", name: "Sine Art" },
    publisher: {
      "@type": "Organization",
      name: "Sine Art",
      logo: { "@type": "ImageObject", url: "https://sineart.vn/logo.png" },
    },
    datePublished: current.created_at,
    dateModified: current.created_at,
    image: current.thumbnail ?? undefined,
    articleSection: current.nhom ?? undefined,
    inLanguage: "vi-VN",
    mainEntityOfPage: `https://sineart.vn${buildLyThuyetHref(current.slug)}`,
    keywords: current.tagList.join(", "),
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Thư viện",
        item: "https://sineart.vn/kien-thuc-nen-tang",
      },
      ...(current.nhom
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: current.nhom,
              item: `https://sineart.vn/kien-thuc-nen-tang#${encodeURIComponent(
                current.nhom
              )}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: current.nhom ? 3 : 2,
        name: current.ten,
      },
    ],
  };

  return (
    <>
      <Script
        id="ktn-detail-jsonld-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Script
        id="ktn-detail-jsonld-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <div className="sa-root kien-thuc-nen-tang-root">
        {/* Suspense #1: NavBar (cần fetch courses) — stream độc lập, không
            chặn hero/body. Skeleton giữ đúng chiều cao để tránh CLS. */}
        <Suspense fallback={<NavBarBoundarySkeleton />}>
          <NavBarBoundary />
        </Suspense>

        <div className="ktn-lib">
          <div className="page">
            {/* ───────── LEFT NAV ───────── */}
            <aside className="lnav" aria-label="Danh mục thư viện">
              <div className="lnav-search">
                {/* Search chỉ là shortcut về landing — static, render ngay. */}
                <Link
                  href="/kien-thuc-nen-tang"
                  aria-label="Mở tìm kiếm ở trang thư viện"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <input
                    type="search"
                    placeholder="Tìm trong thư viện..."
                    aria-hidden
                    readOnly
                    tabIndex={-1}
                    style={{ pointerEvents: "none" }}
                  />
                </Link>
              </div>

              {/* Suspense #2: Danh mục bài (cần fetchAllLyThuyet). */}
              <Suspense fallback={<LibSidebarNavSkeleton />}>
                <LibSidebarNav currentId={current.id} />
              </Suspense>
            </aside>

            {/* ───────── MAIN ───────── */}
            <main key={current.slug} className="ktn-main-enter">
              <nav className="bc" aria-label="Breadcrumb">
                <Link href="/kien-thuc-nen-tang">Thư viện</Link>
                {current.nhom ? (
                  <>
                    <span className="bc-sep">›</span>
                    <Link href="/kien-thuc-nen-tang">{current.nhom}</Link>
                  </>
                ) : null}
                <span className="bc-sep">›</span>
                <span className="bc-cur">{current.ten}</span>
              </nav>

              {/* HERO — render ngay từ `current` (top-level fetch). */}
              <div
                className="hero"
                style={{ ["--hero-accent" as string]: accent }}
              >
                <HeroFocusToggle />
                <div className="hero-glow" />
                <div
                  className="hero-content"
                  data-issue={`N°${String(current.id).padStart(2, "0")}`}
                >
                  <p className="hero-issue">
                    Thư viện
                    {current.nhom ? ` · ${current.nhom}` : ""}
                  </p>
                  <h1 className="hero-title">
                    {heroSplit.a ? (
                      <>
                        {heroSplit.a} <em>{heroSplit.b}</em>
                      </>
                    ) : (
                      <em>{heroSplit.b}</em>
                    )}
                  </h1>
                  {current.short_content ? (
                    <p className="hero-sub">{current.short_content}</p>
                  ) : null}
                  <div className="hero-meta">
                    <span>Sine Art</span>
                    <span>{current.readingMin} phút đọc</span>
                    {current.nhom ? <span>{current.nhom}</span> : null}
                  </div>
                </div>
              </div>

              {/* BODY — render HTML content từ DB. Static từ top-level fetch. */}
              <div className="body">
                {current.video ? (
                  <div
                    className="bleed break"
                    style={{ padding: 0, background: "#000", aspectRatio: "16/9" }}
                  >
                    <iframe
                      src={current.video}
                      title={`Video — ${current.ten}`}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ width: "100%", height: "100%", border: 0 }}
                    />
                  </div>
                ) : null}

                {contentHtml ? (
                  /* Wrap qua Client Component để đăng ký `window.showPanel`
                     cho inline handler của `.el-list-hover` (admin nhập HTML
                     có `onmouseover="showPanel('elXX')"`). Xem
                     `_components/LibraryContent.tsx`. */
                  <LibraryContent html={contentHtml} />
                ) : (
                  <p className="intro">
                    {current.short_content ??
                      "Bài lý thuyết đang được biên soạn. Vui lòng quay lại sau."}
                  </p>
                )}

                {current.video_tham_khao_khac ? (
                  <div
                    className="bleed break"
                    style={{ padding: 0, background: "#000", aspectRatio: "16/9" }}
                  >
                    <iframe
                      src={current.video_tham_khao_khac}
                      title={`Video tham khảo — ${current.ten}`}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ width: "100%", height: "100%", border: 0 }}
                    />
                  </div>
                ) : null}
              </div>

              {/* Suspense #3: Related + Prev/Next (cần fetchAllLyThuyet). */}
              <Suspense fallback={<RelatedNavSkeleton />}>
                <RelatedNav slug={current.slug} />
              </Suspense>
            </main>

            {/* ───────── RIGHT SIDEBAR ───────── */}
            <aside className="rnav" aria-label="Mục lục + thông tin bài">
              {toc.length > 0 ? (
                <>
                  <div className="rnav-lbl">Nội dung bài</div>
                  <nav className="toc2" aria-label="Mục lục bài">
                    {toc.map((t, idx) => (
                      <a key={t.id} href={`#${t.id}`}>
                        <span className="toc-pip" />
                        {String(idx + 1).padStart(2, "0")} — {t.label}
                      </a>
                    ))}
                  </nav>
                  <TocScrollSpy ids={toc.map((t) => t.id)} />
                </>
              ) : null}

              {current.tagList.length > 0 ? (
                <>
                  <div className="rnav-lbl">Tags</div>
                  <div className="tags2">
                    {current.tagList.map((t) => (
                      <span key={t} className="tag2">
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="cta-block">
                <p className="cta-tagline">Sine Art · 350+ học viên</p>
                <p className="cta-title">
                  Học mỹ thuật <em>bài bản</em>
                </p>
                <p className="cta-desc">
                  Giáo trình khoa học cho học sinh thi khối H, V và hoạ sĩ công
                  nghệ — hoạt hình, phim, game.
                </p>
                <Link href="/khoa-hoc" className="btn-full">
                  Xem khoá học →
                </Link>
                <a
                  href="https://www.facebook.com/sineart0102"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-out"
                >
                  🎨 Đăng ký học thử
                </a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
