"use client";

import { useEffect, useState } from "react";

/** Hiển thị % đã đọc dựa trên scroll position vs chiều cao tài liệu. */
export default function ReadingProgress({ docMin = 12 }: { docMin?: number }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const tick = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) return setPct(100);
      const p = Math.min(100, Math.max(0, (doc.scrollTop / total) * 100));
      setPct(Math.round(p));
    };
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);

  const remainingMin = Math.max(0, Math.round((docMin * (100 - pct)) / 100));

  return (
    <div className="rnav-progress">
      <div className="rnav-progress-bar">
        <div className="rnav-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="rnav-progress-text">
        <span>{pct}% đã đọc</span>
        <span>còn ~{remainingMin} phút</span>
      </p>
    </div>
  );
}
