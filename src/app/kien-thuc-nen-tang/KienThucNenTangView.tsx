"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { buildLyThuyetHref } from "@/lib/data/ly-thuyet-shared";
import type { LyThuyetCard } from "@/types/ly-thuyet";
import { GROUP_ACCENT } from "@/types/ly-thuyet";

import LibNavLink from "./_components/LibNavLink";

/**
 * Client view cho landing `/kien-thuc-nen-tang`:
 *   - Left sidebar: ô tìm bài + danh sách bài group theo nhóm (anchor tới
 *     `#nhom-<i>` ở main) → UX giống thư viện của preview v4.
 *   - Main: hero + các section `<div class="lib-group">` chứa grid card.
 *   - Search: filter theo `ten` + `shortContent` + `nhom`, áp dụng đồng thời
 *     cho sidebar nav và grid.
 *
 * Props `groups` là kết quả `groupByNhom(fetchAllLyThuyet())` đã toCard ở
 * server để giảm payload (không gửi `content` HTML về client).
 */
export type LandingGroup = {
  /** Tên nhóm, ví dụ "Lý thuyết cơ sở" */
  nhom: string;
  /** Các bài trong nhóm (đã rút gọn thành card) */
  items: LyThuyetCard[];
};

export default function KienThucNenTangView({ groups }: { groups: LandingGroup[] }) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo<LandingGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => {
        const items = g.items.filter((it) => {
          const hay = [
            it.ten,
            it.shortContent ?? "",
            g.nhom,
            ...(it.tags ?? []),
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const totalCount = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups]
  );
  const filteredCount = useMemo(
    () => filteredGroups.reduce((n, g) => n + g.items.length, 0),
    [filteredGroups]
  );

  return (
    <div className="ktn-lib">
      <div className="page">
        {/* ───────── LEFT NAV ───────── */}
        <aside className="lnav" aria-label="Danh mục thư viện">
          <div className="lnav-search">
            <input
              type="search"
              placeholder="Tìm trong thư viện..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm trong thư viện"
            />
          </div>

          {filteredGroups.length === 0 ? (
            <p className="lnav-empty">Không có bài khớp.</p>
          ) : (
            filteredGroups.map((g, idx) => {
              const groupAccent = GROUP_ACCENT[g.nhom] ?? "#ee5b9f";
              return (
                <div
                  className="lnav-section"
                  key={g.nhom}
                  style={{ ["--lnav-cat-accent" as string]: groupAccent }}
                >
                  <p className="lnav-cat">{g.nhom}</p>
                  {g.items.map((it) => (
                    <LibNavLink
                      key={it.id}
                      href={buildLyThuyetHref(it.slug)}
                      className="lnav-item"
                    >
                      {it.ten}
                    </LibNavLink>
                  ))}
                </div>
              );
            })
          )}
        </aside>

        {/* ───────── MAIN ───────── */}
        <main>
          <nav className="bc" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="bc-sep">›</span>
            <span className="bc-cur">Thư viện kiến thức nền tảng</span>
          </nav>

          <section className="lib-landing-hero">
            <p className="lib-landing-kicker">Thư viện · Sine Art</p>
            <h1 className="lib-landing-title">
              Thư viện <em>kiến thức</em> mỹ thuật nền tảng
            </h1>
            <p className="lib-landing-sub">
              Tập hợp các bài lý thuyết cơ sở được biên soạn bởi đội ngũ Sine
              Art — từ ngôn ngữ thị giác, bố cục, giải phẫu đến màu sắc, sắc độ
              và vật liệu. Mỗi bài đi kèm video minh hoạ, ví dụ và bài tập ứng
              dụng.
            </p>
            <div className="lib-landing-meta">
              <span>{totalCount} bài học</span>
              <span>{groups.length} nhóm chủ đề</span>
              <span>Cập nhật liên tục</span>
            </div>
          </section>

          <section className="lib-landing-body">
            {filteredCount === 0 ? (
              <p className="lib-empty">
                Không tìm thấy bài khớp với{" "}
                <strong>&ldquo;{query.trim()}&rdquo;</strong>. Thử từ khoá khác
                hoặc xoá tìm kiếm.
              </p>
            ) : (
              filteredGroups.map((g, idx) => {
                const accent = GROUP_ACCENT[g.nhom] ?? "#ee5b9f";
                return (
                  <div
                    key={g.nhom}
                    id={`nhom-${idx}`}
                    className="lib-group"
                    style={{ ["--accent" as string]: accent }}
                  >
                    <div className="lib-group-head">
                      <div className="lib-group-n">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="lib-group-meta">
                        <p className="lib-group-kicker">Nhóm</p>
                        <h2 className="lib-group-title">{g.nhom}</h2>
                      </div>
                      <div className="lib-group-count">
                        {g.items.length} bài
                      </div>
                    </div>

                    <div className="lib-grid">
                      {g.items.map((it) => {
                        const thumb = it.thumbnail
                          ? cfImageForThumbnail(it.thumbnail) ?? it.thumbnail
                          : null;
                        return (
                          <Link
                            key={it.id}
                            href={buildLyThuyetHref(it.slug)}
                            className="lib-card"
                            style={{ ["--accent" as string]: accent }}
                          >
                            <div className="lib-card-thumb">
                              <span className="lib-card-accent">{g.nhom}</span>
                              {thumb ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={thumb}
                                  alt={it.ten}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="lib-card-thumb-ph">
                                  {it.ten}
                                </div>
                              )}
                            </div>
                            <div className="lib-card-body">
                              <h3 className="lib-card-title">{it.ten}</h3>
                              {it.shortContent ? (
                                <p className="lib-card-desc">
                                  {it.shortContent}
                                </p>
                              ) : null}
                              <div className="lib-card-meta">
                                <span>{it.readingMin} phút đọc</span>
                                <div className="lib-card-meta-tags">
                                  {(it.tags ?? []).slice(0, 2).map((t) => (
                                    <span key={t} className="lib-card-tag">
                                      #{t}
                                    </span>
                                  ))}
                                  <span className="lib-card-arrow">→</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </main>

        {/* ───────── RIGHT SIDEBAR ───────── */}
        <aside className="rnav" aria-label="Thông tin thư viện">
          <div className="rnav-lbl">Thư viện Sine Art</div>
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "var(--ink-2)",
              marginBottom: 18,
            }}
          >
            Tài liệu biên soạn nội bộ cho chương trình đào tạo tại Sine Art.
            Miễn phí cho cộng đồng yêu mỹ thuật.
          </p>

          <div className="rnav-lbl">Nhóm chủ đề</div>
          <nav className="toc2" aria-label="Mục lục nhóm">
            {groups.map((g, idx) => (
              <a key={g.nhom} href={`#nhom-${idx}`}>
                <span className="toc-pip" />
                {String(idx + 1).padStart(2, "0")} — {g.nhom}
              </a>
            ))}
          </nav>

          <div className="cta-block">
            <p className="cta-tagline">Sine Art · 350+ học viên</p>
            <p className="cta-title">
              Học mỹ thuật <em>bài bản</em>
            </p>
            <p className="cta-desc">
              Giáo trình khoa học, đồng hành cùng học viên từ nhập môn đến luyện
              thi khối H, V.
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
  );
}
