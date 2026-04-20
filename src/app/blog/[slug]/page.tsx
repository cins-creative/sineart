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
} from "@/lib/data/blog";
import { sanitizeAdminRichHtml } from "@/lib/admin/sanitize-admin-html";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { BlogToc } from "./BlogToc";

// ISR — tái build tối đa 1 tiếng, vẫn serve stale ngay
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromBlogSlug(slug);
  if (!id) return {};

  const post = await fetchBlogById(id);
  if (!post) return {};

  return {
    title: post.title ? `${post.title} — Sine Art Blog` : "Sine Art Blog",
    description: post.opening
      ? post.opening.replace(/<[^>]+>/g, " ").slice(0, 160)
      : "Kiến thức mỹ thuật bài bản từ Sine Art.",
    openGraph: {
      title: post.title ?? "Sine Art Blog",
      description: post.opening?.replace(/<[^>]+>/g, " ").slice(0, 160),
      images: post.thumbnail ? [{ url: post.thumbnail }] : [],
    },
  };
}

const THUMB_GRADS: Record<number, string> = {
  0: "linear-gradient(135deg,#fde859,#f8a668)",
  1: "linear-gradient(135deg,#f8a668,#ee5b9f)",
  2: "linear-gradient(135deg,#bb89f8,#ee5b9f)",
  3: "linear-gradient(135deg,#6efec0,#3bd99e)",
  4: "linear-gradient(135deg,#fde859,#bb89f8)",
};
function thumbGrad(id: number) {
  return THUMB_GRADS[id % 5]!;
}

function initials(name: string | null) {
  if (!name) return "SA";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)).toUpperCase();
}

