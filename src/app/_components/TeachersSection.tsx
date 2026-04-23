"use client";

import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import type { TeacherArtSlide } from "@/types/homepage";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Chỉ cuộn ngang trong container — không dùng scrollIntoView (tránh kéo cả trang dọc tới section). */
function scrollCardCentered(
  container: HTMLElement,
  card: HTMLElement,
  behavior: ScrollBehavior
) {
  const left =
    card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2;
  container.scrollTo({
    left: Math.max(0, left),
    behavior,
  });
}

const AUTO_MS = 4000;

export default function TeachersSection({
  slides,
}: {
  slides: TeacherArtSlide[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [activeDot, setActiveDot] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  /** Đóng lightbox bằng Esc, lock scroll body khi mở */
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

  const slideKey = useMemo(
    () => slides.map((s) => s.id).join("\0"),
    [slides]
  );

  /** 3 bản sao để có thể cuộn loop tay */
  const loopSlides = useMemo(() => {
    if (slides.length === 0) return [];
    if (slides.length === 1) return slides;
    return [...slides, ...slides, ...slides];
  }, [slides]);

  /** Căn bản giữa lúc mount — chỉ scrollLeft, không scrollIntoView */
  useLayoutEffect(() => {
    if (slides.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll(".tc");
    const n = slides.length;
    if (cards.length < n * 3) return;
    indexRef.current = 0;
    setActiveDot(0);
    const midFirst = cards[n] as HTMLElement;
    scrollCardCentered(el, midFirst, "auto");
  }, [slideKey, slides.length]);

  /** Tự cuộn ngang mỗi AUTO_MS — chỉ scrollTo trong container */
  useEffect(() => {
    if (slides.length < 2) return;
    const el = scrollRef.current;
    if (!el) return;

    const tick = () => {
      const cards = el.querySelectorAll(".tc");
      const n = slides.length;
      if (cards.length < n * 3) return;

      const prev = indexRef.current;
      const next = (prev + 1) % n;
      indexRef.current = next;
      setActiveDot(next);

      const target = cards[n + next] as HTMLElement;
      const wrap = prev === n - 1 && next === 0;
      scrollCardCentered(el, target, wrap ? "auto" : "smooth");
    };

    const id = window.setInterval(tick, AUTO_MS);
    return () => window.clearInterval(id);
  }, [slideKey, slides.length]);

  /** Cập nhật dot theo vị trí cuộn ngang */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || slides.length < 2) return;

    const onScroll = () => {
      const cards = el.querySelectorAll(".tc");
      if (cards.length < 2) return;
      const step =
        (cards[1] as HTMLElement).offsetLeft -
        (cards[0] as HTMLElement).offsetLeft;
      if (step <= 0) return;
      const raw = Math.round(el.scrollLeft / step);
      const idx = ((raw % slides.length) + slides.length) % slides.length;
      indexRef.current = idx;
      setActiveDot(idx);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [slideKey, slides.length]);

  return (
    <div className="teacher-wrap" id="giao-vien">
      <div className="sec-label" style={{ padding: "0 12px" }}>
        Giáo viên
      </div>
      {slides.length === 0 ? (
        <p className="teacher-empty">Chưa có ảnh tác phẩm để hiển thị.</p>
      ) : slides.length === 1 ? (
        <div className="teacher-scroll teacher-scroll--single" ref={scrollRef}>
          <div className="tc">
            <button
              type="button"
              className="tc-art-full tc-art-btn"
              aria-label="Xem toàn màn hình tác phẩm của giáo viên"
              onClick={() => setLightboxSrc(slides[0]!.src)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cfImageForThumbnail(slides[0]!.src) || slides[0]!.src}
                alt=""
                className="tc-art-img"
              />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="teacher-scroll" ref={scrollRef}>
            {loopSlides.map((s, i) => (
              <div key={`${s.id}-${i}`} className="tc">
                <button
                  type="button"
                  className="tc-art-full tc-art-btn"
                  aria-label="Xem toàn màn hình tác phẩm của giáo viên"
                  onClick={() => setLightboxSrc(s.src)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cfImageForThumbnail(s.src) || s.src}
                    alt=""
                    className="tc-art-img"
                  />
                </button>
              </div>
            ))}
          </div>
          <div className="teacher-dots">
            {Array.from({ length: slides.length }).map((_, i) => (
              <div
                key={i}
                className={`tdot${i === activeDot ? " active" : ""}`}
              />
            ))}
          </div>
        </>
      )}

      {lightboxSrc && typeof document !== "undefined"
        ? createPortal(
            <div
              className="gallery-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Tác phẩm giáo viên — toàn màn hình"
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
              <div
                className="gallery-lightbox-body"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cfImageForLightbox(lightboxSrc) || lightboxSrc}
                  alt=""
                  className="gallery-lightbox-img"
                  decoding="async"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
