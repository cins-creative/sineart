"use client";

/**
 * Client shell cho `/gallery` redesign.
 *
 * Tính năng:
 *  - Search: khớp `studentName` + `categoryLabel` + `tenMonHoc`.
 *  - Dropdown môn học (đồng pattern với eb-catdd ở `/ebook`).
 *  - Segmented toggle "Tất cả / Bài mẫu".
 *  - Grid: reuse `GalleryJustifiedRows` (justified-layout engine).
 *  - Custom lightbox với prev/next + arrow keys + Escape.
 *  - Load more batch-wise (mặc định 40).
 */

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import GalleryJustifiedRows from "../_components/GalleryJustifiedRows";

import { cfImageForLightbox } from "@/lib/cfImageUrl";
import { compareGalleryByScoreDesc } from "@/lib/gallery-display-sort";
import type {
  GalleryDisplayItem,
  GalleryMonHocTab,
} from "@/types/homepage";

type WorkKindFilter = "all" | "bai_mau";

type Props = {
  items: GalleryDisplayItem[];
  monHocTabs: GalleryMonHocTab[];
  /** Batch size cho "Xem thêm" — mặc định 40. */
  itemsPerPage?: number;
};

export default function GalleryClient({
  items,
  monHocTabs,
  itemsPerPage = 40,
}: Props) {
  const [q, setQ] = useState("");
  const [monFilter, setMonFilter] = useState<string>(""); // "" = tất cả
  const [workKind, setWorkKind] = useState<WorkKindFilter>("all");
  const [ddOpen, setDdOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);
  const [staggerFromIndex, setStaggerFromIndex] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const ddRef = useRef<HTMLDivElement | null>(null);

  const hasBaiMau = useMemo(() => items.some((i) => i.baiMau), [items]);

  // Outside click + Escape cho dropdown môn học.
  useEffect(() => {
    if (!ddOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDdOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDdOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [ddOpen]);

  // Đếm item theo môn để hiện count trong dropdown.
  const countByMon = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monHocTabs) m.set(t.tenMonHoc, 0);
    for (const it of items) {
      if (it.tenMonHoc && m.has(it.tenMonHoc)) {
        m.set(it.tenMonHoc, (m.get(it.tenMonHoc) ?? 0) + 1);
      }
    }
    return m;
  }, [items, monHocTabs]);

  const countBaiMau = useMemo(
    () => items.filter((i) => i.baiMau).length,
    [items],
  );

  // Filter + sort.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((it) => {
      if (monFilter && it.tenMonHoc !== monFilter) return false;
      if (workKind === "bai_mau" && !it.baiMau) return false;
      if (!needle) return true;
      const hay = `${it.studentName} ${it.categoryLabel} ${it.tenMonHoc ?? ""}`
        .toLowerCase();
      return hay.includes(needle);
    });
    return [...list].sort(compareGalleryByScoreDesc);
  }, [items, q, monFilter, workKind]);

  const displayed = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  // Reset pagination khi đổi filter.
  useEffect(() => {
    setVisibleCount(itemsPerPage);
    setStaggerFromIndex(0);
  }, [q, monFilter, workKind, itemsPerPage]);

  const filterKey = useMemo(
    () => `q:${q}|mon:${monFilter}|wk:${workKind}`,
    [q, monFilter, workKind],
  );

  const handleLoadMore = useCallback(() => {
    setStaggerFromIndex(visibleCount);
    setVisibleCount((c) => c + itemsPerPage);
  }, [visibleCount, itemsPerPage]);

  const handleStaggerComplete = useCallback(() => {
    setStaggerFromIndex(0);
  }, []);

  const openLightboxByItem = useCallback(
    (item: GalleryDisplayItem) => {
      const idx = filtered.findIndex((it) => it.id === item.id);
      if (idx >= 0) setLightboxIdx(idx);
    },
    [filtered],
  );

  // Lightbox keyboard: Escape / ← / →.
  useEffect(() => {
    if (lightboxIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      else if (e.key === "ArrowLeft") {
        setLightboxIdx((i) => (i != null && i > 0 ? i - 1 : i));
      } else if (e.key === "ArrowRight") {
        setLightboxIdx((i) =>
          i != null && i < filtered.length - 1 ? i + 1 : i,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxIdx, filtered.length]);

  const activeMonLabel = monFilter || "Tất cả";
  const activeMonCount = monFilter
    ? (countByMon.get(monFilter) ?? 0)
    : items.length;

  const hasActiveFilter =
    q.trim() !== "" || monFilter !== "" || workKind !== "all";

  const resetFilters = () => {
    setQ("");
    setMonFilter("");
    setWorkKind("all");
  };

  return (
    <div className="g-body">
      {/* TOOLBAR */}
      <div className="g-toolbar">
        <div className="g-search">
          <Search size={18} className="g-search-icon" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo học viên, môn học…"
            aria-label="Tìm tác phẩm"
          />
          {q && (
            <button
              type="button"
              className="g-search-clear"
              onClick={() => setQ("")}
              aria-label="Xoá tìm kiếm"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {monHocTabs.length > 0 && (
          <div className="g-dd" ref={ddRef}>
            <button
              type="button"
              className={`g-dd-trigger${ddOpen ? " is-open" : ""}${
                monFilter ? " has-value" : ""
              }`}
              onClick={() => setDdOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={ddOpen}
              aria-label="Lọc theo môn học"
            >
              <Filter size={15} strokeWidth={2.4} />
              <span className="g-dd-label">
                Môn: <strong>{activeMonLabel}</strong>
              </span>
              <span className="g-dd-count">· {activeMonCount}</span>
              {monFilter && (
                <span
                  role="button"
                  tabIndex={0}
                  className="g-dd-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMonFilter("");
                    setDdOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      setMonFilter("");
                      setDdOpen(false);
                    }
                  }}
                  aria-label="Bỏ lọc môn học"
                >
                  <X size={12} strokeWidth={2.6} />
                </span>
              )}
              <ChevronDown
                size={15}
                strokeWidth={2.6}
                className="g-dd-chev"
              />
            </button>

            {ddOpen && (
              <div
                className="g-dd-panel"
                role="listbox"
                aria-label="Danh sách môn học"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={!monFilter}
                  className={`g-dd-item${!monFilter ? " is-active" : ""}`}
                  onClick={() => {
                    setMonFilter("");
                    setDdOpen(false);
                  }}
                >
                  <span>Tất cả môn</span>
                  <span className="g-dd-item-count">{items.length}</span>
                </button>
                {monHocTabs.map((t) => {
                  const count = countByMon.get(t.tenMonHoc) ?? 0;
                  const active = monFilter === t.tenMonHoc;
                  return (
                    <button
                      key={t.tenMonHoc}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`g-dd-item${active ? " is-active" : ""}`}
                      onClick={() => {
                        setMonFilter(active ? "" : t.tenMonHoc);
                        setDdOpen(false);
                      }}
                      disabled={count === 0}
                    >
                      <span>{t.label}</span>
                      <span className="g-dd-item-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {hasBaiMau && (
          <div className="g-seg" role="tablist" aria-label="Loại tác phẩm">
            <button
              type="button"
              role="tab"
              aria-selected={workKind === "all"}
              className={`g-seg-btn${workKind === "all" ? " is-active" : ""}`}
              onClick={() => setWorkKind("all")}
            >
              <User size={13} strokeWidth={2.6} />
              Tất cả
              <span className="g-seg-count">{items.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workKind === "bai_mau"}
              className={`g-seg-btn${
                workKind === "bai_mau" ? " is-active" : ""
              }`}
              onClick={() => setWorkKind("bai_mau")}
            >
              <Sparkles size={13} strokeWidth={2.6} />
              Bài mẫu
              <span className="g-seg-count">{countBaiMau}</span>
            </button>
          </div>
        )}
      </div>

      {/* SUMMARY */}
      <div className="g-summary">
        <span>
          Hiện <strong>{filtered.length.toLocaleString("vi-VN")}</strong> tác
          phẩm
          {monFilter ? (
            <>
              {" · môn "}
              <strong>{monFilter}</strong>
            </>
          ) : null}
          {workKind === "bai_mau" ? (
            <>
              {" · chỉ "}
              <strong>bài mẫu</strong>
            </>
          ) : null}
          {q.trim() ? (
            <>
              {" · từ khoá “"}
              <strong>{q.trim()}</strong>
              {"”"}
            </>
          ) : null}
        </span>
        {hasActiveFilter && (
          <button type="button" className="g-reset" onClick={resetFilters}>
            <X size={12} strokeWidth={2.6} />
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* GRID */}
      {filtered.length === 0 ? (
        <div className="g-empty">
          <strong>Không có tác phẩm phù hợp</strong>
          Thử xoá bớt bộ lọc hoặc đổi từ khoá khác.
        </div>
      ) : (
        <GalleryJustifiedRows
          items={displayed}
          onOpen={openLightboxByItem}
          filterKey={filterKey}
          staggerFromIndex={staggerFromIndex}
          onStaggerComplete={handleStaggerComplete}
        />
      )}

      {/* LOAD MORE */}
      {visibleCount < filtered.length && (
        <button type="button" className="g-more" onClick={handleLoadMore}>
          Xem thêm tác phẩm
          <ChevronRight size={15} strokeWidth={2.6} />
        </button>
      )}

      {/* LIGHTBOX */}
      {lightboxIdx != null && typeof document !== "undefined"
        ? createPortal(
            <GalleryLightbox
              items={filtered}
              index={lightboxIdx}
              onClose={() => setLightboxIdx(null)}
              onPrev={() =>
                setLightboxIdx((i) => (i != null && i > 0 ? i - 1 : i))
              }
              onNext={() =>
                setLightboxIdx((i) =>
                  i != null && i < filtered.length - 1 ? i + 1 : i,
                )
              }
            />,
            document.body,
          )
        : null}
    </div>
  );
}

// ============================================================================
// LIGHTBOX
// ============================================================================
function GalleryLightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: GalleryDisplayItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  if (!item) return null;
  const src = item.photo
    ? cfImageForLightbox(item.photo) || item.photo
    : null;
  if (!src) return null;

  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <div
      className="sa-gallery-lb"
      role="dialog"
      aria-modal="true"
      aria-label="Xem tác phẩm"
      onClick={onClose}
    >
      <div
        className="sa-gallery-lb-body"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sa-gallery-lb-stage">
          {!loaded && (
            <div className="sa-gallery-lb-loading">Đang tải…</div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={`Tác phẩm — ${item.studentName}`}
            className="sa-gallery-lb-img"
            decoding="async"
            onLoad={() => setLoaded(true)}
          />
          <button
            type="button"
            className="sa-gallery-lb-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className="sa-gallery-lb-nav sa-gallery-lb-prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={!canPrev}
            aria-label="Tác phẩm trước"
          >
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            className="sa-gallery-lb-nav sa-gallery-lb-next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            disabled={!canNext}
            aria-label="Tác phẩm sau"
          >
            <ChevronRight size={22} strokeWidth={2.6} />
          </button>
          <div className="sa-gallery-lb-counter">
            {index + 1} / {items.length}
          </div>
        </div>

        <aside className="sa-gallery-lb-meta">
          {item.baiMau && (
            <span className="sa-gallery-lb-badge">
              <Star size={11} fill="currentColor" strokeWidth={2} />
              Bài mẫu
            </span>
          )}
          <h3>{item.studentName}</h3>

          <div className="sa-gallery-lb-field">
            <div className="sa-gallery-lb-field-k">Nội dung</div>
            <div className="sa-gallery-lb-field-v">{item.categoryLabel}</div>
          </div>

          {item.tenMonHoc && (
            <div className="sa-gallery-lb-field">
              <div className="sa-gallery-lb-field-k">Môn học</div>
              <div className="sa-gallery-lb-field-v">{item.tenMonHoc}</div>
            </div>
          )}

          {item.score != null && (
            <div className="sa-gallery-lb-field">
              <div className="sa-gallery-lb-field-k">Điểm</div>
              <div className="sa-gallery-lb-field-v">
                {item.score.toLocaleString("vi-VN")}
              </div>
            </div>
          )}

          <div className="sa-gallery-lb-actions">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="sa-gallery-lb-btn"
            >
              Mở ảnh gốc
            </a>
            <button
              type="button"
              className="sa-gallery-lb-btn"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
