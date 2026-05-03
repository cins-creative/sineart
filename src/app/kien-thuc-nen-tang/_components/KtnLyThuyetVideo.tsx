"use client";

import { YouTubeFacadeFromUrl } from "@/components/YouTubeFacade";

/** Video đầu bài / tham khảo — facade (không nhúng iframe cho đến khi bấm). */
export function KtnLyThuyetVideo({ src, title }: { src: string; title: string }) {
  return (
    <div
      className="bleed break"
      style={{
        padding: 0,
        background: "#000",
        aspectRatio: "16/9",
        position: "relative",
      }}
    >
      <YouTubeFacadeFromUrl url={src} title={title} fillContainer />
    </div>
  );
}
