import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";

import {
  getBySlug,
  getPrevNext,
  getNhomList,
  getByNhom,
  NHOM_ACCENT,
} from "@/data/ly-thuyet";
import HeroFocusToggle from "@/app/kien-thuc-nen-tang/_components/HeroFocusToggle";
import ReadingProgress from "@/components/library/ReadingProgress";
import TocCard from "@/components/library/TocCard";
import NavBarBoundary from "@/app/kien-thuc-nen-tang/_components/NavBarBoundary";
import { NavBarBoundarySkeleton } from "@/app/kien-thuc-nen-tang/_components/NavBarBoundary.skeleton";

import "@/app/kien-thuc-nen-tang/kien-thuc-library.css";

export interface TocItem {
  id: string;
  label: string;
}

interface Props {
  slug: string;
  children: ReactNode;
  /** Mục lục — truyền từ mỗi bài, dùng id="#sec-X" để scroll */
  toc?: TocItem[];
}

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

/** Chuẩn hoá tên nhóm → keyword tiếng Anh cho hero watermark. */
function nhomToKeyword(nhom: string): string {
  const m: Record<string, string> = {
    "Lý thuyết cơ sở": "fundamentals",
    "Bố cục": "composition",
    "Giải phẫu": "anatomy",
    "Màu sắc": "color",
    "Sắc độ": "value",
    "Vật liệu": "materials",
  };
  return m[nhom] ?? "theory";
}

