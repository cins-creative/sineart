"use client";

import { publicAvatarUrlsForEmail } from "@/lib/hoc-vien/default-avatar";
import { useEffect, useMemo, useRef, useState } from "react";
import "./hoc-vien-avatar.css";

export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

export default function HocVienAvatarEditor({
  storedAvatar,
  email,
  initials,
  uploading,
  onPickFile,
}: {
  storedAvatar: string | undefined;
  email: string;
  initials: string;
  uploading: boolean;
  onPickFile: (file: File) => void | Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const candidates = useMemo(() => {
    const s = storedAvatar?.trim();
    const defaults = publicAvatarUrlsForEmail(email);
    if (s) return [s, ...defaults];
    return defaults;
  }, [storedAvatar, email]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [storedAvatar, email]);

  const url = candidates[idx];
  const showPhoto = url !== undefined;

  return (
    <div className="hvp-avatar-slot">
      <div className="hvp-avatar-wrap">
        <div className="hvp-avatar-inner">
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudflare / unavatar
            <img
              key={url}
              className="hvp-avatar-img"
              src={url}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setIdx((i) => i + 1)}
            />
          ) : (
            <span className="hvp-avatar-fallback">{initials || "HV"}</span>
          )}
          {uploading ? <div className="hvp-avatar-loading">Đang tải…</div> : null}
        </div>
      </div>
      <button
        type="button"
        className="hvp-avatar-fab"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        aria-label="Đổi ảnh đại diện"
        title="Đổi ảnh đại diện"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <input
        ref={fileRef}
        type="file"
        className="hvp-sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onPickFile(f);
        }}
      />
    </div>
  );
}
