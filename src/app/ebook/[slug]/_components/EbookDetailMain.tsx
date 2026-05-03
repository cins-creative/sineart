import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { EbookDetailFlipbook } from "../EbookDetailFlipbook";
import { EbookDetailReadCTA } from "../EbookDetailReadCTA";
import { EbookDetailPrevNext } from "./EbookDetailPrevNext";
import { EbookDetailRelatedAside } from "./EbookDetailRelatedAside";
import { ebookCatColor, ebookGradFor, fetchEbookBySlug } from "@/lib/data/ebook";
import { EbookFlipbook } from "../EbookFlipbook";

/** Strip `<script>` / `<iframe>` — nội dung admin nhưng vẫn filter an toàn. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function EbookDetailPrevNextSkeleton() {
  return (
    <div className="ebd-navpn" aria-hidden>
      <Skeleton style={{ minHeight: 88, borderRadius: 14, width: "100%" }} />
      <Skeleton style={{ minHeight: 88, borderRadius: 14, width: "100%" }} />
    </div>
  );
}

function EbookDetailRelatedAsideSkeleton() {
  return (
    <div className="ebd-sb-section" aria-hidden>
      <Skeleton style={{ width: 120, height: 12, borderRadius: 6, marginBottom: 12 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <Skeleton style={{ width: 48, height: 64, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skeleton style={{ width: "95%", height: 14, borderRadius: 8, marginBottom: 6 }} />
            <Skeleton style={{ width: "55%", height: 11, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function EbookDetailMain({ slug }: { slug: string }) {
  const ebook = await fetchEbookBySlug(slug);
  if (!ebook) notFound();

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

          <Suspense fallback={<EbookDetailPrevNextSkeleton />}>
            <EbookDetailPrevNext currentId={ebook.id} />
          </Suspense>
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

          <Suspense fallback={<EbookDetailRelatedAsideSkeleton />}>
            <EbookDetailRelatedAside
              currentId={ebook.id}
              categories={ebook.categories}
            />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
