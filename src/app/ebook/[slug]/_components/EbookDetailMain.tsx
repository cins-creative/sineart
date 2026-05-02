import Link from "next/link";
import { notFound } from "next/navigation";

import { EbookDetailFlipbook } from "../EbookDetailFlipbook";
import { EbookDetailReadCTA } from "../EbookDetailReadCTA";
import {
  buildEbookHref,
  ebookCatColor,
  ebookGradFor,
  fetchAdjacentEbooks,
  fetchEbookBySlug,
  fetchRelatedEbooks,
} from "@/lib/data/ebook";
import { EbookFlipbook } from "../EbookFlipbook";

/** Strip `<script>` / `<iframe>` — nội dung admin nhưng vẫn filter an toàn. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export async function EbookDetailMain({ slug }: { slug: string }) {
  const ebook = await fetchEbookBySlug(slug);
  if (!ebook) notFound();

  const [related, adjacent] = await Promise.all([
    fetchRelatedEbooks(ebook.id, ebook.categories, 4),
    fetchAdjacentEbooks(ebook.id),
  ]);
  const { prev, next } = adjacent;

  const publishedYear = ebook.created_at ? new Date(ebook.created_at).getFullYear() : null;

  const contentSafe = ebook.content ? sanitizeHtml(ebook.content) : "";
  const detailedSafe = ebook.noi_dung_sach ? sanitizeHtml(ebook.noi_dung_sach) : "";

  const hasEmbed = !!ebook.html_embed?.trim();
  const hasPages = ebook.img_src_link.length > 0;

  return (
    <div className="ebd-shell">
      <div className="ebd-body">
        <main className="ebd-main">
          {/* Breadcrumb */}
          <nav className="ebd-crumb" aria-label="Breadcrumb">
            <Link href="/ebook" className="ebd-crumb-back">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Sine Art Library
            </Link>
            <span className="ebd-crumb-sep">/</span>
            <span>Ebook</span>
          </nav>

          {/* HEADER — compact */}
          <header className="ebd-header">
            <div
              className="ebd-h-thumb"
              style={{
                background: ebook.thumbnail ? "#f2ece5" : ebookGradFor(ebook.id),
              }}
            >
              {ebook.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ebook.thumbnail}
                  alt={ebook.title}
                  className="ebd-h-thumb-img"
                  loading="eager"
                  decoding="async"
                />
              )}
            </div>

            <div className="ebd-h-info">
              <div className="ebd-h-eyebrow">{ebook.featured ? "★ Ebook nổi bật" : "Sine Art Library"}</div>
              <h1 className="ebd-h-title">{ebook.title}</h1>

              {ebook.categories.length > 0 && (
                <div className="ebd-h-cats">
                  {ebook.categories.map((c) => {
                    const { bg, fg } = ebookCatColor(c);
                    return (
                      <span key={c} className="ebd-h-cat" style={{ background: bg, color: fg }}>
                        {c}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="ebd-h-meta">
                {ebook.pages != null && (
                  <span>
                    <strong>{ebook.pages}</strong> trang
                  </span>
                )}
                {publishedYear && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      Xuất bản <strong>{publishedYear}</strong>
                    </span>
                  </>
                )}
                {hasPages && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      <strong>{ebook.img_src_link.length}</strong> ảnh trang sách
                    </span>
                  </>
                )}
              </div>

              <EbookDetailReadCTA slug={ebook.slug} title={ebook.title} hasEmbed={hasEmbed} hasPages={hasPages} />
            </div>
          </header>

          {hasPages ? (
            <EbookFlipbook pages={ebook.img_src_link} title={ebook.title} />
          ) : hasEmbed && ebook.html_embed ? (
            <EbookDetailFlipbook htmlEmbed={ebook.html_embed} />
          ) : null}

          {contentSafe && (
            <section className="ebd-section">
              <h2 className="ebd-sec-title">Giới thiệu sách</h2>
              <div className="ebd-prose" dangerouslySetInnerHTML={{ __html: contentSafe }} />
            </section>
          )}

          {detailedSafe && (
            <section className="ebd-section">
              <h2 className="ebd-sec-title">Nội dung chi tiết</h2>
              <div className="ebd-prose" dangerouslySetInnerHTML={{ __html: detailedSafe }} />
            </section>
          )}

          {(prev || next) && (
            <div className="ebd-navpn">
              {prev ? (
                <Link href={buildEbookHref(prev.slug)} className="ebd-navpn-item">
                  <span className="ebd-navpn-icon" aria-hidden>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </span>
                  <div
                    className="ebd-navpn-thumb"
                    style={prev.thumbnail ? undefined : { background: ebookGradFor(prev.id) }}
                  >
                    {prev.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prev.thumbnail}
                        alt=""
                        className="ebd-navpn-thumb-img"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="ebd-navpn-text">
                    <div className="ebd-navpn-label">Ebook trước</div>
                    <div className="ebd-navpn-title">{prev.title}</div>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link href={buildEbookHref(next.slug)} className="ebd-navpn-item ebd-navpn-item--next">
                  <div className="ebd-navpn-text">
                    <div className="ebd-navpn-label">Ebook kế</div>
                    <div className="ebd-navpn-title">{next.title}</div>
                  </div>
                  <div
                    className="ebd-navpn-thumb"
                    style={next.thumbnail ? undefined : { background: ebookGradFor(next.id) }}
                  >
                    {next.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={next.thumbnail}
                        alt=""
                        className="ebd-navpn-thumb-img"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <span className="ebd-navpn-icon" aria-hidden>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </main>

        <aside className="ebd-sidebar" aria-label="Thông tin ebook">
          <div className="ebd-sb-stats">
            <div className="ebd-sb-stat">
              <div className="ebd-sb-stat-k">Số trang</div>
              <div className="ebd-sb-stat-v">{ebook.pages ?? "—"}</div>
            </div>
            <div className="ebd-sb-stat">
              <div className="ebd-sb-stat-k">Xuất bản</div>
              <div className="ebd-sb-stat-v">{publishedYear ?? "—"}</div>
            </div>
            <div className="ebd-sb-stat">
              <div className="ebd-sb-stat-k">Ảnh trang</div>
              <div className="ebd-sb-stat-v">{ebook.img_src_link.length || "—"}</div>
            </div>
            <div className="ebd-sb-stat">
              <div className="ebd-sb-stat-k">Trạng thái</div>
              <div className="ebd-sb-stat-v">{ebook.featured ? "Nổi bật" : "Phát hành"}</div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="ebd-sb-section">
              <div className="ebd-sb-label">Ebook liên quan</div>
              <div className="ebd-sb-list">
                {related.map((r) => (
                  <Link key={r.id} href={buildEbookHref(r.slug)} className="ebd-sb-item">
                    <div
                      className="ebd-sb-thumb"
                      style={
                        r.thumbnail
                          ? {
                              backgroundImage: `url(${JSON.stringify(r.thumbnail)})`,
                            }
                          : { background: ebookGradFor(r.id) }
                      }
                    />
                    <div>
                      <div className="ebd-sb-title">{r.title}</div>
                      <div className="ebd-sb-meta">
                        {r.pages != null ? `${r.pages} trang` : "Ebook"}
                        {r.categories[0] ? ` · ${r.categories[0]}` : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
