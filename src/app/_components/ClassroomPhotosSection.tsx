"use client";

import Image from "next/image";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function splitTwoRows(urls: string[]): { top: string[]; bottom: string[] } {
  if (urls.length === 0) return { top: [], bottom: [] };
  const mid = Math.ceil(urls.length / 2);
  let top = urls.slice(0, mid);
  let bottom = urls.slice(mid);
  /* Một ảnh: hai hàng cùng nội dung để vẫn có hiệu ứng đối chiều */
  if (bottom.length === 0 && top.length > 0) {
    bottom = [...top];
  }
  if (top.length === 0 && bottom.length > 0) {
    top = [...bottom];
  }
  return { top, bottom };
}

function TickerRow({
  items,
  direction,
  durationSec,
  onPick,
}: {
  items: string[];
  direction: "ltr" | "rtl";
  durationSec: number;
  onPick: (src: string) => void;
}) {
  if (items.length === 0) return null;

  const trackClass =
    direction === "ltr"
      ? "classroom-real-ticker-track classroom-real-ticker-track--pan-ltr"
      : "classroom-real-ticker-track classroom-real-ticker-track--pan-rtl";

  const renderGroup = (gid: "x" | "y") =>
    items.map((src, i) => {
      const thumb = cfImageForThumbnail(src) || src;
      return (
        <button
          key={`${gid}-${src}-${i}`}
          type="button"
          className="classroom-real-card classroom-real-ticker-card"
          aria-label={`Xem ảnh lớp học ${i + 1} — phóng to`}
          onClick={() => onPick(src)}
        >
          <span className="classroom-real-media">
            <Image
              src={thumb}
              alt=""
              width={280}
              height={210}
              sizes="220px"
              className="classroom-real-img"
              loading="lazy"
              unoptimized={nextImageShouldUnoptimize(thumb)}
            />
          </span>
        </button>
      );
    });

  return (
    <div className="classroom-real-ticker-row">
      <div className={trackClass} style={{ animationDuration: `${durationSec}s` }}>
        <div className="classroom-real-ticker-group">{renderGroup("x")}</div>
        <div className="classroom-real-ticker-group" aria-hidden="true">
          {renderGroup("y")}
        </div>
      </div>
    </div>
  );
}

export default function ClassroomPhotosSection({ urls }: { urls: string[] }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const { top, bottom } = useMemo(() => splitTwoRows(urls), [urls]);

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

  return (
    <section className="classroom-real-wrap" id="lop-thuc-te" aria-labelledby="classroom-real-heading">
      <div className="sec-label" style={{ padding: "0 12px" }}>
        Hình ảnh lớp học
      </div>
      <h2 id="classroom-real-heading" className="classroom-real-title">
        Không gian học <em>thực tế</em>
      </h2>
      <p className="classroom-real-sub">
        Ảnh chụp tại lớp — cập nhật từ ban Đào tạo Sine Art.
      </p>

      <div className="classroom-real-ticker" role="list" aria-label="Ảnh lớp học chạy ngang">
        {/* Trên: trái → phải — class pan-rtl (keyframes -50% → 0). Dưới: phải → trái — pan-ltr */}
        <TickerRow
          items={top}
          direction="rtl"
          durationSec={56}
          onPick={setLightboxSrc}
        />
        <TickerRow
          items={bottom}
          direction="ltr"
          durationSec={48}
          onPick={setLightboxSrc}
        />
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
