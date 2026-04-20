import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { Suspense } from "react";
import {
  fetchBlogList,
  fetchFeaturedBlog,
  fetchPopularBlogs,
  buildBlogSlug,
  estimateReadMinutes,
  formatDateVi,
  sourceDomain,
  type BlogListItem,
} from "@/lib/data/blog";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import NavBar from "../_components/NavBar";
import { BlogSearchBar } from "./BlogSearchBar";
import { BlogStyles } from "./BlogStyles";


export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog mỹ thuật — Sine Art",
  description:
    "Kiến thức mỹ thuật bài bản từ giáo viên Sine Art, thông tin tuyển sinh và hoạt động từ các trường đại học đối tác.",
  alternates: { canonical: "https://sineart.vn/blogs" },
};

const PER_PAGE = 9;

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

function initials(nguon: string | null | undefined) {
  const name = sourceDomain(nguon);
  const w = name.replace(/\..+/, "").trim(); // lấy phần trước dấu chấm đầu tiên
  return w.slice(0, 2).toUpperCase();
}

function ThumbDiv({
  post,
  className,
  children,
}: {
  post: BlogListItem;
  className: string;
  children?: React.ReactNode;
}) {
  const src = post.thumbnail ? cfImageForThumbnail(post.thumbnail) ?? post.thumbnail : null;
  return (
    <div
      className={className}
      style={
        src
          ? { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: thumbGrad(post.id) }
      }
    >
      {children}
    </div>
  );
}

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function BlogPage({ searchParams }: PageProps) {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const search = q?.trim() ?? "";

  const [{ posts, total, totalPages }, featured, popular, { courses }] = await Promise.all([
    fetchBlogList({ page, perPage: PER_PAGE, search }),
    fetchFeaturedBlog(),
    fetchPopularBlogs(5),
    getKhoaHocPageData(),
  ]);
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  const featuredSlug = featured ? buildBlogSlug(featured.id, featured.title) : null;
  const featuredReadMin = featured
    ? estimateReadMinutes(featured.opening)
    : null;

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (search) params.set("q", search);
    const qs = params.toString();
    return qs ? `/blogs?${qs}` : "/blogs";
  }

  const pageNums: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (page > 3) pageNums.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNums.push(i);
    if (page < totalPages - 2) pageNums.push("…");
    pageNums.push(totalPages);
  }

  return (
    <div className="sa-root sa-blog">
      <NavBar khoaHocGroups={khoaHocGroups} />

      {/* ─── HERO ─── */}
      <section className="page-hero">
        <div className="page-hero-bg" />
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <div className="shell page-hero-inner">
          <div>
            <div className="ph-eyebrow">
              <span className="dot">≡</span>
              Sine Art · {total > 0 ? `${total} bài viết` : "Blog mỹ thuật"}
            </div>
            <h1>Bài viết <em>mỹ thuật</em><br />nền tảng.</h1>
            <p className="lead">
              Kiến thức mỹ thuật bài bản từ giáo viên Sine Art, thông tin tuyển sinh và hoạt động nổi bật từ các
              trường đại học đối tác — cập nhật hàng tuần.
            </p>
          </div>
          <div className="ph-side">
            <div className="ph-stat">
              <div className="n"><em>{total > 0 ? `${total}+` : "270+"}</em></div>
              <div className="l">Bài viết đã xuất bản<br /><span>Từ 2018 đến nay</span></div>
            </div>
            <div className="ph-stat">
              <div className="n">21</div>
              <div className="l">Trường đại học đối tác<br /><span>Tin tuyển sinh chính thức</span></div>
            </div>
            <div className="ph-stat">
              <div className="n">8</div>
              <div className="l">Giáo viên đóng góp<br /><span>Chia sẻ kinh nghiệm thực tế</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER ─── */}
      <div className="filter-section">
        <div className="shell">
          <div className="filter-bar">
            <Suspense fallback={<div className="search-input"><span>⌕</span></div>}>
              <BlogSearchBar defaultValue={search} />
            </Suspense>
            <div className="pill-row">
              <Link href="/blogs" className={`pill${!search ? " active" : ""}`}>
                Tất cả {total > 0 ? `· ${total}` : ""}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="shell">
        <div className="list-body">
          <div>
            {/* Featured */}
            {featured && featuredSlug && !search && page === 1 && (
              <>
                <div className="sec-label">Bài nổi bật</div>
                <Link href={`/blogs/${featuredSlug}`} className="featured-card">
                  <ThumbDiv post={featured} className="featured-thumb">
                    <span className="featured-badge">★ NỔI BẬT</span>
                  </ThumbDiv>
                  <div className="featured-meta">
                    <div className="cat-row">
                      <span className="cat-name">{sourceDomain(featured.nguon)}</span>
                      {featuredReadMin && featuredReadMin > 0 && (
                        <>
                          <span className="cat-sep">·</span>
                          <span className="cat-time">{featuredReadMin} phút đọc</span>
                        </>
                      )}
                    </div>
                    <h2>{featured.title}</h2>
                    {featured.opening && (
                      <p
                        className="excerpt"
                        dangerouslySetInnerHTML={{
                          __html: featured.opening.replace(/<[^>]+>/g, " ").slice(0, 160) + "…",
                        }}
                      />
                    )}
                    <div className="author-row">
                      <span className="avatar">{initials(featured.nguon)}</span>
                      <span className="author-name">{sourceDomain(featured.nguon)}</span>
                      <span className="cat-sep">·</span>
                      <span className="author-date">{formatDateVi(featured.created_at)}</span>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {/* Grid */}
            <div style={{ marginTop: (featured && !search && page === 1) ? 40 : 0 }}>
              {search && (
                <div className="sec-label">
                  {posts.length > 0
                    ? `${total} kết quả cho "${search}"`
                    : `Không tìm thấy kết quả cho "${search}"`}
                </div>
              )}
              {!search && <div className="sec-label">Bài viết mới nhất</div>}

              {posts.length > 0 ? (
                <div className="card-grid">
                  {posts.map((post) => {
                    const slug = buildBlogSlug(post.id, post.title);
                    const readMin = estimateReadMinutes(post.opening);
                    return (
                      <Link key={post.id} href={`/blogs/${slug}`} className="card">
                        <ThumbDiv post={post} className="card-thumb">
                          <span className="thumb-badge">{sourceDomain(post.nguon)}</span>
                        </ThumbDiv>
                        <div className="card-body">
                          <div className="cat-row">
                            <span className="cat-name">{sourceDomain(post.nguon)}</span>
                            {readMin > 0 && (
                              <>
                                <span className="cat-sep">·</span>
                                <span className="cat-time">{readMin} phút</span>
                              </>
                            )}
                          </div>
                          <h3 className="card-title">{post.title}</h3>
                          <div className="card-footer">
                            <span className="avatar">{initials(post.nguon)}</span>
                            <span className="author-name">{sourceDomain(post.nguon)}</span>
                            <span className="cat-sep">·</span>
                            <span className="author-date">{formatDateVi(post.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "48px 0", textAlign: "center", color: "rgba(45,32,32,.45)", fontSize: 15 }}>
                  {search ? "Thử từ khoá khác nhé." : "Chưa có bài viết nào."}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  {page > 1 ? (
                    <Link href={pageUrl(page - 1)} className="page-btn">‹</Link>
                  ) : (
                    <span className="page-btn" style={{ opacity: 0.3 }}>‹</span>
                  )}
                  <div className="page-num-group">
                    {pageNums.map((n, i) =>
                      n === "…" ? (
                        <span key={`dots-${i}`} className="page-dots">···</span>
                      ) : (
                        <Link
                          key={n}
                          href={pageUrl(n)}
                          className={`page-num${n === page ? " active" : ""}`}
                        >
                          {n}
                        </Link>
                      )
                    )}
                  </div>
                  {page < totalPages ? (
                    <Link href={pageUrl(page + 1)} className="page-btn">›</Link>
                  ) : (
                    <span className="page-btn" style={{ opacity: 0.3 }}>›</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── SIDEBAR ─── */}
          <aside className="sidebar">
            <div className="sb-cta">
              <div className="sb-cta-logo">SA</div>
              <div className="sb-cta-title">Học mỹ thuật <em>bài bản</em> tại Sine Art</div>
              <p className="sb-cta-desc">Giáo trình khoa học, đồng hành cùng 350+ học viên trên hành trình Họa sỹ công nghệ.</p>
              <Link href="/khoa-hoc" className="btn-primary">▶ Xem khoá học</Link>
              <Link href="/dang-ky" className="sb-cta-secondary">🎨 Đăng ký học thử miễn phí →</Link>
            </div>

            {popular.length > 0 && (
              <div className="sb-section">
                <div className="sb-section-label">Bài viết mới nhất</div>
                <div className="popular-list">
                  {popular.map((p, idx) => (
                    <Link
                      key={p.id}
                      href={`/blogs/${buildBlogSlug(p.id, p.title)}`}
                      className="popular-item"
                    >
                      <div className={`popular-num${idx === 0 ? " top1" : ""}`}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <div className="popular-title">{p.title}</div>
                        <div className="popular-meta">
                          <span className="cat-dot neutral" />
                          {sourceDomain(p.nguon)} · {formatDateVi(p.created_at)}
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

      <BlogStyles />
    </div>
  );
}
