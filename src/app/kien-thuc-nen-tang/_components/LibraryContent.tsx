"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Raw HTML từ cột `dt_ly_thuyet_nen_tang.content` (đã inject H2 ids). */
  html: string;
};

/**
 * Client wrapper cho phần article body. Cần thiết vì HTML admin nhập có
 * `onmouseover="showPanel('el01')"` inline handler → trong SSR / server
 * component attribute này không gắn listener. Component này:
 *
 * 1. Render HTML qua `dangerouslySetInnerHTML` (admin trust content).
 * 2. Đăng ký `window.showPanel(id)` global để inline handler gọi được.
 * 3. Swap class `.active` trên `.panel-slide[data-slide=id]` và dim các
 *    item không được hover.
 * 4. Cleanup listener + global khi unmount hoặc `html` đổi.
 *
 * Scope: chỉ query trong `containerRef` — nhiều section `.el-list-hover`
 * trong cùng bài (hoặc nhiều bài cùng lúc nếu có nested) không conflict.
 */
export default function LibraryContent({ html }: Props) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    /* Global function cho inline `onmouseover="showPanel('elXX')"`. */
    const showPanel = (id: string) => {
      if (!root) return;

      const panels = root.querySelectorAll<HTMLElement>(".panel-slide");
      panels.forEach((p) => p.classList.remove("active"));

      const target = root.querySelector<HTMLElement>(
        `[data-slide="${CSS.escape(id)}"]`
      );
      if (target) target.classList.add("active");

      const items = root.querySelectorAll<HTMLElement>(".el-hover-item");
      items.forEach((i) => {
        i.style.opacity = "0.5";
      });
      const activeItem = root.querySelector<HTMLElement>(
        `[data-target="${CSS.escape(id)}"]`
      );
      if (activeItem) activeItem.style.opacity = "1";
    };

    (window as unknown as { showPanel?: (id: string) => void }).showPanel =
      showPanel;

    /* Reset dim khi chuột rời khỏi list. */
    const handleMouseLeave = (e: Event) => {
      const list = e.currentTarget as HTMLElement;
      const items = list.querySelectorAll<HTMLElement>(".el-hover-item");
      items.forEach((i) => {
        i.style.opacity = "1";
      });
    };

    const lists = Array.from(
      root.querySelectorAll<HTMLElement>(".el-list-hover-items")
    );
    lists.forEach((l) => l.addEventListener("mouseleave", handleMouseLeave));

    return () => {
      lists.forEach((l) =>
        l.removeEventListener("mouseleave", handleMouseLeave)
      );
      const w = window as unknown as { showPanel?: unknown };
      if (w.showPanel === showPanel) delete w.showPanel;
    };
  }, [html]);

  return (
    <article
      ref={containerRef}
      className="ktn-lib-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
