"use client";

import { useMemo, useState } from "react";

import { parseVideoBaiGiangEntries } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils";

type Props = {
  videoBaiGiang: string | null;
  iframeTitle: string;
};

export default function HeThongBaiTapVideoPanel({ videoBaiGiang, iframeTitle }: Props) {
  const entries = useMemo(() => parseVideoBaiGiangEntries(videoBaiGiang), [videoBaiGiang]);
  const showSwitcher = entries.length >= 2;
  const [active, setActive] = useState(0);

  const safeIdx = entries.length ? Math.min(active, entries.length - 1) : 0;
  const current = entries[safeIdx];

  if (!entries.length) {
    return (
      <div className="htbt-video-area">
        <div className="htbt-video-placeholder">
          Video bài giảng sẽ được gắn khi map <code className="htbt-code">video_bai_giang</code>
        </div>
      </div>
    );
  }

  const embed = current.embed;

  return (
    <>
      {showSwitcher ? (
        <div className="htbt-video-switcher" role="tablist" aria-label="Chọn video bài giảng">
          {entries.map((e, i) => (
            <button
              key={`${e.embed}-${i}`}
              type="button"
              role="tab"
              aria-selected={safeIdx === i}
              onClick={() => setActive(i)}
              className={cn(
                "htbt-video-switcher-btn",
                safeIdx === i && "htbt-video-switcher-btn--active",
              )}
            >
              {e.label.trim() || `Video ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      <div className="htbt-video-area">
        <iframe
          key={embed}
          className="htbt-video-iframe"
          src={embed}
          title={iframeTitle}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </>
  );
}
