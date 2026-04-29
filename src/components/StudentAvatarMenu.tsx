"use client";

import { publicAvatarUrlsForEmail } from "@/lib/hoc-vien/default-avatar";
import { hocVienProfileHref } from "@/lib/hoc-vien/profile-url";
import { clearClassroomSession } from "@/lib/phong-hoc/classroom-session";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

function buildNavDongHocPhiHref(email: string): string {
  const q = new URLSearchParams();
  q.set("email", email.trim());
  return `/donghocphi?${q.toString()}`;
}

export type StudentAvatarMenuProps = {
  email: string;
  fullName: string;
  storedAvatar?: string;
};

/**
 * Avatar tròn + dropdown (Gia hạn học phí, Trang cá nhân, Đăng xuất) — cùng hành vi NavBar desktop.
 */
export default function StudentAvatarMenu({ email, fullName, storedAvatar }: StudentAvatarMenuProps) {
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const btnId = useId();
  const [open, setOpen] = useState(false);

  const profileHref = hocVienProfileHref(email);
  const dhpHref = useMemo(() => buildNavDongHocPhiHref(email), [email]);
  const displayName = fullName.trim() || "Học viên";
  const displayEmail = email.trim();

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!profileHref) return null;

  const url = candidates[idx];
  const showPhoto = url !== undefined;

  return (
    <div className="nav-user-avatar-wrap" ref={wrapRef}>
      <button
        type="button"
        id={btnId}
        className="nav-user-avatar"
        aria-label="Mở menu tài khoản học viên"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-user-avatar-ring">
          <span className="nav-user-avatar-inner">
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudflare / unavatar
              <img
                key={url}
                className="nav-user-avatar-img"
                src={url}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setIdx((i) => i + 1)}
              />
            ) : (
              <span className="nav-user-avatar-fallback">{initials || "HV"}</span>
            )}
          </span>
        </span>
      </button>
      {open ? (
        <div className="nav-user-avatar-dd">
          <div className="nav-user-avatar-dd-head" role="presentation">
            <p className="nav-user-avatar-dd-name">{displayName}</p>
            {displayEmail ? (
              <p className="nav-user-avatar-dd-email" title={displayEmail}>
                {displayEmail}
              </p>
            ) : null}
          </div>
          <div id={menuId} role="menu" aria-labelledby={btnId} className="nav-user-avatar-dd-actions">
            <Link
              href={dhpHref}
              role="menuitem"
              className="nav-user-avatar-dd-item"
              onClick={() => setOpen(false)}
            >
              Gia hạn học phí
            </Link>
            <Link
              href={profileHref}
              role="menuitem"
              className="nav-user-avatar-dd-item"
              onClick={() => setOpen(false)}
            >
              Trang cá nhân
            </Link>
            <button
              type="button"
              role="menuitem"
              className="nav-user-avatar-dd-item nav-user-avatar-dd-item--logout"
              onClick={() => {
                clearClassroomSession();
                setOpen(false);
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
