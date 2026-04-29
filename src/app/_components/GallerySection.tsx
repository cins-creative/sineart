"use client";

import type {
  GalleryDisplayItem,
  GalleryMonHocFilter,
  GalleryMonHocTab,
} from "@/types/homepage";
import { compareGalleryByScoreDesc } from "@/lib/gallery-display-sort";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import GalleryJustifiedRows from "./GalleryJustifiedRows";

export type GalleryLayoutVariant = "masonry" | "justified";
export type GalleryTabMode = "mon_hoc" | "work_kind";

type WorkKindFilter = "bai_mau" | "tham_khao";

function itemMatchesWorkKind(item: GalleryDisplayItem, kind: WorkKindFilter): boolean {
  return kind === "bai_mau" ? item.baiMau : !item.baiMau;
}

function galleryMotionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function GalleryCard({
  item,
  onOpen,
  index,
}: {
  item: GalleryDisplayItem;
  onOpen: (item: GalleryDisplayItem) => void;
  /** Masonry: trễ fly-in theo thứ tự (CSS `--gallery-mi-delay`). */
  index?: number;
}) {
  const cls = `mi mi-${item.mi}`;
  const staggerStyle: CSSProperties | undefined =
    index != null && index >= 0
      ? { ["--gallery-mi-delay" as string]: `${Math.min(index, 48) * 0.034 + 0.02}s` }
      : undefined;

  const onMiPointerMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (galleryMotionReduced()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const w = r.width || 1;
    const nx = ((e.clientX - r.left) / w - 0.5) * 2;
    el.style.setProperty("--mi-tilt", (nx * 5.5).toFixed(2));
    el.style.setProperty("--mi-pan", `${(nx * 12).toFixed(1)}px`);
  }, []);

  const onMiPointerLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--mi-tilt", "0");
    el.style.setProperty("--mi-pan", "0px");
  }, []);

  const artworkAlt = `${item.studentName} – bài ${item.tenMonHoc ?? item.categoryLabel} tại Sine Art`;

  const inner = (
    <div className="mi-ph">
      {item.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cfImageForThumbnail(item.photo) || item.photo}
          alt={artworkAlt}
          className="mi-ph-img"
          loading="lazy"
        />
      ) : (
        <div
          className="mi-sh"
          style={{
            width: 56,
            height: 56,
            top: "18%",
            left: "14%",
          }}
        />
      )}
    </div>
  );

  const catAttr = item.tenMonHoc ?? "";

  if (item.photo) {
    return (
      <button
        type="button"
        className={cls}
        style={staggerStyle}
        data-ten-mon-hoc={catAttr}
        onClick={() => onOpen(item)}
        onMouseMove={onMiPointerMove}
        onMouseLeave={onMiPointerLeave}
        aria-label={`Xem ảnh — ${item.studentName}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cls} style={staggerStyle} data-ten-mon-hoc={catAttr}>
      {inner}
    </div>
  );
}

function itemMatchesMonFilter(
  item: GalleryDisplayItem,
  filter: GalleryMonHocFilter
): boolean {
  if (filter === "all") return true;
  if (item.tenMonHoc == null) return false;
  return item.tenMonHoc === filter;
}

type Props = {
  items: GalleryDisplayItem[];
  monHocTabs: GalleryMonHocTab[];
  /** Mặc định giống trang chủ — trang `/gallery` dùng "Bài học viên". */
  sectionTitle?: string;
  /** Trang `/gallery`: `h1` cho SEO; trang chủ: `div` (Hero đã có `h1`). */
  sectionTitleAs?: "div" | "h1";
  /** `id` trên `.gallery-wrap` — SEO/anchor; trang gallery dùng `bai-hoc-vien`. */
  galleryWrapId?: string;
  /** Trang chủ: nút «Xem thêm» (placeholder). Trang gallery: ẩn. */
  showFooterCta?: boolean;
  /** Trang chủ / gallery: tab theo môn. Trang bài tập: Bài mẫu / Bài tham khảo (`baiMau`). */
  tabMode?: GalleryTabMode;
  /** Ẩn tiêu đề `.sec-label` (khi đã có tiêu đề khối ngoài, vd. «Mở rộng»). */
  showSectionTitle?: boolean;
  /** Gắn thêm class lên `.home-gallery` (vd. `htbt-work-gallery`). */
  rootClassName?: string;
  /** Trang `/gallery`: justified rows + phân trang; mặc định masonry (trang chủ). */
  layoutVariant?: GalleryLayoutVariant;
  /** Số ô mỗi lần khi `layoutVariant="justified"` (mặc định 40). */
  itemsPerPage?: number;
};

export default function GallerySection({
  items,
  monHocTabs,
  sectionTitle = "Tác phẩm học viên",
  sectionTitleAs = "div",
  galleryWrapId = "tac-pham",
  showFooterCta = true,
  tabMode = "mon_hoc",
  showSectionTitle = true,
  rootClassName,
  layoutVariant = "masonry",
  itemsPerPage = 40,
}: Props) {
  const [filter, setFilter] = useState<GalleryMonHocFilter>("all");
  const [workKind, setWorkKind] = useState<WorkKindFilter>("bai_mau");
  const [lightbox, setLightbox] = useState<GalleryDisplayItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);
  const [staggerFromIndex, setStaggerFromIndex] = useState(0);

  const hasBaiMau = useMemo(() => items.some((i) => i.baiMau), [items]);
  const hasThamKhao = useMemo(() => items.some((i) => !i.baiMau), [items]);
  const showWorkKindTabs = tabMode === "work_kind" && hasBaiMau && hasThamKhao;

  useLayoutEffect(() => {
    if (tabMode !== "work_kind") return;
    if (!hasBaiMau && !hasThamKhao) return;
    if (!hasBaiMau && workKind === "bai_mau") setWorkKind("tham_khao");
    else if (!hasThamKhao && workKind === "tham_khao") setWorkKind("bai_mau");
  }, [tabMode, hasBaiMau, hasThamKhao, workKind]);

  useEffect(() => {
    if (layoutVariant !== "justified") return;
    setVisibleCount(itemsPerPage);
    setStaggerFromIndex(0);
  }, [layoutVariant, itemsPerPage, filter, workKind, tabMode]);

  const galleryFilterKey = useMemo(
    () =>
      tabMode === "work_kind"
        ? `wk:${workKind}`
        : `mh:${filter}`,
    [tabMode, workKind, filter]
  );

  const handleLoadMoreJustified = useCallback(() => {
    setStaggerFromIndex(visibleCount);
    setVisibleCount((c) => c + itemsPerPage);
  }, [visibleCount, itemsPerPage]);

  const handleStaggerComplete = useCallback(() => {
    setStaggerFromIndex(0);
  }, []);

  const visibleItemsSorted = useMemo(() => {
    const filtered =
      tabMode === "work_kind"
        ? items.filter((item) => itemMatchesWorkKind(item, workKind))
        : items.filter((item) => itemMatchesMonFilter(item, filter));
    return [...filtered].sort(compareGalleryByScoreDesc);
  }, [items, filter, tabMode, workKind]);

  const displayedItems = useMemo(() => {
    if (layoutVariant !== "justified") return visibleItemsSorted;
    return visibleItemsSorted.slice(0, visibleCount);
  }, [layoutVariant, visibleItemsSorted, visibleCount]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  return (
    <div className={["home-gallery", rootClassName].filter(Boolean).join(" ")}>
      <div className="gallery-wrap" id={galleryWrapId}>
        {showSectionTitle ? (
          <div className="sec-head sec-head--align-start">
            <div className="sec-head-left">
              {sectionTitleAs === "h1" ? (
                <h1 className="sec-label gallery-sec-title">{sectionTitle}</h1>
              ) : (
                <div className="sec-label gallery-sec-title">{sectionTitle}</div>
              )}
              <h2 className="sec-title">
                Tác phẩm từ lớp — <em>không chỉnh sửa</em>
              </h2>
              <p className="sec-sub">
                Tất cả bài vẽ đều do học viên Sine Art thực hiện trong khoá học. Chọn theo thể
                loại để xem chi tiết.
              </p>
            </div>
          </div>
        ) : null}
        {tabMode === "work_kind" && !showWorkKindTabs ? null : (
          <div className="gtabs">
            {tabMode === "work_kind" ? (
              <>
                {hasBaiMau ? (
                  <button
                    type="button"
                    className={`gtab${workKind === "bai_mau" ? " active" : ""}`}
                    onClick={() => setWorkKind("bai_mau")}
                  >
                    Bài mẫu
                  </button>
                ) : null}
                {hasThamKhao ? (
                  <button
                    type="button"
                    className={`gtab${workKind === "tham_khao" ? " active" : ""}`}
                    onClick={() => setWorkKind("tham_khao")}
                  >
                    Bài tham khảo
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`gtab${filter === "all" ? " active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  ✦ Tất cả
                </button>
                {monHocTabs.map((t) => (
                  <button
                    key={t.tenMonHoc}
                    type="button"
                    className={`gtab${filter === t.tenMonHoc ? " active" : ""}`}
                    onClick={() => setFilter(t.tenMonHoc)}
                  >
                    {t.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        {visibleItemsSorted.length === 0 ? (
          <p className="gallery-inline-empty">
            {tabMode === "work_kind"
              ? "Chưa có tranh trong loại này cho bài tập này."
              : "Chưa có tác phẩm phù hợp bộ lọc."}
          </p>
        ) : layoutVariant === "justified" ? (
          <GalleryJustifiedRows
            items={displayedItems}
            onOpen={setLightbox}
            filterKey={galleryFilterKey}
            staggerFromIndex={staggerFromIndex}
            onStaggerComplete={handleStaggerComplete}
          />
        ) : (
          <div className="masonry">
            {visibleItemsSorted.map((item, i) => (
              <GalleryCard key={item.id} item={item} index={i} onOpen={setLightbox} />
            ))}
          </div>
        )}
        {layoutVariant === "justified" &&
        visibleCount < visibleItemsSorted.length ? (
          <button
            type="button"
            className="gallery-more"
            onClick={handleLoadMoreJustified}
          >
            Xem thêm tác phẩm →
          </button>
        ) : showFooterCta && layoutVariant !== "justified" ? (
          <Link
            href="/gallery"
            className="gallery-more"
            prefetch={false}
            aria-label="Mở trang Gallery — xem thêm tác phẩm"
          >
            Xem thêm tác phẩm →
          </Link>
        ) : null}
      </div>

      {lightbox?.photo && typeof document !== "undefined"
        ? createPortal(
            <div
              className="gallery-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Ảnh tác phẩm"
              onClick={() => setLightbox(null)}
            >
              <button
                type="button"
                className="gallery-lightbox-close"
                aria-label="Đóng"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(null);
                }}
              >
                ×
              </button>
              <div
                className="gallery-lightbox-body"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cfImageForLightbox(lightbox.photo) || lightbox.photo}
                  alt=""
                  className="gallery-lightbox-img"
                  decoding="async"
                />
                <div className="gallery-lightbox-meta">
                  {lightbox.baiMau ? (
                    <div className="gallery-lightbox-badge">✦ Bài mẫu</div>
                  ) : null}
                  <div className="gallery-lightbox-name">
                    {lightbox.studentName}
                  </div>
                  <div className="gallery-lightbox-cat">
                    {lightbox.categoryLabel}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
