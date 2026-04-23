"use client";

import { useEffect } from "react";

type Props = {
  /** Danh sách id của các section cần spy (thứ tự từ trên xuống). */
  ids: string[];
  /** CSS selector trỏ vào container TOC chứa `<a href="#id">`. */
  tocSelector?: string;
};

/**
 * Scroll-spy cho TOC bài lý thuyết: dùng `IntersectionObserver` để phát
 * hiện section nào đang ở trong viewport (trừ 30% top để phù hợp sticky
 * navbar ~80px), rồi gán class `on` cho TOC link tương ứng.
 *
 * KHÔNG tự gắn `scroll-behavior` — đã set ở CSS (`.ktn-lib` scope).
 * KHÔNG tự scroll khi click anchor — để browser native xử lý.
 *
 * Reduced motion: IntersectionObserver vẫn chạy (chỉ highlight) → ổn.
 */
export default function TocScrollSpy({
  ids,
  tocSelector = ".ktn-lib .rnav .toc2",
}: Props) {
  useEffect(() => {
    if (ids.length === 0) return;

    const toc = document.querySelector(tocSelector);
    if (!toc) return;

    // Map id → anchor element trong TOC (an toàn kể cả khi id có escape char).
    const links = new Map<string, HTMLAnchorElement>();
    for (const id of ids) {
      const a = toc.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(id)}"]`);
      if (a) links.set(id, a);
    }
    if (links.size === 0) return;

    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    let currentId = "";
    const setActive = (id: string) => {
      if (id === currentId) return;
      currentId = id;
      for (const [lid, a] of links) {
        a.classList.toggle("on", lid === id);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        // Pick entry có tỉ lệ lớn nhất đang intersect (tránh nhấp nháy).
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const topEntry = visible[0];
        if (topEntry && topEntry.target instanceof HTMLElement) {
          setActive(topEntry.target.id);
        }
      },
      {
        // Bias 1/3 trên (khớp cảm giác "section đang đọc là cái gần top").
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids, tocSelector]);

  return null;
}
