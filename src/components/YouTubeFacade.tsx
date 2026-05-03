"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { youtubeVideoId } from "@/lib/utils/youtube";

type FacadeProps = {
  videoId: string;
  title?: string;
  className?: string;
  /** Khung cha đã có `aspect-ratio` (vd. Shorts 9:16) — lấp đầy tuyệt đối */
  fillContainer?: boolean;
};

/**
 * Facade YouTube: chỉ tải iframe sau khi người dùng bấm (giảm LCP / JS main thread).
 * Thumbnail từ `i.ytimg.com`; fallback `hqdefault` nếu `maxresdefault` không có.
 */
export function YouTubeFacade({ videoId, title, className, fillContainer }: FacadeProps) {
  const [loaded, setLoaded] = useState(false);
  const [thumbKind, setThumbKind] = useState<"maxresdefault" | "hqdefault">("maxresdefault");

  const onThumbError = useCallback(() => {
    setThumbKind((k) => (k === "maxresdefault" ? "hqdefault" : k));
  }, []);

  const label = title?.trim() || "Video YouTube";

  if (loaded) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={label}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={cn(
          fillContainer ? "absolute inset-0 h-full w-full border-0" : "aspect-video h-auto w-full border-0",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        fillContainer ? "absolute inset-0 h-full w-full cursor-pointer" : "relative aspect-video w-full cursor-pointer",
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`Phát: ${label}`}
      onClick={() => setLoaded(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setLoaded(true);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element — CDN ngoài, không dùng Image để tránh cấu hình domain */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/${thumbKind}.jpg`}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        onError={onThumbError}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f00] shadow-lg ring-2 ring-white/25 transition-transform">
          <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden className="ml-0.5 text-white">
            <polygon points="8,5 8,19 19,12" fill="currentColor" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** URL/embed/watch/shorts/nocookie → facade; không nhận dạng được → `null`. */
export function YouTubeFacadeFromUrl({
  url,
  title,
  className,
  fillContainer,
}: {
  url: string | null | undefined;
  title?: string;
  className?: string;
  fillContainer?: boolean;
}) {
  const id = url?.trim() ? youtubeVideoId(url.trim()) : null;
  if (!id) return null;
  return (
    <YouTubeFacade videoId={id} title={title} className={className} fillContainer={fillContainer} />
  );
}