export function ArticleLayout({ slug, children, toc = [] }: Props) {
  const article = getBySlug(slug);
  if (!article) return <div>Bài không tồn tại.</div>;

  const { prev, next } = getPrevNext(slug);
  const nhomList = getNhomList();
  const heroSplit = splitHeroTitle(article.ten);
  const accent = NHOM_ACCENT[article.nhom];
  const num = String(article.so_thu_tu).padStart(2, "0");
  const heroKw = nhomToKeyword(article.nhom);

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.ten,
    description: article.mo_ta,
    author: { "@type": "Organization", name: "Sine Art" },
    publisher: {
      "@type": "Organization",
      name: "Sine Art",
      logo: { "@type": "ImageObject", url: "https://sineart.vn/logo.png" },
    },
    articleSection: article.nhom,
    inLanguage: "vi-VN",
    mainEntityOfPage: `https://sineart.vn/kien-thuc-nen-tang/${slug}`,
    keywords: article.tags.join(", "),
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
      {
        "@type": "ListItem",
        position: 2,
        name: article.nhom,
        item: `https://sineart.vn/kien-thuc-nen-tang#${encodeURIComponent(article.nhom)}`,
      },
      { "@type": "ListItem", position: 3, name: article.ten },
    ],
  };

  return (
    <>
      <Script
        id={`jsonld-article-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Script
        id={`jsonld-bc-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      <div className="ktn-lib ktn-lib--v5">
        <Suspense fallback={<NavBarBoundarySkeleton />}>
          <NavBarBoundary />
        </Suspense>

        {/* HeroFocusToggle đặt ở level .ktn-lib (ngoài .main/.hero có animation
            tạo containing block) để position: fixed bind đúng viewport.
            `--hero-accent` forward để button primary có màu đúng nhóm bài. */}
        <div style={{ ["--hero-accent" as string]: accent } as React.CSSProperties}>
          <HeroFocusToggle />
        </div>

        {/* `--hero-accent` scoped trên `.page` để mọi sub-component (hero, rnav, lnav) đều pick được màu nhóm bài */}
        <div
          className="page"
          style={{ ["--hero-accent" as string]: accent }}
        >

          {/* ══════════════════════════ LEFT NAV ══════════════════════════ */}
          <aside className="lnav" aria-label="Danh mục thư viện">
            <h5 className="lnav-head">Thư viện kiến thức</h5>

            {nhomList.map((nhom) => (
              <div key={nhom} className="nav-group">
                <div className="nav-group-title">
                  <span className="nav-dot" style={{ background: NHOM_ACCENT[nhom] }} />
                  {nhom}
                </div>
                <ul className="nav-items">
                  {getByNhom(nhom).map((item) => (
                    <li
                      key={item.slug}
                      className={item.slug === slug ? "active" : ""}
                      style={
                        item.slug === slug
                          ? ({ ["--active-color" as string]: NHOM_ACCENT[nhom] } as React.CSSProperties)
                          : undefined
                      }
                    >
                      <Link href={`/kien-thuc-nen-tang/${item.slug}`}>
                        {item.ten}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* ══════════════════════════ MAIN ══════════════════════════ */}
          <main key={slug} className="main ktn-main-enter">
            {/* Breadcrumb */}
            <nav className="bc" aria-label="Breadcrumb">
              <Link href="/kien-thuc-nen-tang">Thư viện</Link>
              <span>›</span>
              <Link href="/kien-thuc-nen-tang">{article.nhom}</Link>
              <span>›</span>
              <span className="bc-cur">{article.ten}</span>
            </nav>

            {/* Hero */}
            <section
              className={`hero${article.hero_image ? " hero--image" : ""}`}
              style={{
                ["--hero-accent" as string]: accent,
                ...(article.hero_image
                  ? { ["--hero-bg" as string]: `url(${article.hero_image})` }
                  : {}),
              }}
            >
              <p className="hero-label">
                Thư viện · {article.nhom} · N° {num}
              </p>
              <h1 className="hero-title">
                {heroSplit.a ? (
                  <>
                    {heroSplit.a}
                    <br />
                    <em>{heroSplit.b}</em>
                  </>
                ) : (
                  <em>{heroSplit.b}</em>
                )}
              </h1>
              <p className="hero-sub">{article.mo_ta}</p>
              <div className="hero-meta">
                <span>Sine Art</span>
                <span>{article.doc_time} phút đọc</span>
                <span>{article.nhom}</span>
              </div>
              <span className="hero-kw" aria-hidden>
                {heroKw}
              </span>
            </section>

            {/* Body */}
            <article className="body">{children}</article>

            {/* Prev / Next — 2 card grid, giữ placeholder khi thiếu 1 đầu */}
            <nav className="ktn-prevnext" aria-label="Bài trước / sau">
              {prev ? (
                <Link
                  href={`/kien-thuc-nen-tang/${prev.slug}`}
                  className="ktn-pn-card ktn-prev"
                  style={{
                    ["--pn-accent" as string]: NHOM_ACCENT[prev.nhom],
                  }}
                >
                  <span className="ktn-pn-arrow" aria-hidden>←</span>
                  <span className="ktn-pn-body">
                    <span className="ktn-pn-dir">Bài trước</span>
                    <span className="ktn-pn-name">{prev.ten}</span>
                    <span className="ktn-pn-nhom">
                      <span className="ktn-pn-dot" aria-hidden />
                      {prev.nhom}
                    </span>
                  </span>
                </Link>
              ) : (
                <span className="ktn-pn-card is-empty" aria-hidden />
              )}
              {next ? (
                <Link
                  href={`/kien-thuc-nen-tang/${next.slug}`}
                  className="ktn-pn-card ktn-next"
                  style={{
                    ["--pn-accent" as string]: NHOM_ACCENT[next.nhom],
                  }}
                >
                  <span className="ktn-pn-body">
                    <span className="ktn-pn-dir">Bài tiếp</span>
                    <span className="ktn-pn-name">{next.ten}</span>
                    <span className="ktn-pn-nhom">
                      <span className="ktn-pn-dot" aria-hidden />
                      {next.nhom}
                    </span>
                  </span>
                  <span className="ktn-pn-arrow" aria-hidden>→</span>
                </Link>
              ) : (
                <span className="ktn-pn-card is-empty" aria-hidden />
              )}
            </nav>
          </main>

          {/* ══════════════════════════ RIGHT NAV ══════════════════════════ */}
          <aside className="rnav" aria-label="Mục lục + thông tin bài">
            {/* Card: TOC — auto-discover từ .div-sec nếu không truyền toc prop */}
            <TocCard items={toc.length ? toc : undefined} />

            {/* Card: Reading progress */}
            <div className="rnav-card">
              <h5>Tiến độ đọc</h5>
              <ReadingProgress docMin={article.doc_time} />
            </div>

            {/* Card: Tags */}
            {article.tags.length > 0 && (
              <div className="rnav-card">
                <h5>Tags</h5>
                <div className="rnav-tags">
                  {article.tags.map((t) => (
                    <span key={t} className="rnav-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Card: CTA (dark) */}
            <div className="rnav-card rnav-card--dark">
              <h5>Muốn học thực hành?</h5>
              <p className="rnav-cta-title">
                Học mỹ thuật <em>bài bản</em>
              </p>
              <p className="rnav-cta-desc">
                Giáo trình khoa học cho học sinh thi khối H, V và hoạ sĩ công
                nghệ — hoạt hình, phim, game.
              </p>
              <Link href="/khoa-hoc" className="rnav-cta-btn">
                Xem khoá học →
              </Link>
              <Link href="/hoc-thu" className="rnav-cta-btn rnav-cta-btn--out">
                🎨 Đăng ký học thử
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
