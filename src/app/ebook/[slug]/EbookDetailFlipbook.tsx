"use client";

import { Expand, Minimize } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Render flipbook embed HTML (`mkt_ebooks.html_embed`) trong iframe wrapper.
 *
 * - `dangerouslySetInnerHTML` vì `html_embed` là admin-controlled (trust),
 *   thường là `<iframe src="https://heyzine.com/flip-book/...">`.
 * - Nút **Fullscreen** dùng Fullscreen API để người đọc có trải nghiệm đọc
 *   sách toàn màn hình (container tự động fill viewport).
 * - CSS ở `EbookDetailStyles` force iframe `width:100%;height:100%` nên mọi
 *   flipbook tool (Heyzine, FlipHTML5, Issuu…) đều render đúng.
 */
export function EbookDetailFlipbook({ htmlEmbed }: { htmlEmbed: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.error("[ebook] fullscreen error", err);
    }
  };

  return (
    <section
      id="flipbook"
      className={`ebd-flipbook${isFullscreen ? " is-fullscreen" : ""}`}
      aria-label="Đọc sách (flipbook)"
    >
      <div className="ebd-flipbook-wrap" ref={wrapRef}>
        <div
          className="ebd-flipbook-embed"
          dangerouslySetInnerHTML={{ __html: htmlEmbed }}
        />
        <button
          type="button"
          className="ebd-flipbook-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Đọc toàn màn hình"}
          title={isFullscreen ? "Thoát toàn màn hình" : "Đọc toàn màn hình"}
        >
          {isFullscreen ? (
            <Minimize size={18} strokeWidth={2.2} />
          ) : (
            <Expand size={18} strokeWidth={2.2} />
          )}
        </button>
      </div>
    </section>
  );
}
