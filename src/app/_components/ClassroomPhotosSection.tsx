"use client";

import Image from "next/image";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ClassroomPhotosSection({ urls }: { urls: string[] }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

      <div className="classroom-real-grid">
        {urls.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            className="classroom-real-card"
            aria-label={`Xem ảnh lớp học ${i + 1} — phóng to`}
            onClick={() => setLightboxSrc(src)}
          >
            <span className="classroom-real-media">
              <Image
                src={cfImageForThumbnail(src) || src}
                alt=""
                width={400}
                height={300}
                sizes="(max-width: 640px) 50vw, (max-width: 960px) 33vw, 25vw"
                className="classroom-real-img"
                loading="lazy"
                unoptimized={nextImageShouldUnoptimize(cfImageForThumbnail(src) || src)}
              />
            </span>
          </button>
        ))}
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
