import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchBlogById,
  fetchRelatedBlogs,
  fetchAdjacentBlogs,
  idFromBlogSlug,
  buildBlogSlug,
  estimateReadMinutes,
  extractHeadings,
  injectHeadingIds,
  formatDateVi,
  sourceDomain,
} from "@/lib/data/blog";
import { sanitizeAdminRichHtml } from "@/lib/admin/sanitize-admin-html";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { BlogToc } from "./BlogToc";
import { BlogDetailStyles } from "./BlogDetailStyles";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromBlogSlug(slug);
  if (!id) return {};
  const post = await fetchBlogById(id);
  if (!post) return {};
  return {
    title: post.title ? `${post.title} — Sine Art` : "Sine Art Blog",
    description: post.opening
      ? post.opening.replace(/<[^>]+>/g, " ").slice(0, 160)
      : post.content?.replace(/<[^>]+>/g, " ").slice(0, 160) ?? "",
    openGraph: {
      title: post.title ?? "Sine Art Blog",
      images: post.thumbnail ? [{ url: post.thumbnail }] : [],
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
const grad = (id: number) => THUMB_GRADS[id % 5]!;

function initials(nguon: string | null | undefined) {
  const name = sourceDomain(nguon);
  return name.replace(/\..+/, "").slice(0, 2).toUpperCase();
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromBlogSlug(slug);
  if (!id) notFound();

  const [post, related, adjacent] = await Promise.all([
    fetchBlogById(id),
    fetchRelatedBlogs(id, 3),
    fetchAdjacentBlogs(id, new Date().toISOString()),
  ]);

  if (!post) notFound();

  const { prev, next } = adjacent;
  const readMin = estimateReadMinutes(post.opening, post.content, post.ending);
  const dateStr = formatDateVi(post.created_at);
  const domain = sourceDomain(post.nguon);

  const safeContent = post.content ? sanitizeAdminRichHtml(post.content) : "";
  const safeOpening = post.opening ? sanitizeAdminRichHtml(post.opening) : "";
  const safeEnding = post.ending ? sanitizeAdminRichHtml(post.ending) : "";

  const contentWithIds = injectHeadingIds(safeContent);
  const headings = extractHeadings(safeContent);

  const thumbSrc = post.thumbnail
    ? cfImageForThumbnail(post.thumbnail) ?? post.thumbnail
    : null;

  return (
    <div className="bd">
      <BlogDetailStyles />

      {/* NAV */}
      <nav className="bd-nav">
        <div className="bd-nav-inner">
          <Link className="bd-logo" href="/">
            <span>Sine</span>
            <span className="bd-logo-art">Art</span>
          </Link>
          <div className="bd-nav-links">
            <Link href="/">Trang chủ</Link>
            <Link href="/khoa-hoc">Khoá học</Link>
            <Link href="/blog" className="on">Tin tức</Link>
          </div>
          <Link className="bd-btn-cta" href="/dang-ky">
            <span className="bd-btn-play">▶</span>Vào học
          </Link>
        </div>
      </nav>

      {/* SHELL */}
      <div className="bd-shell">
        <div className="bd-body">

          {/* ─── MAIN ─── */}
          <main className="bd-main">

            {/* Breadcrumb */}
            <nav className="bd-crumb" aria-label="Breadcrumb">
              <Link href="/blog" className="bd-crumb-back">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><polyline points="15 18 9 12 15 6"/></svg>
                Blogs
              </Link>
              <span className="bd-crumb-sep">/</span>
              <span style={{ fontWeight: 700, color: "rgba(45,32,32,.78)" }}>{domain}</span>
              <span className="bd-crumb-meta">{dateStr}{readMin > 0 ? ` · ${readMin} phút đọc` : ""}</span>
            </nav>

            {/* Title */}
            <h1 className="bd-h1">{post.title ?? "Bài viết"}</h1>

            {/* Lead */}
            {safeOpening ? (
              <div
                className="bd-lead"
                dangerouslySetInnerHTML={{ __html: safeOpening }}
              />
            ) : null}

            {/* Author */}
            <div className="bd-author">
              <div className="bd-author-av">{initials(post.nguon)}</div>
              <div className="bd-author-info">
                <div className="bd-author-name">
                  {post.nguon ? (
                    <a
                      href={post.nguon}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bd-author-link"
                    >
                      {domain}
                    </a>
                  ) : "Sine Art"}
                </div>
                <div className="bd-author-role">Nguồn · {dateStr}</div>
              </div>
              <div className="bd-author-actions">
                <button
                  className="bd-icon-btn"
                  aria-label="Sao chép liên kết"
                  onClick={undefined}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Hero thumbnail */}
            <div
              className="bd-cover"
              role="img"
              aria-label={post.image_alt ?? post.title ?? ""}
              style={
                thumbSrc
                  ? { backgroundImage: `url(${thumbSrc})` }
                  : { background: grad(post.id) }
              }
            />

            {/* Content */}
            {safeContent && (
              <div
                className="bd-prose"
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />
            )}

            {/* Ending */}
            {safeEnding && (
              <div
                className="bd-prose bd-prose--end"
                dangerouslySetInnerHTML={{ __html: safeEnding }}
              />
            )}

            {/* CTA inline */}
            <div className="bd-cta-inline">
              <div className="bd-cta-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(45,32,32,.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div className="bd-cta-body">
                <div className="bd-cta-eyebrow">Khoá học Sine Art</div>
                <div className="bd-cta-title">Học mỹ thuật bài bản</div>
                <div className="bd-cta-meta">Giáo trình khoa học · Đồng hành 350+ học viên</div>
                <Link href="/khoa-hoc" className="bd-btn-inline">Xem khoá học →</Link>
              </div>
            </div>

            {/* Share */}
            <div className="bd-share">
              <span className="bd-share-label">Chia sẻ</span>
              <div className="bd-share-btns">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://sineart.vn/blog/${buildBlogSlug(post.id, post.title)}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="bd-icon-btn" aria-label="Chia sẻ Facebook"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?url=${encodeURIComponent(`https://sineart.vn/blog/${buildBlogSlug(post.id, post.title)}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="bd-icon-btn" aria-label="Chia sẻ LinkedIn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19 3h-14c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2zm-11 16h-2.5v-8h2.5v8zm-1.25-9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm9.75 9h-2.5v-4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4h-2.5v-8h2.5v1c.5-.69 1.35-1 2-1 1.66 0 3 1.34 3 3v5z"/></svg>
                </a>
                <a
                  href={`https://sineart.vn/blog/${buildBlogSlug(post.id, post.title)}`}
                  className="bd-icon-btn" aria-label="Sao chép link"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Prev / Next */}
            <div className="bd-navpn">
              {prev ? (
                <Link
                  href={`/blog/${buildBlogSlug(prev.id, prev.title)}`}
                  className="bd-navpn-item"
                >
                  <span className="bd-navpn-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><polyline points="15 18 9 12 15 6"/></svg>
                  </span>
                  <div>
                    <div className="bd-navpn-label">Bài trước</div>
                    <div className="bd-navpn-title">{prev.title}</div>
                  </div>
                </Link>
              ) : <div />}

              {next ? (
                <Link
                  href={`/blog/${buildBlogSlug(next.id, next.title)}`}
                  className="bd-navpn-item bd-navpn-item--next"
                >
                  <div>
                    <div className="bd-navpn-label">Bài kế</div>
                    <div className="bd-navpn-title">{next.title}</div>
                  </div>
                  <span className="bd-navpn-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </Link>
              ) : <div />}
            </div>

          </main>

          {/* ─── SIDEBAR ─── */}
          <aside className="bd-sidebar">

            {/* CTA */}
            <div className="bd-sb-cta">
              <div className="bd-sb-cta-logo">SA</div>
              <div className="bd-sb-cta-title">Học mỹ thuật bài bản</div>
              <p className="bd-sb-cta-desc">Giáo trình khoa học, đồng hành cùng 350+ học viên trên hành trình Họa sỹ công nghệ.</p>
              <Link href="/khoa-hoc" className="bd-btn-primary">▶ Xem khoá học</Link>
            </div>

            {/* TOC */}
            {headings.length > 0 && (
              <div className="bd-sb-section">
                <div className="bd-sb-label">Mục lục bài</div>
                <BlogToc headings={headings} />
              </div>
            )}

            {/* Related */}
            {related.length > 0 && (
              <div className="bd-sb-section">
                <div className="bd-sb-label">Bài cùng chủ đề</div>
                <div className="bd-related-list">
                  {related.map((r) => {
                    const rThumb = r.thumbnail
                      ? cfImageForThumbnail(r.thumbnail) ?? r.thumbnail
                      : null;
                    return (
                      <Link
                        key={r.id}
                        href={`/blog/${buildBlogSlug(r.id, r.title)}`}
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
                          <div className="bd-related-title">{r.title}</div>
                          <div className="bd-related-meta">
                            {sourceDomain(r.nguon)} · {formatDateVi(r.created_at)}
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

      {/* Fixed CTA */}
      <Link className="bd-cta-fixed" href="/dang-ky">
        <span className="bd-cta-fixed-play">▶</span>Vào học
      </Link>
    </div>
  );
}
