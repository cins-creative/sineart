"use client";

import { publicAvatarUrlsForEmail } from "@/lib/hoc-vien/default-avatar";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export type StudentAvatarCircleProps = {
  fullName: string;
  email: string | null;
  storedAvatar?: string | null;
  size?: number;
  className?: string;
};

/**
 * Avatar tròn (ảnh Cloudflare / Unavatar theo email) + fallback gradient giống luồng {@link StudentAvatarMenu},
 * không kèm menu — dùng bảng admin, card, v.v.
 */
export default function StudentAvatarCircle({
  fullName,
  email,
  storedAvatar,
  size = 32,
  className,
}: StudentAvatarCircleProps) {
  const initials = useMemo(() => {
    const n = fullName.trim();
    if (!n) return "";
    return n
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase() ?? "")
      .join("");
  }, [fullName]);

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
  const hue = fullName ? (fullName.charCodeAt(0) * 37) % 360 : 0;

  return (
    <div
      className={cn("shrink-0 overflow-hidden rounded-full ring-2 ring-white/90 shadow-sm", className)}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudflare / unavatar
        <img
          key={url}
          src={url}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-bold leading-none text-white"
          style={{
            fontSize: Math.max(10, Math.round(size * 0.36)),
            background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 40) % 360},55%,45%))`,
          }}
        >
          {initials || "HV"}
        </div>
      )}
    </div>
  );
}
