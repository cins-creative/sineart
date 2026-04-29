"use client";

import type { GalleryDisplayItem } from "@/types/homepage";
import { cfImageForThumbnail } from "@/lib/cfImageUrl";
import { sortGalleryItemsByScoreDesc } from "@/lib/gallery-display-sort";
import justifiedLayout from "justified-layout";
import { gsap } from "gsap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const BOX_GAP = 7;
const TARGET_ROW_H = 200;

type Props = {
  items: GalleryDisplayItem[];
  onOpen: (item: GalleryDisplayItem) => void;
  /** Đổi khi đổi lọc — reset batch & animation */
  filterKey: string;
  /** 0 = animate toàn bộ; >0 = chỉ animate từ index (load thêm) */
  staggerFromIndex: number;
  /** Sau khi stagger append xong, gọi để parent reset index */
  onStaggerComplete?: () => void;
};

export default function GalleryJustifiedRows({
  items,
  onOpen,
  filterKey,
  staggerFromIndex,
  onStaggerComplete,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [aspectById, setAspectById] = useState<Record<string, number>>({});
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastAnimatedItemsKeyRef = useRef<string>("");

  /** Luôn xếp theo điểm (cột `score`) giảm dần trước khi đưa vào justified-layout. */
  const sortedItems = useMemo(() => sortGalleryItemsByScoreDesc(items), [items]);

  const setItemRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  const aspectRatios = useMemo(() => {
    return sortedItems.map((item) => {
      const id = String(item.id);
      const a = aspectById[id];
      return a != null && a > 0 && Number.isFinite(a) ? a : 1;
    });
  }, [sortedItems, aspectById]);

  const geometry = useMemo(() => {
    if (width <= 0 || sortedItems.length === 0) return null;
    return justifiedLayout(aspectRatios, {
      containerWidth: width,
      targetRowHeight: TARGET_ROW_H,
      containerPadding: 0,
      boxSpacing: { horizontal: BOX_GAP, vertical: BOX_GAP },
    });
  }, [width, aspectRatios, sortedItems.length]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    lastAnimatedItemsKeyRef.current = "";
  }, [filterKey]);

  const onImgLoad = useCallback((id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > 0 && h > 0) {
      const ar = w / h;
      setAspectById((prev) => {
        if (prev[id] === ar) return prev;
        return { ...prev, [id]: ar };
      });
    }
  }, []);

  const itemsKey = useMemo(
    () => `${filterKey}|${sortedItems.map((i) => i.id).join(",")}`,
    [filterKey, sortedItems]
  );

  /**
   * GSAP: không liệt kê `geometry` trong deps — reflow khi ảnh load sẽ kill timeline
   * và kết hợp Strict Mode dễ kẹt opacity 0. Chỉ gán `lastAnimatedItemsKeyRef` trong onComplete;
   * cleanup `gsap.set` để không freeze.
   */
  useLayoutEffect(
    () => {
      if (!geometry || sortedItems.length === 0) return;

      if (itemsKey === lastAnimatedItemsKeyRef.current) return;

      const ids = sortedItems.map((i) => String(i.id));
      const els = ids
        .map((id) => itemRefs.current.get(id))
        .filter((n): n is HTMLElement => n != null);

      if (els.length === 0) return;

      const start = staggerFromIndex > 0 ? staggerFromIndex : 0;
      const targets = start === 0 ? els : els.slice(start);
      if (targets.length === 0) return;

      gsap.killTweensOf(targets);

      const appendMode = staggerFromIndex > 0;
      const capturedItemsKey = itemsKey;

      const tl = gsap.timeline({
        onComplete: () => {
          lastAnimatedItemsKeyRef.current = capturedItemsKey;
          if (appendMode) onStaggerComplete?.();
        },
      });

      tl.fromTo(
        targets,
        { opacity: 0, y: 28, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.48,
          stagger: { each: 0.055, from: "start" },
          ease: "power2.out",
        }
      );

      return () => {
        tl.kill();
        gsap.set(targets, {
          opacity: 1,
          y: 0,
          scale: 1,
          clearProps: "transform",
        });
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geometry đọc từ render, bỏ khỏi deps tránh kill khi reflow
    [itemsKey, sortedItems.length, staggerFromIndex, onStaggerComplete, width]
  );

  if (sortedItems.length === 0) return null;

  const showTiles = geometry != null && width > 0;

  return (
    <div
      ref={rootRef}
      className="gallery-justified-root"
      style={
        showTiles && geometry
          ? {
              position: "relative",
              width: "100%",
              minHeight: geometry.containerHeight,
              height: geometry.containerHeight,
            }
          : { minHeight: 220, width: "100%" }
      }
    >
      {!showTiles || !geometry ? (
        <div className="gallery-justified-skeleton" aria-hidden />
      ) : (
        geometry.boxes.map((box, i) => {
          const item = sortedItems[i];
          if (!item) return null;
          const id = String(item.id);
          const thumb = item.photo ? cfImageForThumbnail(item.photo) || item.photo : null;

          return (
            <div
              key={id}
              ref={(el) => setItemRef(id, el)}
              className="gallery-justified-tile"
              style={{
                position: "absolute",
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
              }}
            >
              {thumb ? (
                <button
                  type="button"
                  className="gallery-justified-btn"
                  onClick={() => onOpen(item)}
                  aria-label={`Xem ảnh — ${item.studentName}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={`${item.studentName} – bài ${item.tenMonHoc ?? item.categoryLabel} tại Sine Art`}
                    className="gallery-justified-img"
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => onImgLoad(id, e)}
                  />
                </button>
              ) : (
                <div className="gallery-justified-placeholder" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
