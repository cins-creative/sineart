import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import NavBar from "../../_components/NavBar";
import { BlogDetailStyles } from "../../blogs/[slug]/BlogDetailStyles";
import { DeThiDetailStyles } from "./DeThiDetailStyles";
import { DeThiHero } from "./DeThiHero";

import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import {
  buildDeThiHref,
  fetchAllDeThiSlugs,
  fetchDeThiBySlug,
  fetchRelatedDeThi,
  fetchTruongLookup,
  formatDateVi,
  monAccent,
} from "@/lib/data/de-thi";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { getTopLuyenThiStudentWorks } from "@/lib/data/hv-bai-hoc-vien-gallery";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchDeThiBySlug(slug);
  if (!post) return {};
  const plain = post.excerpt
    ? post.excerpt.replace(/<[^>]+>/g, " ").slice(0, 160)
    : post.body_html?.replace(/<[^>]+>/g, " ").slice(0, 160) ?? "";
  const title = post.ten ?? "Đề thi";
  return {
    title: `${title} — Đề thi Sine Art`,
    description: plain,
    alternates: { canonical: `https://sineart.vn/tong-hop-de-thi/${slug}` },
    openGraph: {
      title,
      description: plain,
      images: post.thumbnail_url ? [{ url: post.thumbnail_url }] : [],
    },
  };
}