// ─── SVG icons ───────────────────────────────────────────────────────────────

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);
const PencilIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(45,32,32,0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogSlugPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromBlogSlug(slug);
  if (!id) notFound();

  const [post, related, adjacent] = await Promise.all([
    fetchBlogById(id),
    fetchRelatedBlogs(id, 3),
    (async () => null)(), // lazy — will fetch after checking post exists
  ]);

  if (!post) notFound();

  // Redirect nếu slug không đúng (canonical)
  const canonical = buildBlogSlug(post.id, post.title);

  const { prev, next } = await fetchAdjacentBlogs(post.id, post.created_at);

  const readMin = estimateReadMinutes(post.opening, post.content, post.ending);
  const dateStr = formatDateVi(post.created_at);

  const safeContent = post.content ? sanitizeAdminRichHtml(post.content) : "";
  const safeOpening = post.opening ? sanitizeAdminRichHtml(post.opening) : "";
  const safeEnding = post.ending ? sanitizeAdminRichHtml(post.ending) : "";

  const contentWithIds = injectHeadingIds(safeContent);
  const headings = extractHeadings(safeContent);

  const thumbSrc = post.thumbnail
    ? cfImageForThumbnail(post.thumbnail) ?? post.thumbnail
    : null;

  return (
    <div className="blog-detail-root">
      {/* ─── NAV reuse từ blog list ─── */}
      <nav className="blog-nav">
        <div className="blog-shell-wide blog-nav-inner">
          <Link className="blog-logo" href="/">
            <span className="blog-logo-sine">Sine</span>
            <span className="blog-logo-art">Art</span>
          </Link>
          <div className="blog-nav-links">
            <Link href="/">Trang chủ</Link>
            <Link href="/khoa-hoc">Khoá học</Link>
            <Link href="/blog" className="blog-nav-active">Tin tức</Link>
          </div>
          <Link className="blog-btn-cta" href="/dang-ky">
            <span className="blog-btn-play">▶</span>Vào học
          </Link>
        </div>
      </nav>

      {/* ─── DETAIL BODY ─── */}
      <div className="blog-shell blog-detail-body">

        {/* ─── MAIN ─── */}
        <main className="blog-detail-main">

          {/* Breadcrumb */}
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link href="/blog" className="blog-bc-back"><ChevronLeft /> Blogs</Link>
            <span className="blog-bc-sep">/</span>
            <span className="blog-bc-meta">{dateStr} · {readMin} phút đọc</span>
          </nav>

          {/* Title */}
          <h1 className="blog-detail-h1">{post.title ?? "Bài viết"}</h1>

          {/* Opening (lead) */}
          {safeOpening && (
            <div
              className="blog-detail-lead"
              dangerouslySetInnerHTML={{ __html: safeOpening }}
            />
          )}

          {/* Author card */}
          {post.nguon && (
            <div className="blog-author-card">
              <div className="blog-author-av">{initials(post.nguon)}</div>
              <div className="blog-author-info">
                <div className="blog-author-name">{post.nguon}</div>
                <div className="blog-author-role">Sine Art · {dateStr}</div>
              </div>
            </div>
          )}

          {/* Hero thumbnail */}
          <div
            className="blog-hero-cover"
            style={
              thumbSrc
                ? { backgroundImage: `url(${thumbSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: thumbGrad(post.id) }
            }
            role="img"
            aria-label={post.image_alt ?? post.title ?? ""}
          >
            {!thumbSrc && <PencilIcon />}
          </div>

          {/* Content */}
          {contentWithIds && (
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />
          )}

          {/* Ending */}
          {safeEnding && (
            <div
              className="blog-prose blog-prose--ending"
              dangerouslySetInnerHTML={{ __html: safeEnding }}
            />
          )}

          {/* Share row */}
          <div className="blog-share-row">
            <span className="blog-share-label">Chia sẻ</span>
            <div className="blog-share-icons">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://sineart.vn/blog/${canonical}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="blog-icon-btn"
                aria-label="Chia sẻ Facebook"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
              </a>
              <button
                className="blog-icon-btn"
                aria-label="Sao chép đường dẫn"
                onClick={undefined}
              >
                <ShareIcon />
              </button>
            </div>
          </div>

          {/* Prev / Next */}
          {(prev || next) && (
            <nav className="blog-nav-prev-next" aria-label="Điều hướng bài viết">
              {prev ? (
                <Link href={`/blog/${buildBlogSlug(prev.id, prev.title)}`} className="blog-nav-item">
                  <ChevronLeft />
                  <div>
                    <div className="blog-nav-eyebrow">BÀI TRƯỚC</div>
                    <div className="blog-nav-title">{prev.title}</div>
                  </div>
                </Link>
              ) : <div />}
              {next ? (
                <Link href={`/blog/${buildBlogSlug(next.id, next.title)}`} className="blog-nav-item blog-nav-item--next">
                  <div>
                    <div className="blog-nav-eyebrow">BÀI KẾ</div>
                    <div className="blog-nav-title">{next.title}</div>
                  </div>
                  <ChevronRight />
                </Link>
              ) : <div />}
            </nav>
          )}

          {/* Related (mobile) */}
          {related.length > 0 && (
            <section className="blog-related-mobile" aria-label="Bài cùng chủ đề">
              <div className="blog-sb-section-label">Bài viết liên quan</div>
              <div className="blog-related-grid">
                {related.map((r) => {
                  const rThumb = r.thumbnail
                    ? cfImageForThumbnail(r.thumbnail) ?? r.thumbnail
                    : null;
                  return (
                    <Link
                      key={r.id}
                      href={`/blog/${buildBlogSlug(r.id, r.title)}`}
                      className="blog-related-card"
                    >
                      <div
                        className="blog-related-thumb"
                        style={
                          rThumb
                            ? { backgroundImage: `url(${rThumb})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: thumbGrad(r.id) }
                        }
                      />
                      <div className="blog-related-body">
                        <div className="blog-related-title">{r.title}</div>
                        <div className="blog-related-meta">{formatDateVi(r.created_at)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </main>

        {/* ─── SIDEBAR ─── */}
        <aside className="blog-detail-sidebar">

          {/* CTA */}
          <div className="blog-sb-cta">
            <div className="blog-sb-cta-logo">SA</div>
            <div className="blog-sb-cta-title">
              Học mỹ thuật <em>bài bản</em>
            </div>
            <p className="blog-sb-cta-desc">
              Giáo trình khoa học cho Họa sỹ công nghệ. Đồng hành cùng 350+ học viên.
            </p>
            <Link href="/khoa-hoc" className="blog-btn-primary">Xem khoá học</Link>
            <Link href="/dang-ky" className="blog-sb-cta-secondary">🎨 Học thử miễn phí →</Link>
          </div>

          {/* TOC — client component */}
          {headings.length > 0 && <BlogToc headings={headings} />}

          {/* Related */}
          {related.length > 0 && (
            <div>
              <div className="blog-sb-section-label">Bài cùng chủ đề</div>
              <div className="blog-sb-related-list">
                {related.map((r) => {
                  const rThumb = r.thumbnail
                    ? cfImageForThumbnail(r.thumbnail) ?? r.thumbnail
                    : null;
                  return (
                    <Link
                      key={r.id}
                      href={`/blog/${buildBlogSlug(r.id, r.title)}`}
                      className="blog-sb-related-item"
                    >
                      <div
                        className="blog-sb-related-thumb"
                        style={
                          rThumb
                            ? { backgroundImage: `url(${rThumb})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: thumbGrad(r.id) }
                        }
                      />
                      <div>
                        <div className="blog-sb-related-title">{r.title}</div>
                        <div className="blog-sb-related-meta">{formatDateVi(r.created_at)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Floating CTA */}
      <Link className="blog-nav-cta-fixed" href="/dang-ky">
        <span className="blog-btn-play">▶</span>Vào học
      </Link>

      {/* ─── STYLES ─── */}
      <style>{`
        .blog-detail-root{--bg:#fff;--ink:#2d2020;--ink-2:rgba(45,32,32,.78);--ink-muted:rgba(45,32,32,.56);--ink-divider:rgba(45,32,32,.10);--ink-border:rgba(45,32,32,.07);--ink-border-strong:rgba(45,32,32,.12);--ink-tint:rgba(45,32,32,.045);--peach:#f8a668;--magenta:#ee5b9f;--grad:linear-gradient(135deg,#f8a668,#ee5b9f);--grad-cta:linear-gradient(145deg,#fbc08a 0%,#f8a668 22%,#ee5b9f 78%,#d9468a 100%);--shadow:0 4px 18px rgba(45,32,32,.06);--shadow-cta:0 4px 14px rgba(238,91,159,.35);--font-display:"Be Vietnam Pro",system-ui,sans-serif;--font-body:"Quicksand",system-ui,sans-serif;background:#f8f6f2;color:var(--ink);font-family:var(--font-body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
        .blog-detail-root *{box-sizing:border-box}
        .blog-detail-root a{text-decoration:none;color:inherit}

        /* NAV */
        .blog-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--ink-border)}
        .blog-shell-wide{max-width:1340px;margin:0 auto;padding:0 28px}
        .blog-nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px;gap:16px}
        .blog-logo{display:inline-flex;gap:.12em;font-family:var(--font-display);font-weight:800;font-size:22px;letter-spacing:-.03em}
        .blog-logo-art{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
        .blog-nav-links{display:flex;gap:2px}
        .blog-nav-links a{padding:9px 14px;border-radius:999px;font-size:14px;font-weight:700;color:var(--ink-2);transition:background .15s}
        .blog-nav-links a:hover{background:var(--ink-tint)}
        .blog-nav-active{color:var(--ink)!important}
        .blog-btn-cta{display:inline-flex;gap:8px;align-items:center;padding:10px 18px 10px 12px;border-radius:999px;background:var(--grad-cta);color:#fff;font-size:14px;font-weight:800;white-space:nowrap}
        .blog-btn-play{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center}

        /* LAYOUT */
        .blog-shell{max-width:1160px;margin:0 auto;padding:0 28px}
        .blog-detail-body{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:36px;align-items:start;padding-top:40px;padding-bottom:72px}
        .blog-detail-body>*{min-width:0}

        /* MAIN */
        .blog-detail-main{background:#fff;border-radius:20px;border:1.5px solid var(--ink-border);box-shadow:var(--shadow);padding:36px 40px;min-width:0}

        /* BREADCRUMB */
        .blog-breadcrumb{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-muted);margin-bottom:24px;flex-wrap:wrap}
        .blog-bc-back{display:inline-flex;align-items:center;gap:4px;font-weight:700;color:var(--ink-2);transition:color .15s}
        .blog-bc-back:hover{color:var(--magenta)}
        .blog-bc-sep{color:var(--ink-border-strong)}
        .blog-bc-meta{margin-left:auto;font-weight:500}

        /* TITLE */
        .blog-detail-h1{font-family:var(--font-display);font-size:clamp(28px,3.5vw,42px);font-weight:800;letter-spacing:-.025em;line-height:1.1;margin:0 0 18px}

        /* LEAD (opening) */
        .blog-detail-lead{font-family:var(--font-display);font-size:17px;font-weight:500;color:var(--ink-2);line-height:1.6;margin-bottom:24px}
        .blog-detail-lead p{margin:.5em 0}

        /* AUTHOR */
        .blog-author-card{display:flex;align-items:center;gap:14px;background:rgba(187,137,248,.07);border-radius:14px;padding:14px 16px;margin-bottom:28px}
        .blog-author-av{width:44px;height:44px;border-radius:50%;background:var(--grad);color:#fff;font-family:var(--font-display);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .blog-author-name{font-size:14px;font-weight:700;margin-bottom:2px}
        .blog-author-role{font-size:12px;color:var(--ink-muted)}

        /* HERO COVER */
        .blog-hero-cover{aspect-ratio:16/9;border-radius:16px;margin-bottom:32px;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;overflow:hidden}

        /* PROSE — content / ending */
        .blog-prose{font-size:16px;font-weight:500;color:var(--ink-2);line-height:1.75}
        .blog-prose p{margin:0 0 18px}
        .blog-prose p:last-child{margin-bottom:0}
        .blog-prose strong,.blog-prose b{color:var(--ink);font-weight:700}
        .blog-prose em,.blog-prose i{font-style:italic}
        .blog-prose u{text-decoration:underline;text-underline-offset:3px}
        .blog-prose s{text-decoration:line-through}
        .blog-prose a{color:var(--ink);background:linear-gradient(transparent 62%,rgba(238,91,159,.18) 62%);font-weight:600}
        .blog-prose a:hover{background:linear-gradient(transparent 62%,rgba(238,91,159,.38) 62%)}
        .blog-prose h1{font-family:var(--font-display);font-size:clamp(22px,2.6vw,32px);font-weight:800;letter-spacing:-.02em;line-height:1.15;margin:1.8em 0 .4em}
        .blog-prose h2{font-family:var(--font-display);font-size:clamp(18px,2.1vw,26px);font-weight:800;letter-spacing:-.02em;line-height:1.2;margin:1.6em 0 .35em}
        .blog-prose h2::after{content:"";display:block;width:40px;height:3px;background:#fde859;border-radius:2px;margin-top:8px}
        .blog-prose h3{font-family:var(--font-display);font-size:clamp(15px,1.8vw,20px);font-weight:800;letter-spacing:-.015em;line-height:1.3;margin:1.4em 0 .3em}
        .blog-prose ul{list-style:disc;padding-left:22px;margin:.5em 0 1em}
        .blog-prose ol{list-style:decimal;padding-left:22px;margin:.5em 0 1em}
        .blog-prose li{margin:.25em 0;line-height:1.65}
        .blog-prose blockquote{border-left:3px solid var(--magenta);padding:14px 20px;background:rgba(187,137,248,.06);border-radius:0 12px 12px 0;margin:1.2em 0;font-family:var(--font-display);font-size:17px;font-style:italic;font-weight:500;line-height:1.5}
        .blog-prose code{background:#f0eee7;border-radius:5px;padding:2px 6px;font-size:13px;font-family:ui-monospace,monospace;color:#d4537e}
        .blog-prose pre{background:#1e1e1e;color:#d4d4d4;border-radius:12px;padding:16px;overflow-x:auto;font-size:13px;margin:1em 0}
        .blog-prose pre code{background:none;padding:0;color:inherit}
        .blog-prose hr{border:none;border-top:1px solid var(--ink-border);margin:2em 0}
        .blog-prose img{display:block;max-width:100%;height:auto;border-radius:12px;margin:1em auto}
        .blog-prose iframe{width:100%;min-height:360px;border:0;border-radius:12px;display:block;margin:1em 0}
        .blog-prose table{width:100%;border-collapse:collapse;margin:1em 0;font-size:14px}
        .blog-prose th{border:1px solid #e0e0e0;padding:10px 12px;background:#f5f5f5;font-weight:700;text-align:left;vertical-align:top}
        .blog-prose td{border:1px solid #e0e0e0;padding:10px 12px;vertical-align:top}
        .blog-prose--ending{margin-top:28px;padding-top:28px;border-top:1px solid var(--ink-border)}

        /* SHARE */
        .blog-share-row{display:flex;align-items:center;gap:14px;padding:18px 0;border-top:1px solid var(--ink-border);border-bottom:1px solid var(--ink-border);margin:32px 0 28px}
        .blog-share-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted)}
        .blog-share-icons{display:flex;gap:10px}
        .blog-icon-btn{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--ink-border-strong);display:flex;align-items:center;justify-content:center;color:var(--ink-2);background:transparent;cursor:pointer;transition:border-color .15s}
        .blog-icon-btn:hover{border-color:var(--ink-2)}

        /* PREV / NEXT */
        .blog-nav-prev-next{display:flex;gap:14px;margin-bottom:8px}
        .blog-nav-item{flex:1;padding:16px 18px;border:1.5px solid var(--ink-border);border-radius:14px;display:flex;gap:12px;align-items:center;transition:border-color .2s;color:var(--ink)}
        .blog-nav-item:hover{border-color:var(--ink-border-strong);background:var(--ink-tint)}
        .blog-nav-item--next{justify-content:flex-end;text-align:right}
        .blog-nav-eyebrow{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}
        .blog-nav-title{font-family:var(--font-display);font-size:13px;font-weight:800;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

        /* RELATED (mobile) */
        .blog-related-mobile{display:none;margin-top:32px}
        .blog-related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
        .blog-related-card{display:flex;flex-direction:column;border:1.5px solid var(--ink-border);border-radius:14px;overflow:hidden;transition:border-color .2s}
        .blog-related-card:hover{border-color:var(--ink-border-strong)}
        .blog-related-thumb{aspect-ratio:16/9}
        .blog-related-body{padding:10px 12px}
        .blog-related-title{font-family:var(--font-display);font-size:13px;font-weight:800;line-height:1.3;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .blog-related-meta{font-size:11px;color:var(--ink-muted)}

        /* SIDEBAR */
        .blog-detail-sidebar{display:flex;flex-direction:column;gap:20px;position:sticky;top:80px;min-width:0;max-width:100%}

        /* SB CTA */
        .blog-sb-cta{background:linear-gradient(135deg,rgba(248,166,104,.12),rgba(238,91,159,.12));border:1.5px solid rgba(238,91,159,.2);border-radius:20px;padding:22px 20px;text-align:center}
        .blog-sb-cta-logo{width:52px;height:52px;border-radius:50%;background:var(--grad);color:#fff;font-family:var(--font-display);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
        .blog-sb-cta-title{font-family:var(--font-display);font-size:17px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
        .blog-sb-cta-title em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
        .blog-sb-cta-desc{font-size:12px;color:var(--ink-2);line-height:1.55;margin:0 0 16px}
        .blog-btn-primary{display:block;background:var(--grad-cta);color:#fff;padding:12px;border-radius:999px;text-align:center;font-size:13px;font-weight:700;box-shadow:var(--shadow-cta)}
        .blog-sb-cta-secondary{display:block;text-align:center;font-size:12px;font-weight:700;color:var(--ink-muted);padding:10px 8px 2px}

        /* SB section label */
        .blog-sb-section-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .blog-sb-section-label::after{content:"";flex:1;height:1px;background:var(--ink-divider)}

        /* TOC */
        .blog-toc{border-left:2px solid var(--ink-border);padding-left:0}
        .blog-toc-item{display:block;padding:6px 0 6px 14px;font-size:12px;font-weight:500;color:var(--ink-muted);transition:color .15s;border-left:2px solid transparent;margin-left:-2px}
        .blog-toc-item:hover{color:var(--ink-2)}
        .blog-toc-item--active{font-family:var(--font-display);font-weight:700;border-left-color:var(--magenta);background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}

        /* SB Related */
        .blog-sb-related-list{display:flex;flex-direction:column;gap:14px}
        .blog-sb-related-item{display:flex;gap:10px;align-items:flex-start}
        .blog-sb-related-item:hover .blog-sb-related-title{color:var(--magenta)}
        .blog-sb-related-thumb{width:52px;height:52px;border-radius:10px;flex-shrink:0;background:var(--ink-tint)}
        .blog-sb-related-title{font-family:var(--font-display);font-size:12px;font-weight:800;line-height:1.3;margin-bottom:3px;transition:color .15s;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .blog-sb-related-meta{font-size:10px;color:var(--ink-muted)}

        /* FIXED CTA */
        .blog-nav-cta-fixed{position:fixed;bottom:24px;right:24px;z-index:60;display:inline-flex;align-items:center;gap:8px;background:var(--grad-cta);color:#fff;padding:12px 22px 12px 14px;border-radius:999px;font-weight:800;font-size:14px;box-shadow:var(--shadow-cta)}

        /* RESPONSIVE */
        @media (max-width:960px){
          .blog-detail-body{grid-template-columns:1fr}
          .blog-detail-sidebar{position:static}
          .blog-related-mobile{display:block}
          .blog-detail-main{padding:24px 22px}
        }
        @media (max-width:640px){
          .blog-shell{padding:0 16px}
          .blog-detail-body{padding-top:24px;padding-bottom:48px;gap:20px}
          .blog-detail-h1{font-size:26px}
          .blog-detail-main{padding:20px 18px}
          .blog-nav-prev-next{flex-direction:column}
          .blog-related-grid{grid-template-columns:1fr 1fr}
          .blog-nav-links{display:none}
        }
        @media (max-width:420px){
          .blog-related-grid{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}
