import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import NavBar from "../../_components/NavBar";
import { BlogDetailStyles } from "../../blogs/[slug]/BlogDetailStyles";
import { BlogToc } from "../../blogs/[slug]/BlogToc";
import { TraCuuDetailStyles } from "./TraCuuDetailStyles";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { sanitizeAdminRichHtml } from "@/lib/admin/sanitize-admin-html";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import {
  buildTraCuuHref,
  estimateReadMinutes,
  extractHeadings,
  fetchAdjacentTraCuu,
  fetchRelatedTraCuu,
  fetchTraCuuBySlug,
  fetchTruongLookup,
  formatDateVi,
  injectHeadingIds,
  traCuuTypeLabel,
} from "@/lib/data/tra-cuu";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchTraCuuBySlug(slug);
  if (!post) return {};
  const plain = post.excerpt
    ? post.excerpt.replace(/<[^>]+>/g, " ").slice(0, 160)
    : post.body_html?.replace(/<[^>]+>/g, " ").slice(0, 160) ?? "";
  return {
    title: post.title ? `${post.title} — Sine Art` : "Tra cứu thông tin — Sine Art",
    description: plain,
    alternates: { canonical: `https://sineart.vn/tra-cuu-thong-tin/${slug}` },
    openGraph: {
      title: post.title ?? "Tra cứu thông tin — Sine Art",
      description: plain,
      images: post.thumbnail_url ? [{ url: post.thumbnail_url }] : [],
    },
  };
}

const THUMB_GRADS = [
  "linear-gradient(135deg,#fde859,#f8a668)",
  "linear-gradient(135deg,#f8a668,#ee5b9f)",
  "linear-gradient(135deg,#bb89f8,#ee5b9f)",
  "linear-gradient(135deg,#6efec0,#3bd99e)",
  "linear-gradient(135deg,#fde859,#bb89f8)",
];
const grad = (id: number) => THUMB_GRADS[id % THUMB_GRADS.length]!;

