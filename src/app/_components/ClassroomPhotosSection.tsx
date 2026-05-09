"use client";

import Image from "next/image";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** px/giây — chỉnh tốc độ ticker */
const TICKER_SPEED_PX = 42;

export default function ClassroomPhotosSection({ urls }: { urls: string[] }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [halfLoopPx, setHalfLoopPx] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const loopUrls = urls.length > 0 ? [...urls, ...urls] : [];

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || urls.length === 0) {
      setHalfLoopPx(0);
      return;
    }
    const measure = () => {
      const w = el.scrollWidth;
      setHalfLoopPx(w > 0 ? w / 2 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [urls]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxSrc]);

  if (urls.length === 0) return null;

  const durationSec =
    halfLoopPx > 0 ? Math.max(14, halfLoopPx / TICKER_SPEED_PX) : 20;
  const runTicker = !prefersReducedMotion && halfLoopPx > 0;

  return (
    <section className="classroom-real-wrap" id="lop-thuc-te" aria-labelledby="classroom-real-heading">
      <div className="sec-label" style={{ padding: "0 12px" }}>
        Hình ảnh lớp học
      </div>
      <h2 id="classroom-real-heading" className="classroom-real-title">
        Không gian học <em>thực tế</em>
      </h2>
      <p className="classroom-real-sub">
        Ảnh chụp tại lớp — cập nhật từ Sine Art cơ sở 67 Tân Sơn Nhì, Q. Tân Phú
      </p>

      <div className="classroom-real-ticker-mask">
        <div
          key={urls.join("\0")}
          ref={trackRef}
          className={`classroom-real-ticker-track${runTicker ? " classroom-real-ticker-track--run" : ""}`}
          style={
            runTicker
              ? ({
                  ["--cr-ticker-duration" as string]: `${durationSec}s`,
                } as CSSProperties)
              : undefined
          }
        >
          {loopUrls.map((src, i) => (
            <TickerSlide
              key={`${src}-${i}`}
              src={src}
              labelIndex={(i % urls.length) + 1}
              onOpen={() => setLightboxSrc(src)}
            />
          ))}
        </div>
      </div>

      {lightboxSrc && typeof document !== "undefined"
        ? createPortal(
            <div
              className="gallery-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Ảnh lớp học — toàn màn hình"
              onClick={() => setLightboxSrc(null)}
            >
              <button
                type="button"
                className="gallery-lightbox-close"
                aria-label="Đóng"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxSrc(null);
                }}
              >
                ×
              </button>
              <div className="gallery-lightbox-body" onClick={(e) => e.stopPropagation()}>
                <Image
                  src={cfImageForLightbox(lightboxSrc) || lightboxSrc}
                  alt=""
                  width={1400}
                  height={1050}
                  className="gallery-lightbox-img"
                  decoding="async"
                  priority
                  unoptimized={nextImageShouldUnoptimize(
                    cfImageForLightbox(lightboxSrc) || lightboxSrc,
                  )}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function TickerSlide({
  src,
  labelIndex,
  onOpen,
}: {
  src: string;
  labelIndex: number;
  onOpen: () => void;
}) {
  const thumb = cfImageForThumbnail(src) || src;
  return (
    <button
      type="button"
      className="classroom-real-slide"
      aria-label={`Xem ảnh lớp học ${labelIndex} — phóng to`}
      onClick={onOpen}
    >
      <span className="classroom-real-slide-media">
        <Image
          src={thumb}
          alt=""
          width={1600}
          height={1200}
          sizes="(max-width: 640px) 78vw, 450px"
          className="classroom-real-slide-img"
          loading="lazy"
          unoptimized={nextImageShouldUnoptimize(thumb)}
        />
      </span>
    </button>
  );
}
