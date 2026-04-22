"use client";

import { BookOpen, Share2 } from "lucide-react";
import { useCallback } from "react";

/**
 * CTA ở header detail page:
 * - **Đọc sách**: scroll tới `#flipbook` — cả `EbookFlipbook` (khi có
 *   `img_src_link`) và `EbookDetailFlipbook` iframe (fallback) đều dùng
 *   cùng id này.
 * - **Chia sẻ**: Web Share API + fallback copy link.
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
  const handleRead = useCallback(() => {
    const el = document.getElementById("flipbook");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleShare = useCallback(async () => {
    const url = `https://sineart.vn/ebook/${slug}`;
    const data = { title, url, text: title };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user hủy → fallthrough sang copy */
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