export async function generateStaticParams() {
  const slugs = await fetchAllDeThiSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function DeThiDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchDeThiBySlug(slug);
  if (!post) notFound();

  // Canonical URL luôn là slug ASCII (khớp DB sau khi chạy
  // `sql/normalize_mkt_de_thi_slugs.sql`). Nếu URL bị truy cập với slug
  // encoded có dấu (do link cũ / Google cache), 308-redirect về canonical.
  if (post.slug && post.slug !== slug) {
    permanentRedirect(`/tong-hop-de-thi/${post.slug}`);
  }

  const [truongLookup, related, { courses }, studentWorks] = await Promise.all([
    fetchTruongLookup(),
    fetchRelatedDeThi(post.id, post.mon, post.loai_mau_hinh_hoa, 6),
    getKhoaHocPageData(),
    getTopLuyenThiStudentWorks(20),
  ]);

  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);
  const truongNameById = new Map(truongLookup.map((t) => [t.id, t.ten]));
  const truongNames = post.truong_ids
    .map((id) => truongNameById.get(id))
    .filter((s): s is string => !!s);

  const heroSrc = post.thumbnail_url
    ? cfImageForLightbox(post.thumbnail_url) ?? post.thumbnail_url
    : null;

  const bodyRaw = post.body_html?.trim() || post.content_raw?.trim() || "";
  const safeBody = bodyRaw
    ? injectTieuChiChamBai(sanitizeBodyHtml(stripHtmlCodeFence(bodyRaw)), post.mon)
    : "";

  const dateStr = formatDateVi(post.updated_at ?? post.created_at);
  const publishedIso = post.created_at || new Date().toISOString();
  const modifiedIso = post.updated_at ?? post.created_at ?? publishedIso;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.ten ?? "Đề thi",
    image: post.thumbnail_url ? [post.thumbnail_url] : undefined,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    author: { "@type": "Organization", name: "Sine Art" },
    publisher: {
      "@type": "Organization",
      name: "Sine Art",
      logo: {
        "@type": "ImageObject",
        url: "https://sineart.vn/brand/logo.png",
      },
    },
    mainEntityOfPage: `https://sineart.vn/tong-hop-de-thi/${slug}`,
    description: post.excerpt ?? undefined,
  };

  return (
    <div className="sa-root bd">
      <BlogDetailStyles />
      <DeThiDetailStyles />
      <NavBar khoaHocGroups={khoaHocGroups} />

      <div className="bd-shell">
        <div className="bd-body">
          <main className="bd-main">
            {/* Breadcrumb */}
            <nav className="bd-crumb" aria-label="Breadcrumb">
              <Link href="/tong-hop-de-thi" className="bd-crumb-back">
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
                Đề thi
              </Link>
              <span className="bd-crumb-sep">/</span>
              <span style={{ fontWeight: 700, color: "rgba(45,32,32,.78)" }}>
                {post.mon[0] ?? "Đề luyện tập"}
              </span>
              {dateStr && <span className="bd-crumb-meta">{dateStr}</span>}
            </nav>

            <DeThiHero
              title={post.ten ?? "Đề thi"}
              mon={post.mon}
              nam={post.nam}
              loaiMau={post.loai_mau_hinh_hoa}
              truongNames={truongNames}
              excerpt={post.excerpt}
              heroSrc={heroSrc}
              heroAlt={post.thumbnail_alt ?? post.ten ?? "Đề thi"}
            />

            {/* Body */}
            {safeBody ? (
              <article
                className="bd-dt-body"
                dangerouslySetInnerHTML={{ __html: safeBody }}
              />
            ) : (
              <p className="bd-dt-excerpt" style={{ marginTop: 24 }}>
                Đề thi này chưa có nội dung chi tiết. Vui lòng quay lại sau — đội ngũ Sine Art sẽ
                cập nhật lời giải và phân tích sớm nhất.
              </p>
            )}

            {/* Banner khoá luyện thi */}
            <a
              href="/khoa-hoc"
              className="bd-banner-link bd-banner-link--yellow"
              aria-label="Khoá luyện thi tại Sine Art"
              style={{ marginTop: 36 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/banner-hinh-hoa.png"
                alt="Khoá luyện thi tại Sine Art"
                className="bd-banner-img"
              />
            </a>

            {/* Share */}
            <div className="bd-share">
              <span className="bd-share-label">Chia sẻ</span>
              <div className="bd-share-btns">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    `https://sineart.vn/tong-hop-de-thi/${slug}`,
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
                  href={`https://sineart.vn/tong-hop-de-thi/${slug}`}
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

            {/* Related */}
            {related.length > 0 && (
              <section className="bd-dt-related">
                <h3>Đề thi liên quan</h3>
                <div className="bd-dt-related-grid">
                  {related.map((r) => {
                    const rThumb = r.thumbnail_url
                      ? cfImageForThumbnail(r.thumbnail_url) ?? r.thumbnail_url
                      : null;
                    const primaryMon = r.mon[0] ?? "Đề luyện tập";
                    return (
                      <Link
                        key={r.id}
                        href={buildDeThiHref(r.slug)}
                        className="bd-dt-rcard"
                      >
                        <div
                          className="bd-dt-rcard-thumb"
                          style={
                            rThumb
                              ? { backgroundImage: `url(${rThumb})` }
                              : {
                                  background: `linear-gradient(135deg, ${monAccent(primaryMon)}, rgba(255,255,255,.4))`,
                                }
                          }
                        />
                        <div className="bd-dt-rcard-body">
                          <h4 className="bd-dt-rcard-title">{r.ten ?? "Đề thi"}</h4>
                          <div className="bd-dt-rcard-meta">
                            {primaryMon}
                            {r.nam != null ? ` · Năm ${r.nam}` : ""}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </main>

          {/* Sidebar */}
          <aside className="bd-sidebar">
            <div className="bd-sb-cta">
              <div className="bd-sb-cta-logo">SA</div>
              <div className="bd-sb-cta-title">
                Luyện thi <em>bài bản</em> tại Sine Art
              </div>
              <p className="bd-sb-cta-desc">
                Giáo trình khoa học, đồng hành cùng 350+ học viên. Kết thúc khoá, bạn có portfolio
                đề thi & bài nộp đạt chuẩn.
              </p>
              <Link href="/khoa-hoc" className="bd-btn-primary">
                ▶ Xem khoá luyện thi
              </Link>
              <Link href="/dang-ky" className="bd-sb-cta-secondary">
                🎨 Đăng ký học thử miễn phí →
              </Link>
            </div>

            {/* Bài học viên Sine Art — top tranh loại khoá "Luyện thi", masonry */}
            {studentWorks.length > 0 && (
              <div className="bd-sb-section bd-sb-works">
                <div className="bd-sb-label">Bài học viên Sine Art</div>
                <div className="bd-sb-works-grid">
                  {studentWorks.map((w) => {
                    const thumb = w.photo
                      ? cfImageForThumbnail(w.photo) ?? w.photo
                      : null;
                    const alt = `Bài học viên — ${w.studentName}${
                      w.tenMonHoc ? ` · ${w.tenMonHoc}` : ""
                    }`;
                    return (
                      <figure key={w.id} className="bd-sb-work">
                        {thumb ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={thumb} alt={alt} loading="lazy" decoding="async" />
                        ) : (
                          <div className="bd-sb-work-ph" aria-hidden />
                        )}
                      </figure>
                    );
                  })}
                </div>
                <div className="bd-sb-works-note">
                  Tác phẩm của học viên khoá luyện thi Sine Art
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* JSON-LD Article */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

/** Strip markdown fence nếu body_html bị lưu dưới dạng \`\`\`html … \`\`\`. */
function stripHtmlCodeFence(input: string): string {
  const t = input.trim();
  const m = t.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?```$/i);
  return (m ? m[1]! : t).trim();
}

/**
 * Map tên môn (theo giá trị trong `mkt_de_thi.mon`) → URL ảnh tiêu chí chấm.
 * Dùng cả accented và unaccented để match an toàn với dữ liệu cũ.
 */
const TIEU_CHI_CHAM_BAI_MAP: Array<{ keys: string[]; url: string; alt: string }> = [
  {
    keys: ["hình họa", "hinh hoa"],
    url: "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/f342b5fb-784c-490e-0b98-5fb7bdbaf600/public",
    alt: "Tiêu chí chấm điểm Hình họa — Sine Art",
  },
  {
    keys: ["trang trí màu", "trang tri mau"],
    url: "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/ee039c4f-b917-435f-711a-ddbaac92d100/public",
    alt: "Tiêu chí chấm điểm Trang trí màu — Sine Art",
  },
  {
    keys: ["bố cục màu", "bo cuc mau", "bố cục tranh màu", "bo cuc tranh mau"],
    url: "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/6663a3c9-457a-4e57-6cb2-ce3a1c90a900/public",
    alt: "Tiêu chí chấm điểm Bố cục màu — Sine Art",
  },
];

/**
 * Thay placeholder "*Tiêu chí chấm bài dưới phần bình luận" (do pipeline
 * Claude OCR sinh ra) bằng ảnh tiêu chí thật, chọn theo `mkt_de_thi.mon`.
 * Nếu môn không match — xoá placeholder để không lộ text không dùng.
 * Nếu body không có placeholder — append block tiêu chí ở cuối.
 */
function injectTieuChiChamBai(html: string, mon: string[]): string {
  const monLower = mon.map((m) => m.trim().toLowerCase()).filter(Boolean);
  const matched = TIEU_CHI_CHAM_BAI_MAP.filter((entry) =>
    monLower.some((m) => entry.keys.some((k) => m === k || m.includes(k))),
  );

  const block =
    matched.length > 0
      ? `<div class="bd-dt-tieuchi">${matched
          .map(
            (e) => `<figure class="bd-dt-tieuchi-fig">
  <img src="${e.url}" alt="${e.alt}" loading="lazy" decoding="async" />
</figure>`,
          )
          .join("")}</div>`
      : "";

  // Tìm paragraph placeholder: <p ...>*Tiêu chí chấm bài ...</p>
  const placeholderRe =
    /<p\b[^>]*>\s*\*?\s*Ti[êeê][uu]\s*ch[íi]\s*ch[ấâa]m\s*b[àa]i[^<]*<\/p>/i;

  if (placeholderRe.test(html)) {
    return html.replace(placeholderRe, block);
  }
  return block ? `${html}${block}` : html;
}

/**
 * Body HTML của mkt_de_thi đến từ pipeline Claude OCR — admin-controlled,
 * trust cao. Chỉ strip script / event handler / link-meta-base để bảo vệ
 * cross-site, giữ nguyên <style> block nếu Claude sinh ra.
 */
function sanitizeBodyHtml(html: string): string {
  let t = html;
  t = t.replace(/<(script|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  t = t.replace(/<\/?(?:script|object|embed|link|meta|base|iframe)[^>]*>/gi, "");
  t = t.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  t = t.replace(/\son\w+\s*=\s*[^\s>]*/gi, "");
  t = t.replace(/javascript:/gi, "");
  t = t.replace(/data:text\/html/gi, "");
  return t;
}
