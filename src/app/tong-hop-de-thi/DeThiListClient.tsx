"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import {
  buildDeThiHref,
  formatDateVi,
  monAccent,
  type DeThiListItem,
  type TruongLookup,
} from "@/lib/data/de-thi-shared";

const PER_PAGE = 12;

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

function parseCsv(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIntCsv(v: string | null): number[] {
  return parseCsv(v)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

/**
 * Meta card theo brief: ghép `loai_mau_hinh_hoa · mon · nam`, skip phần rỗng.
 *   Ví dụ đủ: "Tượng · Hình họa · 2026"
 *          thiếu mẫu: "Hình họa · 2026"
 *          thiếu năm: "Tượng · Hình họa"
 */
/** Có gắn trường "thực" (không rỗng và không phải placeholder Sine Art id=1). */
function truongHasReal(ids: number[]): boolean {
  if (ids.length === 0) return false;
  if (ids.length === 1 && ids[0] === 1) return false;
  return true;
}

function buildCardMeta(it: DeThiListItem): string {
  const parts: string[] = [];
  if (it.loai_mau_hinh_hoa.length > 0) parts.push(it.loai_mau_hinh_hoa.join(", "));
  if (it.mon.length > 0) parts.push(it.mon[0]!);
  if (it.nam != null) parts.push(String(it.nam));
  return parts.join(" · ");
}

type Props = {
  items: DeThiListItem[];
  truongLookup: TruongLookup[];
  namOptions: number[];
  monOptions: string[];
  mauOptions: string[];
};

export default function DeThiListClient({
  items,
  truongLookup,
  namOptions,
  monOptions,
  mauOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ─── State từ URL ─────────────────────────────────────────────────
  const initialQ = searchParams.get("q") ?? "";
  const initialNam = searchParams.get("nam") ?? "";
  const initialMon = parseCsv(searchParams.get("mon"));
  const initialMau = parseCsv(searchParams.get("mau"));
  const initialTruong = parseIntCsv(searchParams.get("truong"));
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const initialSineArt = searchParams.get("sineart") === "1";

  const [q, setQ] = useState(initialQ);
  const [nam, setNam] = useState<string>(initialNam);
  const [monSel, setMonSel] = useState<string[]>(initialMon);
  const [mauSel, setMauSel] = useState<string[]>(initialMau);
  const [truongSel, setTruongSel] = useState<number[]>(initialTruong);
  const [sineArtOnly, setSineArtOnly] = useState<boolean>(initialSineArt);
  const [page, setPage] = useState<number>(initialPage);

  // "Loại mẫu" chỉ có nghĩa khi chọn Hình họa (đúng brief).
  const hinhHoaSelected = monSel.includes("Hình họa");
  const showMauFilter = hinhHoaSelected || mauSel.length > 0;

  // Popover state
  const [mauOpen, setMauOpen] = useState(false);
  const [truongOpen, setTruongOpen] = useState(false);
  const mauRef = useRef<HTMLDivElement | null>(null);
  const truongRef = useRef<HTMLDivElement | null>(null);

  // Đóng popover khi click outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (mauRef.current && !mauRef.current.contains(t)) setMauOpen(false);
      if (truongRef.current && !truongRef.current.contains(t)) setTruongOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // Ghi state vào URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (nam) params.set("nam", nam);
    if (monSel.length) params.set("mon", monSel.join(","));
    if (mauSel.length) params.set("mau", mauSel.join(","));
    if (truongSel.length) params.set("truong", truongSel.join(","));
    if (sineArtOnly) params.set("sineart", "1");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(next, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, nam, monSel, mauSel, truongSel, sineArtOnly, page]);

  // Lookup trường
  const truongNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of truongLookup) m.set(t.id, t.ten);
    return m;
  }, [truongLookup]);

  // ─── Filter logic ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const namN = nam ? Number(nam) : null;
    const monSet = new Set(monSel);
    const mauSet = new Set(mauSel);
    const truongSet = new Set(truongSel);

    return items.filter((it) => {
      if (namN != null && it.nam !== namN) return false;

      if (monSet.size > 0) {
        if (!it.mon.some((m) => monSet.has(m))) return false;
      }
      if (mauSet.size > 0) {
        if (!it.loai_mau_hinh_hoa.some((m) => mauSet.has(m))) return false;
      }
      if (truongSet.size > 0) {
        if (!it.truong_ids.some((id) => truongSet.has(id))) return false;
      }
      // Đề luyện tập Sine Art: truong_ids rỗng hoặc chỉ chứa [1]
      if (sineArtOnly) {
        const isInternal =
          it.truong_ids.length === 0 ||
          (it.truong_ids.length === 1 && it.truong_ids[0] === 1);
        if (!isInternal) return false;
      }

      if (needle) {
        const hay = [
          it.ten ?? "",
          it.excerpt ?? "",
          it.slug ?? "",
          String(it.nam ?? ""),
          it.mon.join(" "),
          it.loai_mau_hinh_hoa.join(" "),
          it.truong_ids.map((id) => truongNameById.get(id) ?? "").join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, q, nam, monSel, mauSel, truongSel, sineArtOnly, truongNameById]);

  // Reset page khi filter đổi
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, nam, monSel, mauSel, truongSel, sineArtOnly]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const clampedPage = Math.min(page, totalPages);
  const slice = filtered.slice((clampedPage - 1) * PER_PAGE, clampedPage * PER_PAGE);

  const hasFilter =
    !!(q.trim() || nam || monSel.length || mauSel.length || truongSel.length || sineArtOnly);

  const pageNums: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (clampedPage > 3) pageNums.push("…");
    for (
      let i = Math.max(2, clampedPage - 1);
      i <= Math.min(totalPages - 1, clampedPage + 1);
      i++
    ) {
      pageNums.push(i);
    }
    if (clampedPage < totalPages - 2) pageNums.push("…");
    pageNums.push(totalPages);
  }

  // ─── UI helpers ───────────────────────────────────────────────────
  function toggleMon(m: string) {
    setMonSel((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }
  function toggleMau(m: string) {
    setMauSel((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }
  function toggleTruong(id: number) {
    setTruongSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function renderThumb(item: DeThiListItem) {
    const src = item.thumbnail_url
      ? cfImageForThumbnail(item.thumbnail_url) ?? item.thumbnail_url
      : null;

    return (
      <div
        className="card-thumb"
        style={
          src
            ? { backgroundImage: `url(${src})` }
            : { background: grad(item.id) }
        }
      >
        {!src && (
          <div className="thumb-placeholder">{item.ten?.slice(0, 28) ?? "Đề thi"}</div>
        )}
      </div>
    );
  }

  function truongNamesText(ids: number[]): string {
    if (ids.length === 0) return "Đề luyện tập Sine Art";
    const names = ids
      .map((id) => truongNameById.get(id))
      .filter((s): s is string => !!s);
    if (names.length === 0) return "Đề luyện tập Sine Art";
    if (names.length <= 2) return names.join(" · ");
    return `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* FILTER */}
      <div className="filter-section">
        <div className="shell">
          <div className="filter-wrap">
            {/* Hàng 1: pill môn (filter chính) */}
            {monOptions.length > 0 && (
              <div className="filter-mon-row">
                <span className="filter-mon-label">Môn</span>
                {monOptions.map((m) => {
                  const active = monSel.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`mon-pill${active ? " mon-pill--active" : ""}`}
                      onClick={() => toggleMon(m)}
                    >
                      <span
                        className="dot"
                        style={{ background: monAccent(m) }}
                        aria-hidden
                      />
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hàng 2: search + năm + multi-select + clear */}
            <div className="filter-row2">
              <div className="search-input">
                <span aria-hidden>⌕</span>
                <input
                  value={q}
                  placeholder="Tìm đề thi theo tên, năm, từ khoá..."
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Tìm kiếm"
                />
              </div>

              <div className="filter-selects">
                <select
                  value={nam}
                  onChange={(e) => setNam(e.target.value)}
                  aria-label="Lọc theo năm"
                >
                  <option value="">Tất cả năm</option>
                  {namOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                {/* Loại mẫu — chỉ hiện khi có Hình họa trong Môn filter (đúng brief). */}
                {showMauFilter && mauOptions.length > 0 && (
                  <div className="ms-wrap" ref={mauRef}>
                    <button
                      type="button"
                      className={`ms-btn${mauSel.length ? " ms-btn--active" : ""}`}
                      onClick={() => setMauOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={mauOpen}
                    >
                      Loại mẫu
                      {mauSel.length > 0 && <span className="ms-count">{mauSel.length}</span>}
                    </button>
                    {mauOpen && (
                      <div className="ms-panel" role="listbox">
                        {mauOptions.map((m) => (
                          <label key={m} className="ms-item">
                            <input
                              type="checkbox"
                              checked={mauSel.includes(m)}
                              onChange={() => toggleMau(m)}
                            />
                            <span>{m}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="ms-wrap" ref={truongRef}>
                  <button
                    type="button"
                    className={`ms-btn${truongSel.length || sineArtOnly ? " ms-btn--active" : ""}`}
                    onClick={() => setTruongOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={truongOpen}
                  >
                    Trường
                    {(truongSel.length > 0 || sineArtOnly) && (
                      <span className="ms-count">
                        {truongSel.length + (sineArtOnly ? 1 : 0)}
                      </span>
                    )}
                  </button>
                  {truongOpen && (
                    <div className="ms-panel" role="listbox">
                      <label className="ms-item ms-item--special">
                        <input
                          type="checkbox"
                          checked={sineArtOnly}
                          onChange={() => setSineArtOnly((v) => !v)}
                        />
                        <span>Đề luyện tập Sine Art</span>
                      </label>
                      {truongLookup.length > 0 && <div className="ms-divider" aria-hidden />}
                      {truongLookup.length === 0 ? (
                        <div className="ms-empty">Chưa có dữ liệu trường</div>
                      ) : (
                        truongLookup.map((t) => (
                          <label key={t.id} className="ms-item">
                            <input
                              type="checkbox"
                              checked={truongSel.includes(t.id)}
                              onChange={() => toggleTruong(t.id)}
                            />
                            <span>{t.ten}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {hasFilter && (
                  <button
                    type="button"
                    className="filter-clear"
                    onClick={() => {
                      setQ("");
                      setNam("");
                      setMonSel([]);
                      setMauSel([]);
                      setTruongSel([]);
                      setSineArtOnly(false);
                    }}
                  >
                    Xoá lọc
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="shell">
        <div className="list-body">
          <div>
            {hasFilter ? (
              <div className="sec-label">
                {total > 0
                  ? `${total} đề thi${q.trim() ? ` khớp "${q.trim()}"` : ""}`
                  : `Không tìm thấy đề thi${q.trim() ? ` cho "${q.trim()}"` : ""}`}
              </div>
            ) : (
              <div className="sec-label">Toàn bộ đề thi</div>
            )}

            {slice.length > 0 ? (
              <div className="card-grid">
                {slice.map((it) => (
                  <Link
                    key={it.id}
                    href={buildDeThiHref(it.slug)}
                    className="card"
                    aria-label={it.ten ?? "Đề thi"}
                  >
                    {renderThumb(it)}
                    <div className="card-body">
                      {truongHasReal(it.truong_ids) && (
                        <div className="card-truong">
                          <span>{truongNamesText(it.truong_ids)}</span>
                        </div>
                      )}
                      <h3 className="card-title">{it.ten ?? "Đề thi"}</h3>
                      <div className="card-meta">{buildCardMeta(it)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                {hasFilter
                  ? "Thử bỏ bớt bộ lọc hoặc đổi từ khoá nhé."
                  : "Chưa có đề thi nào được đăng."}
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
                    aria-label="Trang trước"
                  >
                    ‹
                  </button>
                ) : (
                  <span className="page-btn" style={{ opacity: 0.3 }} aria-hidden>
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
                    aria-label="Trang sau"
                  >
                    ›
                  </button>
                ) : (
                  <span className="page-btn" style={{ opacity: 0.3 }} aria-hidden>
                    ›
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="sb-cta">
              <div className="sb-cta-logo">SA</div>
              <div className="sb-cta-title">
                Luyện thi <em>bài bản</em> cùng Sine Art
              </div>
              <p className="sb-cta-desc">
                Giáo trình khoa học, đồng hành cùng 350+ học viên. Kết thúc khoá, bạn có portfolio
                đề thi & bài nộp đạt chuẩn.
              </p>
              <Link href="/khoa-hoc" className="btn-primary">
                ▶ Xem khoá luyện thi
              </Link>
              <Link href="/dang-ky" className="sb-cta-secondary">
                🎨 Đăng ký học thử miễn phí →
              </Link>
            </div>

            {items.length > 0 && (
              <div>
                <div className="sb-section-label">Mới cập nhật</div>
                <div className="popular-list">
                  {items.slice(0, 5).map((p, idx) => {
                    const monText = p.mon[0] ?? "Đề thi";
                    return (
                      <Link
                        key={p.id}
                        href={buildDeThiHref(p.slug)}
                        className="popular-item"
                      >
                        <div className={`popular-num${idx === 0 ? " top1" : ""}`}>
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="popular-title">{p.ten ?? "Đề thi"}</div>
                          <div className="popular-meta">
                            {monText}
                            {p.nam != null ? ` · Năm ${p.nam}` : ""}
                            {p.created_at ? ` · ${formatDateVi(p.created_at)}` : ""}
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
    </>
  );
}
