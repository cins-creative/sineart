"use client";

import { BookOpen, Images, Share2 } from "lucide-react";
import { useCallback } from "react";

/**
 * CTA chính cho trang chi tiết:
 *   - "Đọc sách" → scroll tới `#flipbook` (nếu có `html_embed`) hoặc tới
 *     `#reader-pages` (nếu chỉ có `img_src_link`).
 *   - "Xem ảnh"  → scroll tới `#reader-pages` (chỉ hiện khi có `img_src_link`).
 *   - "Chia sẻ"  → Web Share API (fallback copy link).
 */
export function EbookDetailReadCTA({
  slug,
  title,
  hasEmbed,
  hasPages,
}: {
  slug: string;
  title: string;
  hasEmbed: boolean;
  hasPages: boolean;
}) {
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleRead = useCallback(() => {
    if (hasEmbed) scrollTo("flipbook");
    else if (hasPages) scrollTo("reader-pages");
  }, [hasEmbed, hasPages, scrollTo]);

  const handleShare = useCallback(async () => {
    const url = `https://sineart.vn/ebook/${slug}`;
    const data = { title, url, text: title };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user hủy → fallthrough */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Đã sao chép link ebook.");
    } catch {
      /* ignore */
    }
  }, [slug, title]);

  const canRead = hasEmbed || hasPages;

  return (
    <div className="ebd-cta-row">
      <button
        type="button"
        className="ebd-btn ebd-btn--primary"
        onClick={handleRead}
        disabled={!canRead}
      >
        <BookOpen size={16} strokeWidth={2.4} />
        Đọc sách
      </button>
      {hasPages && hasEmbed && (
        <button
          type="button"
          className="ebd-btn ebd-btn--ghost"
          onClick={() => scrollTo("reader-pages")}
        >
          <Images size={16} strokeWidth={2.4} />
          Xem ảnh
        </button>
      )}
      <button
        type="button"
        className="ebd-btn ebd-btn--ghost"
        onClick={handleShare}
      >
        <Share2 size={16} strokeWidth={2.4} />
        Chia sẻ
      </button>
    </div>
  );
}
