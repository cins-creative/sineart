"use client";

/**
 * Hero block cho /tong-hop-de-thi/[slug].
 *
 * Layout 1 cột (full width của `.bd-main`):
 *   1) Tiêu đề + badges (môn / năm / mẫu / trường) + excerpt
 *   2) Ảnh đề thi CỠ LỚN — click để mở fullscreen lightbox.
 *
 * Lightbox dùng lại class `.gallery-lightbox*` đã có trong sineart-home.css
 * (global) → không cần thêm CSS.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cfImageForLightbox } from "@/lib/cfImageUrl";
import { monAccent } from "@/lib/data/de-thi-shared";

type Props = {
  title: string;
  mon: string[];
  nam: number | null;
  loaiMau: string[];
  truongNames: string[];
  excerpt?: string | null;
  heroSrc: string | null;
  heroAlt: string;
};

export function DeThiHero({
  title,
  mon,
  nam,
  loaiMau,
  truongNames,
  excerpt,
  heroSrc,
  heroAlt,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="bd-dt-hero">
      <header className="bd-dt-hero-head">
        <h1 className="bd-h1 bd-dt-title">{title}</h1>
        <div className="bd-dt-badges">
          {mon.map((m) => (
            <span
              key={`m-${m}`}
              className="bd-dt-badge bd-dt-badge--mon"
              style={{ background: monAccent(m) }}
            >
              {m}
            </span>
          ))}
          {nam != null && (
            <span className="bd-dt-badge bd-dt-badge--year">Năm {nam}</span>
          )}
          {loaiMau.map((m) => (
            <span key={`mau-${m}`} className="bd-dt-badge bd-dt-badge--mau">
              Mẫu {m}
            </span>
          ))}
          {truongNames.map((ten) => (
            <span key={`tr-${ten}`} className="bd-dt-badge bd-dt-badge--tr">
              {ten}
            </span>
          ))}
        </div>
        {excerpt ? <p className="bd-dt-excerpt">{excerpt}</p> : null}
      </header>

      {heroSrc ? (
        <button
          type="button"
          className="bd-dt-hero-img"
          onClick={() => setOpen(true)}
          aria-label="Xem đề thi ở chế độ toàn màn hình"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroSrc} alt={heroAlt} loading="eager" />
          <span className="bd-dt-hero-zoom" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
            Phóng to
          </span>
        </button>
      ) : (
        <div className="bd-dt-hero-img bd-dt-hero-img--empty">
          <div className="ph">{title}</div>
        </div>
      )}

      {open && heroSrc && typeof document !== "undefined"
        ? createPortal(
            <div
              className="gallery-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label={`${title} — toàn màn hình`}
              onClick={() => setOpen(false)}
            >
              <button
                type="button"
                className="gallery-lightbox-close"
                aria-label="Đóng"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
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
                  src={cfImageForLightbox(heroSrc) || heroSrc}
                  alt={heroAlt}
                  className="gallery-lightbox-img"
                  decoding="async"
                />
                <div className="gallery-lightbox-meta">
                  <div className="gallery-lightbox-name">{title}</div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
