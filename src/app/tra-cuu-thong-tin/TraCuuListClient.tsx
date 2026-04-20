"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import {
  buildTraCuuHref,
  formatDateVi,
  traCuuTypeLabel,
  TRA_CUU_TYPE_OPTIONS,
  type TraCuuListItem,
  type TruongLookup,
} from "@/lib/data/tra-cuu-shared";

const PER_PAGE = 9;

const THUMB_GRADS = [
  "linear-gradient(135deg,#fde859,#f8a668)",
  "linear-gradient(135deg,#f8a668,#ee5b9f)",
  "linear-gradient(135deg,#bb89f8,#ee5b9f)",
  "linear-gradient(135deg,#6efec0,#3bd99e)",
  "linear-gradient(135deg,#fde859,#bb89f8)",
];

function grad(id: number) {
  return THUMB_GRADS[id % THUMB_GRADS.length]!;
}

function stripHtml(s: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

type Props = {
  items: TraCuuListItem[];
  truongLookup: TruongLookup[];
};

export default function TraCuuListClient({ items, truongLookup }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ─── State đồng bộ từ URL ─────────────────────────────────────────────
  const initialQ = searchParams.get("q") ?? "";
  const initialTruong = searchParams.get("truong") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [q, setQ] = useState(initialQ);
  const [truongId, setTruongId] = useState<string>(initialTruong); // "" | id string
  const [typeVal, setTypeVal] = useState<string>(initialType); // "" | type value
  const [page, setPage] = useState<number>(initialPage);

  // Ghi lại state vào URL (replace, không reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (truongId) params.set("truong", truongId);
    if (typeVal) params.set("type", typeVal);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(next, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, truongId, typeVal, page]);

  // Lookup truong id → ten
  const truongNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of truongLookup) m.set(t.id, t.ten);
    return m;
  }, [truongLookup]);

  // ─── Filter logic ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const trId = truongId ? Number(truongId) : null;
    return items.filter((it) => {
      if (trId != null && !it.truong_ids.includes(trId)) return false;
      if (typeVal && !it.type.includes(typeVal as (typeof TRA_CUU_TYPE_OPTIONS)[number]["value"])) {
        return false;
      }
      if (needle) {
        const hay = [
          it.title ?? "",
          it.excerpt ?? "",
          it.slug ?? "",
          String(it.nam ?? ""),
          it.type.map((t) => traCuuTypeLabel(t)).join(" "),
          it.truong_ids.map((id) => truongNameById.get(id) ?? "").join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, q, truongId, typeVal, truongNameById]);

  // Khi filter thay đổi → reset page
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, truongId, typeVal]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const clampedPage = Math.min(page, totalPages);
  const slice = filtered.slice((clampedPage - 1) * PER_PAGE, clampedPage * PER_PAGE);

  // Featured: chỉ khi không có filter/search
  const hasFilter = !!(q.trim() || truongId || typeVal);
  const featured = !hasFilter && clampedPage === 1 ? items.find((it) => it.is_featured) : null;
  const gridItems = featured ? slice.filter((it) => it.id !== featured.id) : slice;

  const pageNums: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (clampedPage > 3) pageNums.push("…");
    for (let i = Math.max(2, clampedPage - 1); i <= Math.min(totalPages - 1, clampedPage + 1); i++) {
      pageNums.push(i);
    }
    if (clampedPage < totalPages - 2) pageNums.push("…");
    pageNums.push(totalPages);
  }

  function renderThumb(item: TraCuuListItem, className: string, children?: React.ReactNode) {
    const src = item.thumbnail_url
      ? cfImageForThumbnail(item.thumbnail_url) ?? item.thumbnail_url
      : null;
    return (
      <div
        className={className}
        style={
          src
            ? { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: grad(item.id) }
        }
      >
        {children}
      </div>
    );
  }

  function truongNamesText(ids: number[]): string {
    if (ids.length === 0) return "Sine Art";
    const names = ids
      .map((id) => truongNameById.get(id))
      .filter((s): s is string => !!s);
    if (names.length === 0) return "Sine Art";
    if (names.length <= 2) return names.join(" · ");
    return `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
  }

  return (
    <>
      {/* ─── FILTER ─── */}
      <div className="filter-section">
        <div className="shell">
          <div className="filter-bar">
            <div className="search-input">
              <span>⌕</span>
              <input
                value={q}
                placeholder="Tìm theo trường, ngành, năm, từ khoá..."
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="filter-selects">
              <select
                value={truongId}
                onChange={(e) => setTruongId(e.target.value)}
                aria-label="Lọc theo trường"
              >
                <option value="">Tất cả trường</option>
                {truongLookup.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ten}
                  </option>
                ))}
              </select>

              <select
                value={typeVal}
                onChange={(e) => setTypeVal(e.target.value)}
                aria-label="Lọc theo loại"
              >
                <option value="">Tất cả loại</option>
                {TRA_CUU_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {hasFilter && (
                <button
                  type="button"
                  className="filter-clear"
                  onClick={() => {
                    setQ("");
                    setTruongId("");
                    setTypeVal("");
                  }}
                >
                  Xoá lọc
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="shell">
        <div className="list-body">
          <div>
            {/* Featured */}
            {featured ? (
              <>
                <div className="sec-label">Bài nổi bật</div>
                <Link href={buildTraCuuHref(featured.slug)} className="featured-card">
                  {renderThumb(
                    featured,
                    "featured-thumb",
                    <span className="featured-badge">★ NỔI BẬT</span>,
                  )}
                  <div className="featured-meta">
                    <div className="cat-row">
                      <span className="cat-name">{truongNamesText(featured.truong_ids)}</span>
                      {featured.nam != null && (
                        <>
                          <span className="cat-sep">·</span>
                          <span className="cat-time">Năm {featured.nam}</span>
                        </>
                      )}
                    </div>
                    <h2>{featured.title ?? "Bài tra cứu"}</h2>
                    {featured.excerpt ? (
                      <p className="excerpt">{truncate(stripHtml(featured.excerpt), 180)}</p>
                    ) : null}
                    <div className="type-chip-row">
                      {featured.type.map((t) => (
                        <span key={t} className="type-chip">
                          {traCuuTypeLabel(t)}
                        </span>
                      ))}
                    </div>
                    <div className="author-row">
                      <span className="avatar">TC</span>
                      <span className="author-name">{truongNamesText(featured.truong_ids)}</span>
                      <span className="cat-sep">·</span>
                      <span className="author-date">{formatDateVi(featured.published_at)}</span>
                    </div>
                  </div>
                </Link>
              </>
            ) : null}

            {/* Grid */}
            <div style={{ marginTop: featured ? 40 : 0 }}>
              {hasFilter ? (
                <div className="sec-label">
                  {total > 0
                    ? `${total} kết quả${q.trim() ? ` cho "${q.trim()}"` : ""}`
                    : `Không tìm thấy kết quả${q.trim() ? ` cho "${q.trim()}"` : ""}`}
                </div>
              ) : (
                <div className="sec-label">Mới nhất</div>
              )}

              {gridItems.length > 0 ? (
                <div className="card-grid">
                  {gridItems.map((it) => (
                    <Link key={it.id} href={buildTraCuuHref(it.slug)} className="card">
                      {renderThumb(
                        it,
                        "card-thumb",
                        <>
                          <span className="thumb-badge">{truongNamesText(it.truong_ids)}</span>
                          {it.nam != null && <span className="thumb-year">{it.nam}</span>}
                        </>,
                      )}
                      <div className="card-body">
                        <div className="cat-row">
                          <span className="cat-name">{truongNamesText(it.truong_ids)}</span>
                          {it.nam != null && (
                            <>
                              <span className="cat-sep">·</span>
                              <span className="cat-time">Năm {it.nam}</span>
                            </>
                          )}
                        </div>
                        <h3 className="card-title">{it.title ?? "Bài tra cứu"}</h3>
                        {it.excerpt ? (
                          <p className="card-excerpt">{truncate(stripHtml(it.excerpt), 110)}</p>
                        ) : null}
                        <div className="type-chip-row">
                          {it.type.slice(0, 2).map((t) => (
                            <span key={t} className="type-chip">
                              {traCuuTypeLabel(t)}
                            </span>
                          ))}
                          {it.type.length > 2 && (
                            <span className="type-chip type-chip--more">+{it.type.length - 2}</span>
                          )}
                        </div>
                        <div className="card-footer">
                          <span className="avatar">TC</span>
                          <span className="author-name">{truongNamesText(it.truong_ids)}</span>
                          <span className="cat-sep">·</span>
                          <span className="author-date">{formatDateVi(it.published_at)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  {hasFilter
                    ? "Thử bỏ bớt bộ lọc hoặc đổi từ khoá nhé."
                    : "Chưa có bài tra cứu nào."}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  {clampedPage > 1 ? (
                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setPage(clampedPage - 1)}
                    >
                      ‹
                    </button>
                  ) : (
                    <span className="page-btn" style={{ opacity: 0.3 }}>
                      ‹
                    </span>
                  )}
                  <div className="page-num-group">
                    {pageNums.map((n, i) =>
                      n === "…" ? (
                        <span key={`dots-${i}`} className="page-dots">
                          ···
                        </span>
                      ) : (
                        <button
                          key={n}
                          type="button"
                          className={`page-num${n === clampedPage ? " active" : ""}`}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      ),
                    )}
                  </div>
                  {clampedPage < totalPages ? (
                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setPage(clampedPage + 1)}
                    >
                      ›
                    </button>
                  ) : (
                    <span className="page-btn" style={{ opacity: 0.3 }}>
                      ›
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── SIDEBAR ─── */}
          <aside className="sidebar">
            <div className="sb-cta">
              <div className="sb-cta-logo">SA</div>
              <div className="sb-cta-title">
                Học mỹ thuật <em>bài bản</em> tại Sine Art
              </div>
              <p className="sb-cta-desc">
                Giáo trình khoa học, đồng hành cùng 350+ học viên trên hành trình Họa sỹ công nghệ.
              </p>
              <Link href="/khoa-hoc" className="btn-primary">
                ▶ Xem khoá học
              </Link>
              <Link href="/dang-ky" className="sb-cta-secondary">
                🎨 Đăng ký học thử miễn phí →
              </Link>
            </div>

            {items.length > 0 && (
              <div className="sb-section">
                <div className="sb-section-label">Mới cập nhật</div>
                <div className="popular-list">
                  {items.slice(0, 5).map((p, idx) => (
                    <Link
                      key={p.id}
                      href={buildTraCuuHref(p.slug)}
                      className="popular-item"
                    >
                      <div className={`popular-num${idx === 0 ? " top1" : ""}`}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <div className="popular-title">{p.title ?? "Bài tra cứu"}</div>
                        <div className="popular-meta">
                          <span className="cat-dot neutral" />
                          {truongNamesText(p.truong_ids)} · {formatDateVi(p.published_at)}
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
    </>
  );
}
