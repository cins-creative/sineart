"use client";

import { useEffect, useRef, useState } from "react";

type Heading = { id: string; text: string };

export function BlogToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current?.disconnect();

    const map = new Map<string, number>();
    headings.forEach((h, i) => map.set(h.id, i));

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Mục lục bài viết">
      <div className="blog-sb-section-label">Mục lục</div>
      <div className="blog-toc">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`blog-toc-item${h.id === active ? " blog-toc-item--active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              setActive(h.id);
            }}
          >
            {h.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
