import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";

import NavBar from "../../_components/NavBar";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import {
  buildLyThuyetHref,
  computePrevNext,
  computeRelated,
  fetchAllLyThuyet,
  fetchAllLyThuyetSlugs,
  fetchLyThuyetBySlug,
} from "@/lib/data/ly-thuyet";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import type { LyThuyet } from "@/types/ly-thuyet";
import { GROUP_ACCENT, NHOM_ORDER } from "@/types/ly-thuyet";

import LibNavLink from "../_components/LibNavLink";
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
      // Parse existing id (nếu admin đã gắn) → ưu tiên.
      const idMatch = /id\s*=\s*["']([^"']+)["']/i.exec(attrs);
      const id = idMatch ? idMatch[1] : `sec-${counter}`;
      const newAttrs = idMatch
        ? attrs
        : `${attrs} id="${id}"`.replace(/\s+/g, " ");
      // Label: strip tag bên trong (vd `.div-title` chứa text đơn giản).
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
  // Tìm space gần midpoint nhất (ưu tiên trước midpoint để phần em kéo dài hơn).
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

export default async function LyThuyetDetailPage({ params }: Props) {
  const { slug } = await params;

  const [current, allItems, { courses }] = await Promise.all([
    fetchLyThuyetBySlug(slug),
    fetchAllLyThuyet(),
    getKhoaHocPageData(),
  ]);

  if (!current) notFound();

  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  /* ────────────────── Derived data ────────────────── */
  const { html: contentHtml, toc } = injectH2Ids(current.content ?? "");
  const { prev, next } = computePrevNext(allItems, current);
  const related = computeRelated(allItems, current, 4);
  const heroSplit = splitHeroTitle(current.ten);
  const accent = GROUP_ACCENT[current.nhom ?? ""] ?? "#ee5b9f";

  /* Sidebar nav: tất cả bài, group theo nhóm, highlight bài current. */
  const sidebarGroups: Array<{ nhom: string; items: LyThuyet[] }> = NHOM_ORDER
    .map((nhom) => ({
      nhom: nhom as string,
      items: allItems.filter((r) => r.nhom === nhom),
    }))
    .filter((g) => g.items.length > 0);
  // Nhóm khác không thuộc enum — append cuối.
  const knownNhom = new Set<string>(NHOM_ORDER);
  const otherNhoms = Array.from(
    new Set(
      allItems
        .map((r) => r.nhom)
        .filter((n): n is string => !!n && !knownNhom.has(n))
    )
  );
  for (const nhom of otherNhoms) {
    sidebarGroups.push({
      nhom,
      items: allItems.filter((r) => r.nhom === nhom),
    });
  }

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
        <NavBar khoaHocGroups={khoaHocGroups} />

        <div className="ktn-lib">
          <div className="page">
            {/* ───────── LEFT NAV ───────── */}
            <aside className="lnav" aria-label="Danh mục thư viện">
              <div className="lnav-search">
                {/* Search ở detail chỉ là shortcut trở về landing — search
                    thật được implement ở landing (client state). Dùng <Link>
                    bao `<input readOnly>` để giữ visual giống search bar mà
                    không cần mount client component riêng. */}
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

              {sidebarGroups.map((g) => (
                <div className="lnav-section" key={g.nhom}>
                  <p className="lnav-cat">{g.nhom}</p>
                  {g.items.map((it) => (
                    <LibNavLink
                      key={it.id}
                      href={buildLyThuyetHref(it.slug)}
                      className="lnav-item"
                      isActive={it.id === current.id}
                    >
                      {it.ten}
                    </LibNavLink>
                  ))}
                </div>
              ))}
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

              {/* HERO */}
              <div
                className="hero"
                style={{ ["--hero-accent" as string]: accent }}
              >
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

              {/* BODY — render HTML content từ DB.
                 Admin trust content → OK để dangerouslySetInnerHTML
                 (xem brief §7: HTML Content Safety). */}
              <div className="body">
                {/* Video chính (nếu có): hiển thị trên đầu body, trên drop-cap. */}
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
                  <article
                    className="ktn-lib-content"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                ) : (
                  <p className="intro">
                    {current.short_content ??
                      "Bài lý thuyết đang được biên soạn. Vui lòng quay lại sau."}
                  </p>
                )}

                {/* Video tham khảo khác (nếu có) */}
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

              {/* Related + Prev/Next */}
              {related.length > 0 || prev || next ? (
                <div className="related-section">
                  {related.length > 0 ? (
                    <>
                      <p className="sec-lbl">Bài cùng chủ đề</p>
                      <div className="rel-grid">
                        {related.map((r, i) => {
                          const thumb = r.thumbnail
                            ? cfImageForThumbnail(r.thumbnail) ?? r.thumbnail
                            : null;
                          return (
                            <Link
                              key={r.id}
                              href={buildLyThuyetHref(r.slug)}
                              className="rel-card"
                            >
                              <div className="rel-th">
                                {thumb ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={thumb}
                                    alt={r.ten}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <span>
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="rel-t">{r.ten}</p>
                                <p className="rel-s">
                                  {r.nhom ?? "Thư viện"} · {r.readingMin} phút
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  ) : null}

                  {prev || next ? (
                    <div
                      className="pn"
                      data-only-prev={!next && prev ? "" : undefined}
                      data-only-next={!prev && next ? "" : undefined}
                    >
                      {prev ? (
                        <Link
                          href={buildLyThuyetHref(prev.slug)}
                          className="pn-a pn-prev-c"
                        >
                          <p className="pn-l">← Bài trước</p>
                          <p className="pn-t">{prev.ten}</p>
                        </Link>
                      ) : null}
                      {next ? (
                        <Link
                          href={buildLyThuyetHref(next.slug)}
                          className="pn-a pn-next-c"
                        >
                          <p className="pn-l">Bài tiếp theo →</p>
                          <p
                            className="pn-t"
                            style={{ color: "#fff", fontStyle: "normal" }}
                          >
                            {next.ten}
                          </p>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
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
                <Link href="/hoc-thu" className="btn-out">
                  🎨 Đăng ký học thử
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
