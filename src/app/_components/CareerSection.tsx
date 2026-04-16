"use client";

import type { CareerCard } from "@/types/career";
import { useCallback, useEffect, useRef } from "react";

function CareerCardLinks({
  careers,
  suffix,
}: {
  careers: CareerCard[];
  suffix: string;
}) {
  return (
    <>
      {careers.map((c, i) => (
        <a
          key={`${suffix}-${c.slug}-${i}`}
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          className="cc"
          style={{ background: c.tint }}
          data-career-card-link
        >
          <div
            className={`cc-art${c.imageUrl ? " cc-art--has-img" : ""}`}
          >
            {c.imageUrl ? (
              <img
                className="cc-art-img"
                src={c.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ) : null}
            <div className="ca-bg" style={{ background: c.grad }} aria-hidden />
            <div
              className="ca-sh"
              style={{ width: 60, height: 60, top: -14, right: -14 }}
            />
            {!c.imageUrl ? (
              <span className="cc-art-emoji" aria-hidden>
                {c.emoji}
              </span>
            ) : null}
          </div>
          <div className="cc-info">
            <div className="cc-title">{c.title}</div>
            <div className="cc-sub">{c.sub}</div>
            <div className="cc-arrow">→</div>
          </div>
        </a>
      ))}
    </>
  );
}

type Props = {
  careers: CareerCard[];
};

export default function CareerSection({ careers }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstChunkRef = useRef<HTMLDivElement>(null);
  const pauseAutoRef = useRef(false);
  const drag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    pauseAutoRef.current = true;
    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.scrollLeft - dx;
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const moved = drag.current.moved;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      el.style.cursor = "";
    }
    drag.current.active = false;
    drag.current.moved = false;
    pauseAutoRef.current = false;
    if (moved) {
      document.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        },
        { capture: true, once: true }
      );
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [careers]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches || careers.length === 0) return;

    const rafIdRef = { current: 0 };
    const speed = 0.45;

    const loopStride = (): number => {
      const first = firstChunkRef.current;
      const second = first?.nextElementSibling;
      if (second instanceof HTMLElement) return second.offsetLeft;
      const el = scrollRef.current;
      return el ? el.scrollWidth / 2 : 0;
    };

    const tick = () => {
      const el = scrollRef.current;
      if (!el) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      if (pauseAutoRef.current || drag.current.active || document.hidden) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      const stride = loopStride();
      if (stride <= 0) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      el.scrollLeft += speed;
      if (el.scrollLeft >= stride - 0.5) {
        el.scrollLeft -= stride;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [careers]);

  return (
    <div className="career-wrap">
      <div className="sec-label">Ngành học</div>
      <div className="career-intro">
        <div className="career-intro-eyebrow">✦ Powered by CINS.vn</div>
        <div className="career-intro-title">Ngành đại học gắn với năng khiếu mỹ thuật</div>
        <div className="career-intro-text">
          Mỗi ngành có mã xét tuyển và mô tả riêng — xem nhanh tên ngành, mã ngành và ảnh minh họa
          từ thư viện CINS (ngành học đại học).
        </div>
        <a
          href="https://cins.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="career-cins-link"
        >
          Khám phá tại CINS.vn →
        </a>
      </div>
      <div
        ref={scrollRef}
        className="career-cards career-cards-drag-scroll"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="region"
        aria-label="Danh sách ngành học — tự cuộn và kéo để xem"
      >
        <div className="career-scroll-row">
          <div className="career-scroll-chunk" ref={firstChunkRef}>
            <CareerCardLinks careers={careers} suffix="a" />
          </div>
          <div className="career-scroll-chunk career-scroll-chunk--dup" aria-hidden>
            <CareerCardLinks careers={careers} suffix="b" />
          </div>
        </div>
      </div>
    </div>
  );
}
