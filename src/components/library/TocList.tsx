"use client";

import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  label: string;
}

interface Props {
  /** Optional manual TOC. Nếu bỏ trống → auto-discover từ `.body .div-sec`. */
  items?: TocItem[];
}

/** TOC list với scroll-spy. Tự động extract heading từ `.div-sec`. */
export default function TocList({ items: manualItems }: Props) {
  const [items, setItems] = useState<TocItem[]>(manualItems ?? []);
  const [activeId, setActiveId] = useState<string>("");

  /* Auto-discover headings nếu items rỗng */
  useEffect(() => {
    if (manualItems && manualItems.length) {
      setItems(manualItems);
      return;
    }
    const root = document.querySelector<HTMLElement>(".ktn-lib .main .body");
    if (!root) return;
    const secs = Array.from(root.querySelectorAll<HTMLElement>(".div-sec"));
    const collected: TocItem[] = [];
    secs.forEach((sec, idx) => {
      const id = sec.id || `sec-${idx + 1}`;
      if (!sec.id) sec.id = id;
      const titleEl =
        sec.querySelector<HTMLElement>(".div-title") ||
        sec.querySelector<HTMLElement>(".div-kicker");
      const label = titleEl?.textContent?.trim();
      if (label) collected.push({ id, label });
    });
    setItems(collected);
  }, [manualItems]);

  /* Scroll-spy — chọn section cuối cùng đã "passed" ngưỡng offset-from-top.
     Lý do không dùng IntersectionObserver: `.div-sec` chỉ cao vài chục px nên
     khi user đọc đoạn văn dài giữa 2 heading, không heading nào đang intersect
     → không highlight. Dùng scroll position + getBoundingClientRect ổn định hơn
     cho bài có section header ngắn + content dài. */
  useEffect(() => {
    if (!items.length) return;
    const targets = items
      .map((t) => ({ id: t.id, el: document.getElementById(t.id) }))
      .filter((t): t is { id: string; el: HTMLElement } => !!t.el);
    if (!targets.length) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      // Offset = sticky navbar (72px) + breathing room (68px).
      const OFFSET = 140;
      let active = targets[0].id;
      for (const { id, el } of targets) {
        if (el.getBoundingClientRect().top - OFFSET <= 0) active = id;
        else break;
      }
      // Edge case: đã cuộn gần cuối trang → highlight section cuối cùng
      // dù heading của nó có thể đã nằm gần đáy viewport.
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 120) active = targets[targets.length - 1].id;
      setActiveId(active);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <ul className="toc-list">
      {items.map((t) => (
        <li key={t.id} className={t.id === activeId ? "active" : ""}>
          {/* Số thứ tự do CSS counter tự chèn qua ::before → không hardcode ở đây
              để giữ component tái sử dụng được với bất kỳ styling layer nào. */}
          <a href={`#${t.id}`}>{t.label}</a>
        </li>
      ))}
    </ul>
  );
}
