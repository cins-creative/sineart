"use client";

import type { HomeReview } from "@/types/homepage";
import { useCallback, useEffect, useRef, useState } from "react";

const GoogleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

function stars(n: number) {
  return "⭐".repeat(Math.min(5, Math.max(1, n)));
}

/** Chữ cái avatar: tên một từ → 1–2 ký tự; nhiều từ → chữ đầu họ + chữ đầu tên. */
function reviewInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.slice(0, Math.min(2, w.length)).toUpperCase();
  }
  const a = parts[0][0] ?? "";
  const b = parts[parts.length - 1][0] ?? "";
  return `${a}${b}`.toUpperCase();
}

export default function ReviewsSection({ reviews }: { reviews: HomeReview[] }) {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const runTyping = useCallback(
    (startIdx: number) => {
      clearTimer();
      const rv = reviews[startIdx];
      if (!rv) return;
      setIdx(startIdx);
      setTyped("");
      charRef.current = 0;
      const text = rv.text;
      const step = () => {
        if (charRef.current < text.length) {
          charRef.current += 1;
          setTyped(text.slice(0, charRef.current));
          timerRef.current = setTimeout(step, 26);
        } else {
          timerRef.current = setTimeout(() => {
            const next = (startIdx + 1) % reviews.length;
            runTyping(next);
          }, 3500);
        }
      };
      step();
    },
    [reviews]
  );

  useEffect(() => {
    runTyping(0);
    return () => clearTimer();
  }, [runTyping]);

  const rv = reviews[idx];
  if (!reviews.length || !rv) return null;

  return (
    <div className="reviews-wrap">
      <div className="sec-head">
        <div className="sec-head-left">
          <div className="sec-label">Học viên nói gì</div>
          <h2 className="sec-title">
            Câu chuyện từ <em>chính học viên</em>
          </h2>
          <p className="sec-sub">
            Review thực, không chỉnh sửa — lấy trực tiếp từ Google Reviews và Facebook.
          </p>
        </div>
        <div className="gmap-badge">
          <span className="gmap-stars">★★★★★</span> 4.9/5{" "}
          <span style={{ opacity: 0.55, fontWeight: 600 }}>· Google</span>
        </div>
      </div>
      <div className="rv-selector" aria-label="Danh sách học viên đánh giá">
        <div
          className="rv-track"
          style={{ ["--rv-ticker-duration" as string]: `${Math.max(40, reviews.length * 2.4)}s` }}
        >
          {reviews.map((r, i) => (
            <button
              key={`a-${r.id}`}
              type="button"
              className={`rv-pill${i === idx ? " active" : ""}`}
              onClick={() => {
                clearTimer();
                runTyping(i);
              }}
            >
              <span className="rp-av" aria-hidden="true">
                {reviewInitials(r.name)}
              </span>
              {r.name}
            </button>
          ))}
          {/* Bản copy để loop liền mạch — aria-hidden để screen reader không đọc trùng */}
          {reviews.map((r, i) => (
            <button
              key={`b-${r.id}`}
              type="button"
              tabIndex={-1}
              aria-hidden
              className={`rv-pill${i === idx ? " active" : ""}`}
              onClick={() => {
                clearTimer();
                runTyping(i);
              }}
            >
              <span className="rp-av" aria-hidden="true">
                {reviewInitials(r.name)}
              </span>
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <div className="rv-big">
        <div className="rv-head">
          <div
            className="rv-avatar overflow-hidden"
            style={{ background: rv.grad }}
          >
            {rv.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rv.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="rv-avatar-initials">{reviewInitials(rv.name)}</span>
            )}
          </div>
          <div className="rv-meta">
            <div className="rv-name">{rv.name}</div>
            <div className="rv-course">{rv.course}</div>
            <div className="rv-stars">{stars(rv.stars)}</div>
          </div>
          <div className="rv-source">
            <GoogleIcon />
            {rv.source}
          </div>
        </div>
        <div className="rv-text-big">
          <span>{typed}</span>
          <span className="cursor" />
        </div>
        <div className="rv-artwork">
          <div className="rv-aw-tag">{rv.artTag}</div>
        </div>
      </div>
    </div>
  );
}