export default async function TraCuuDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchTraCuuBySlug(slug);
  if (!post) notFound();

  const [truongLookup, related, adjacent, { courses }] = await Promise.all([
    fetchTruongLookup(),
    fetchRelatedTraCuu(post.id, post.truong_ids, 4),
    fetchAdjacentTraCuu(post.id, post.published_at),
    getKhoaHocPageData(),
  ]);

  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  const truongNameById = new Map(truongLookup.map((t) => [t.id, t.ten]));
  const truongNames = post.truong_ids
    .map((id) => truongNameById.get(id))
    .filter((s): s is string => !!s);

  const { prev, next } = adjacent;
  const safeContent = post.body_html
    ? sanitizeAdminRichHtml(stripHtmlCodeFence(post.body_html))
    : "";
  const safeExcerpt = post.excerpt ? sanitizeAdminRichHtml(post.excerpt) : "";
  const contentWithIds = injectHeadingIds(safeContent);
  const headings = extractHeadings(safeContent);
  const readMin = estimateReadMinutes(post.body_html ?? post.excerpt ?? "");
  const dateStr = formatDateVi(post.published_at);

  const thumbSrc = post.thumbnail_url
    ? cfImageForThumbnail(post.thumbnail_url) ?? post.thumbnail_url
    : null;

  // Author display: ưu tiên trường đầu tiên, fallback "Sine Art"
  const authorLabel = truongNames[0] ?? "Sine Art";
  const authorInitials = authorLabel
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "SA";

  return (
    <div className="sa-root bd">
      <BlogDetailStyles />
      <TraCuuDetailStyles />
      <NavBar khoaHocGroups={khoaHocGroups} />

      <div className="bd-shell">
        <div className="bd-body">
          <main className="bd-main">
            {/* Breadcrumb */}
            <nav className="bd-crumb" aria-label="Breadcrumb">
              <Link href="/tra-cuu-thong-tin" className="bd-crumb-back">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Tra cứu thông tin
              </Link>
              <span className="bd-crumb-sep">/</span>
              <span style={{ fontWeight: 700, color: "rgba(45,32,32,.78)" }}>
                {truongNames[0] ?? "Bài tra cứu"}
              </span>
              <span className="bd-crumb-meta">
                {dateStr}
                {readMin > 0 ? ` · ${readMin} phút đọc` : ""}
              </span>
            </nav>

            {/* Title */}
            <h1 className="bd-h1">{post.title ?? "Bài tra cứu"}</h1>

            {/* Meta row */}
            <div className="bd-tc-meta">
              {post.nam != null && (
                <>
                  <span>
                    <strong style={{ color: "#2d2020" }}>Năm:</strong> {post.nam}
                  </span>
                  <span className="sep">·</span>
                </>
              )}
              <span>
                <strong style={{ color: "#2d2020" }}>Xuất bản:</strong> {dateStr}
              </span>
            </div>

            {/* Badges trường + loại */}
            {(truongNames.length > 0 || post.type.length > 0 || post.nam != null) && (
              <div className="bd-tc-badges">
                {truongNames.map((ten) => (
                  <span key={`tr-${ten}`} className="bd-tc-badge bd-tc-badge--truong">
                    <span className="bd-tc-badge-dot" aria-hidden />
                    {ten}
                  </span>
                ))}
                {post.type.map((t) => (
                  <span key={`ty-${t}`} className="bd-tc-badge bd-tc-badge--type">
                    {traCuuTypeLabel(t)}
                  </span>
                ))}
                {post.nam != null && (
                  <span className="bd-tc-badge bd-tc-badge--year">Năm {post.nam}</span>
                )}
              </div>
            )}

            {/* Excerpt */}
            {safeExcerpt ? (
              <div
                className="bd-lead"
                dangerouslySetInnerHTML={{ __html: safeExcerpt }}
              />
            ) : null}

            {/* Author (trường / Sine Art) */}
            <div className="bd-author">
              <div className="bd-author-av">{authorInitials}</div>
              <div className="bd-author-info">
                <div className="bd-author-name">{authorLabel}</div>
                <div className="bd-author-role">Nguồn · {dateStr}</div>
              </div>
            </div>

            {/* Hero thumbnail */}
            {(thumbSrc || true) && (
              <div
                className="bd-cover"
                role="img"
                aria-label={post.thumbnail_alt ?? post.title ?? ""}
                style={
                  thumbSrc
                    ? { backgroundImage: `url(${thumbSrc})` }
                    : { background: grad(post.id) }
                }
              />
            )}

            {/* Banner 1 — Trang Trí Màu */}
            <a
              href="https://sineart.vercel.app/khoa-hoc/trang-tri-mau"
              target="_blank"
              rel="noopener noreferrer"
              className="bd-banner-link"
              aria-label="Khoá học Trang Trí Màu tại Sine Art"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/banner-trang-tri-mau.png"
                alt="Khoá học Trang Trí Màu tại Sine Art"
                className="bd-banner-img"
              />
            </a>

            {/* Content */}
            {safeContent && (
              <div
                className="bd-tc-body"
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />
            )}

            {/* Banner 2 — Hình Hoạ */}
            <a
              href="https://sineart.vercel.app/khoa-hoc/hinh-hoa"
              target="_blank"
              rel="noopener noreferrer"
              className="bd-banner-link bd-banner-link--yellow"
              aria-label="Khoá học Hình Hoạ tại Sine Art"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/banner-hinh-hoa.png"
                alt="Khoá học Hình Hoạ tại Sine Art"
                className="bd-banner-img"
              />
            </a>

            {/* CTA inline */}
            <div className="bd-cta-inline">
              <div className="bd-cta-icon">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(45,32,32,.55)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div className="bd-cta-body">
                <div className="bd-cta-eyebrow">Khoá học Sine Art</div>
                <div className="bd-cta-title">Học mỹ thuật bài bản</div>
                <div className="bd-cta-meta">Giáo trình khoa học · Đồng hành 350+ học viên</div>
                <Link href="/khoa-hoc" className="bd-btn-inline">
                  Xem khoá học →
                </Link>
              </div>
            </div>

            {/* Share */}
            <div className="bd-share">
              <span className="bd-share-label">Chia sẻ</span>
              <div className="bd-share-btns">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    `https://sineart.vn/tra-cuu-thong-tin/${slug}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bd-icon-btn"
                  aria-label="Chia sẻ Facebook"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?url=${encodeURIComponent(
                    `https://sineart.vn/tra-cuu-thong-tin/${slug}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bd-icon-btn"
                  aria-label="Chia sẻ LinkedIn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M19 3h-14c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2zm-11 16h-2.5v-8h2.5v8zm-1.25-9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm9.75 9h-2.5v-4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4h-2.5v-8h2.5v1c.5-.69 1.35-1 2-1 1.66 0 3 1.34 3 3v5z" />
                  </svg>
                </a>
                <a
                  href={`https://sineart.vn/tra-cuu-thong-tin/${slug}`}
                  className="bd-icon-btn"
                  aria-label="Sao chép link"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Prev / Next */}
            <div className="bd-navpn">
              {prev ? (
                <Link
                  href={buildTraCuuHref(prev.slug)}
                  className="bd-navpn-item"
                >
                  <span className="bd-navpn-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </span>
                  <div>
                    <div className="bd-navpn-label">Bài trước</div>
                    <div className="bd-navpn-title">{prev.title ?? "Bài tra cứu"}</div>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link
                  href={buildTraCuuHref(next.slug)}
                  className="bd-navpn-item bd-navpn-item--next"
                >
                  <div>
                    <div className="bd-navpn-label">Bài kế</div>
                    <div className="bd-navpn-title">{next.title ?? "Bài tra cứu"}</div>
                  </div>
                  <span className="bd-navpn-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </main>

          {/* ─── SIDEBAR ─── */}
          <aside className="bd-sidebar">
            <div className="bd-sb-cta">
              <div className="bd-sb-cta-logo">SA</div>
              <div className="bd-sb-cta-title">
                Học mỹ thuật <em>bài bản</em> tại Sine Art
              </div>
              <p className="bd-sb-cta-desc">
                Giáo trình khoa học, đồng hành cùng 350+ học viên trên hành trình Họa sỹ công nghệ.
              </p>
              <Link href="/khoa-hoc" className="bd-btn-primary">
                ▶ Xem khoá học
              </Link>
              <Link href="/dang-ky" className="bd-sb-cta-secondary">
                🎨 Đăng ký học thử miễn phí →
              </Link>
            </div>

            {/* TOC */}
            {headings.length > 0 && (
              <div className="bd-sb-section">
                <div className="bd-sb-label">Mục lục bài</div>
                <BlogToc headings={headings} />
              </div>
            )}

            {/* Related (ưu tiên cùng trường) */}
            {related.length > 0 && (
              <div className="bd-sb-section">
                <div className="bd-sb-label">
                  {post.truong_ids.length > 0 ? "Cùng trường" : "Cùng chủ đề"}
                </div>
                <div className="bd-related-list">
                  {related.map((r) => {
                    const rThumb = r.thumbnail_url
                      ? cfImageForThumbnail(r.thumbnail_url) ?? r.thumbnail_url
                      : null;
                    const rTruong = r.truong_ids
                      .map((id) => truongNameById.get(id))
                      .filter((s): s is string => !!s);
                    return (
                      <Link
                        key={r.id}
                        href={buildTraCuuHref(r.slug)}
                        className="bd-related-item"
                      >
                        <div
                          className="bd-related-thumb"
                          style={
                            rThumb
                              ? { backgroundImage: `url(${rThumb})` }
                              : { background: grad(r.id) }
                          }
                        />
                        <div>
                          <div className="bd-related-title">{r.title ?? "Bài tra cứu"}</div>
                          <div className="bd-related-meta">
                            {rTruong[0] ?? "Sine Art"} · {formatDateVi(r.published_at)}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Strip markdown code fence bọc ngoài (phòng trường hợp DB cũ còn \`\`\`html…\`\`\`). */
function stripHtmlCodeFence(input: string): string {
  const t = input.trim();
  const m = t.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?```$/i);
  return (m ? m[1]! : t).trim();
}
