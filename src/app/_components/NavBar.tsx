"use client";

import {
  NAV_ITEMS,
  type NavItem,
  type NavKhoaHocGroup,
  type NavOpenClass,
  type NavSubItem,
} from "@/constants/navigation";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import DongHocPhiEmailGateModal from "@/app/khoa-hoc/_components/DongHocPhiEmailGateModal";
import StudentAvatarMenu from "@/components/StudentAvatarMenu";
import {
  CLASSROOM_SESSION_CHANGED_EVENT,
  CLASSROOM_SESSION_STORAGE_KEY,
  parseClassroomSession,
  syncPhongHocCookiesWithStorage,
} from "@/lib/phong-hoc/classroom-session";
import { nextImageShouldUnoptimize } from "@/lib/nextImageRemote";
import ClassroomSignInOverlay from "./ClassroomSignInOverlay";

const NAV_LOGO_SRC =
  "https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/65b0e187-cbc0-42f6-4978-b3da96efe300/public";

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/** Chevron menu mobile — không nền, chỉ nét */
const NavMobileChevron = () => (
  <span className="nav-m-caret" aria-hidden>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

/** Icon play — “Vào học” */
const PlayIcon = () => (
  <span className="nav-cta-play" aria-hidden>
    <svg className="nav-cta-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.2 6.7c-.5-.3-1.1 0-1.1.6v10.4c0 .6.6 1 1.1.7l8.2-5.2c.5-.3.5-1 0-1.3L9.2 6.7z" />
    </svg>
  </span>
);

/** Thu nhỏ / gập panel ảnh — icon minimize nhỏ trong nút góc ảnh */
const LichThuNhoIcon = () => (
  <svg className="nav-cta-lich-pin-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M8 18.5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

type NavStudentSession = {
  email: string;
  fullName: string;
  avatarUrl?: string;
};

function readNavStudentSession(): NavStudentSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY);
  const parsed = parseClassroomSession(raw);
  if (!parsed || parsed.userType !== "Student") return null;
  const em = parsed.data.email?.trim();
  if (!em || !em.includes("@")) return null;
  return {
    email: em.toLowerCase(),
    fullName: String(parsed.data.full_name ?? "").trim(),
    avatarUrl: parsed.data.hv_avatar?.trim() || undefined,
  };
}

function pathMatches(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavOpenClassThumb({
  thumbnailUrl,
  size,
}: {
  thumbnailUrl?: string | null;
  size: "desktop" | "mobile";
}) {
  const cls =
    size === "desktop" ? "nav-dd-subitem-thumb" : "nav-m-lop-thumb";
  if (!thumbnailUrl?.trim()) {
    return <span className={`${cls} ${cls}--empty`} aria-hidden />;
  }
  const src = thumbnailUrl.trim();
  return (
    <span className={cls}>
      <Image
        src={src}
        alt=""
        width={size === "desktop" ? 44 : 36}
        height={size === "desktop" ? 44 : 36}
        className={`${cls}-img`}
        loading="lazy"
        decoding="async"
        unoptimized={nextImageShouldUnoptimize(src)}
      />
    </span>
  );
}

function NavOpenClassList({
  classes,
  variant,
  onNavigate,
}: {
  classes: NavOpenClass[];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  if (!classes.length) {
    return (
      <p
        className={
          variant === "desktop" ? "nav-dd-sub-empty" : "nav-m-lop-empty"
        }
      >
        Chưa có lớp còn chỗ
      </p>
    );
  }
  return (
    <ul
      className={variant === "desktop" ? "nav-dd-sublist" : "nav-m-lop-list"}
      role="group"
      aria-label="Lớp đang mở"
    >
      {classes.map((lop) => (
        <li key={lop.lopId}>
          <Link
            href={lop.href}
            className={
              variant === "desktop" ? "nav-dd-subitem" : "nav-m-lop-link"
            }
            role="menuitem"
            onClick={onNavigate}
          >
            <NavOpenClassThumb thumbnailUrl={lop.thumbnailUrl} size={variant} />
            <span className="nav-dd-subitem-body">
              <span className="nav-dd-subitem-main">
                <span className="nav-dd-subitem-label">{lop.label}</span>
                {lop.loaiLopTags && lop.loaiLopTags.length > 0 ? (
                  <span className="nav-dd-subitem-tags">
                    {lop.loaiLopTags.map((tag) => (
                      <span key={tag} className="nav-dd-subitem-tag">
                        {tag}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              {lop.seatHint ? (
                <span className="nav-dd-subitem-hint">{lop.seatHint}</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NavKhoaHocDropdownLink({
  item,
  subActive,
}: {
  item: NavSubItem;
  subActive: boolean;
}) {
  const openClasses = item.openClasses ?? [];
  const hasLop = openClasses.length > 0;

  if (!hasLop) {
    return (
      <Link
        href={item.href}
        className={`nav-dd-item${subActive ? " active" : ""}`}
        role="menuitem"
      >
        <span className="nav-dd-emoji">{item.emoji}</span>
        <NavSubItemLabel item={item} />
      </Link>
    );
  }

  return (
    <div
      className={`nav-dd-item-wrap nav-dd-item-wrap--has-lop${subActive ? " nav-dd-item-wrap--active" : ""}`}
    >
      <Link
        href={item.href}
        className={`nav-dd-item${subActive ? " active" : ""}`}
        role="menuitem"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span className="nav-dd-emoji">{item.emoji}</span>
        <NavSubItemLabel item={item} />
        <span className="nav-dd-lop-caret" aria-hidden>
          ›
        </span>
      </Link>
      <div className="nav-dd-subpanel" role="group" aria-label={`Lớp — ${item.label}`}>
        <div className="nav-dd-subpanel-title">Lớp đang mở</div>
        <NavOpenClassList classes={openClasses} variant="desktop" />
      </div>
    </div>
  );
}

function NavSubItemLabel({ item }: { item: NavSubItem }) {
  const tagText =
    (item.navHinhThucLabel != null && String(item.navHinhThucLabel).trim() !== ""
      ? String(item.navHinhThucLabel).trim()
      : item.hinhThucTag) ?? null;
  return (
    <span className="nav-dd-label-row">
      <span className="nav-dd-label-text">{item.label}</span>
      {tagText && item.hinhThucTag ? (
        <span
          className={
            item.hinhThucTag === "Online"
              ? "nav-dd-tag nav-dd-tag--online"
              : "nav-dd-tag nav-dd-tag--offline"
          }
        >
          {tagText}
        </span>
      ) : null}
    </span>
  );
}

function khoaHocDropdownFlat(
  item: Extract<NavItem, { kind: "dropdown" }>,
  khoaHocGroups?: NavKhoaHocGroup[] | null
): NavSubItem[] {
  if (item.id === "khoa-hoc" && khoaHocGroups?.length) {
    return khoaHocGroups.flatMap((g) => g.items);
  }
  return item.children;
}

function navItemActive(
  pathname: string,
  item: NavItem,
  khoaHocGroups?: NavKhoaHocGroup[] | null
): boolean {
  if (item.kind === "link") {
    if (item.external) return false;
    return pathMatches(item.href, pathname);
  }
  if (item.href && pathMatches(item.href, pathname)) return true;
  return khoaHocDropdownFlat(item, khoaHocGroups).some((c) =>
    pathMatches(c.href, pathname)
  );
}

function NavDropdownView({
  item,
  pathname,
  khoaHocGroups,
}: {
  item: Extract<NavItem, { kind: "dropdown" }>;
  pathname: string;
  khoaHocGroups?: NavKhoaHocGroup[] | null;
}) {
  const active = navItemActive(pathname, item, khoaHocGroups);
  const useKhoaGroups =
    item.id === "khoa-hoc" && khoaHocGroups && khoaHocGroups.length > 0;

  const renderLink = (c: NavSubItem) => {
    const subActive = pathMatches(c.href, pathname);
    const key = c.href + c.label + (c.navHinhThucLabel ?? c.hinhThucTag ?? "");
    return (
      <div key={key}>
        <NavKhoaHocDropdownLink item={c} subActive={subActive} />
      </div>
    );
  };

  return (
    <div className={`nav-dd${active ? " nav-dd--active" : ""}`}>
      {item.href ? (
        <Link href={item.href} className={`nav-dd-t${active ? " active" : ""}`}>
          {item.label}
          <span className="nav-dd-caret" aria-hidden>
            ▾
          </span>
        </Link>
      ) : (
        <button type="button" className={`nav-dd-t nav-dd-t-btn${active ? " active" : ""}`}>
          {item.label}
          <span className="nav-dd-caret" aria-hidden>
            ▾
          </span>
        </button>
      )}
      <div className="nav-dd-panel" role="menu" aria-label={item.label}>
        {useKhoaGroups
          ? khoaHocGroups!.map((group) => (
              <div key={group.title} className="nav-dd-group">
                <div className="nav-dd-group-title">{group.title}</div>
                {group.items.map((c) => renderLink(c))}
              </div>
            ))
          : item.children.map((c) => renderLink(c))}
      </div>
    </div>
  );
}

function MobileNavContent({
  pathname,
  onNavigate,
  khoaHocGroups,
}: {
  pathname: string;
  onNavigate: () => void;
  khoaHocGroups?: NavKhoaHocGroup[] | null;
}) {
  return (
    <div className="nav-m-list">
      {NAV_ITEMS.map((item) => {
        if (item.kind === "link") {
          if (item.external) {
            return (
              <div key={item.id}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-m-link"
                  onClick={onNavigate}
                >
                  {item.label}
                </a>
              </div>
            );
          }
          return (
              <div key={item.id}>
                <Link
                  href={item.href}
                  className={`nav-m-link${navItemActive(pathname, item, khoaHocGroups) ? " active" : ""}`}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              </div>
          );
        }

        return (
          <div key={item.id}>
            <details className="nav-m-details">
              <summary className="nav-m-summary">
                {item.label}
                <NavMobileChevron />
              </summary>
              <div className="nav-m-sub">
                {item.href &&
                !khoaHocDropdownFlat(item, khoaHocGroups).some(
                  (c) => c.href === item.href
                ) ? (
                  <Link
                    href={item.href}
                    className={`nav-m-sublink nav-m-sublink-parent${pathMatches(item.href, pathname) ? " active" : ""}`}
                    onClick={onNavigate}
                  >
                    {item.label === "Khóa học" ? "Tất cả khóa học" : item.label}
                  </Link>
                ) : null}
                {item.id === "khoa-hoc" && khoaHocGroups?.length
                  ? khoaHocGroups.map((group) => (
                      <div key={group.title} className="nav-m-subgroup">
                        <div className="nav-m-subgroup-title">{group.title}</div>
                        {group.items.map((c) => {
                          const subActive = pathMatches(c.href, pathname);
                          const openClasses = c.openClasses ?? [];
                          const key =
                            c.href + c.label + (c.navHinhThucLabel ?? c.hinhThucTag ?? "");
                          return (
                            <div key={key} className="nav-m-khoa-block">
                              <Link
                                href={c.href}
                                className={`nav-m-sublink${subActive ? " active" : ""}`}
                                onClick={onNavigate}
                              >
                                <span className="nav-dd-emoji">{c.emoji}</span>
                                <NavSubItemLabel item={c} />
                              </Link>
                              {openClasses.length > 0 ? (
                                <NavOpenClassList
                                  classes={openClasses}
                                  variant="mobile"
                                  onNavigate={onNavigate}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  : item.children.map((c) => {
                      const subActive = pathMatches(c.href, pathname);
                      return (
                        <Link
                          key={c.href + c.label}
                          href={c.href}
                          className={`nav-m-sublink${subActive ? " active" : ""}`}
                          onClick={onNavigate}
                        >
                          <span className="nav-dd-emoji">{c.emoji}</span>
                          <span>{c.label}</span>
                        </Link>
                      );
                    })}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

export default function NavBar({
  khoaHocGroups,
  thiThuLichChamUrl,
}: {
  /** Từ `ql_mon_hoc` — nhóm + nhãn tên môn + Online/tại lớp */
  khoaHocGroups?: NavKhoaHocGroup[] | null;
  /**
   * Chỉ truyền từ `ThiThuNavBarSection`: thay nút «Vào học» (fixed góc màn hình).
   * `undefined` — giữ nút mặc định. `null` / chuỗi rỗng — ẩn slot. Chuỗi URL — hiện ảnh lịch chấm.
   */
  thiThuLichChamUrl?: string | null;
} = {}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [classroomSignInOpen, setClassroomSignInOpen] = useState(false);
  /** Email từ popup Đăng nhập Nav — prefill overlay «Vào học» tới bước chọn lớp. */
  const [classroomOverlayEmail, setClassroomOverlayEmail] = useState<string | undefined>(
    undefined
  );
  const [dhpNavLoginOpen, setDhpNavLoginOpen] = useState(false);
  const [studentSession, setStudentSession] = useState<NavStudentSession | null>(null);
  /** Trang thi thử: mặc định mở ảnh lịch; nút chỉ icon để thu gọn. */
  const [thiThuLichOpen, setThiThuLichOpen] = useState(true);
  const menuId = useId();

  useEffect(() => {
    const readUi = () => setStudentSession(readNavStudentSession());
    readUi();
    const onSessionChanged = () => {
      void syncPhongHocCookiesWithStorage();
      readUi();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASSROOM_SESSION_STORAGE_KEY || e.key === null) onSessionChanged();
    };
    window.addEventListener(CLASSROOM_SESSION_CHANGED_EVENT, onSessionChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CLASSROOM_SESSION_CHANGED_EVENT, onSessionChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const close = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const thiThuLichTrimmed =
    typeof thiThuLichChamUrl === "string" ? thiThuLichChamUrl.trim() : "";
  const thiThuReplacesEnterCta = thiThuLichChamUrl !== undefined;
  const thiThuShowLichImg = thiThuLichTrimmed.length > 0;

  /** Trang cá nhân học viên: không hiện CTA/ảnh quảng cáo góc màn hình. */
  const hideNavFloatingCta = pathname.startsWith("/hoc-vien");

  return (
    <>
      <div className="nav-bottom-fixed">
        <div className="sticky">
          <Link href="/" className="sticky-logo" aria-label="Sine Art — Trang chủ">
            <Image
              src={NAV_LOGO_SRC}
              alt="Sine Art"
              className="sticky-logo-img"
              width={140}
              height={56}
              decoding="async"
              unoptimized={nextImageShouldUnoptimize(NAV_LOGO_SRC)}
            />
          </Link>
          <nav className="nav-links" aria-label="Điều hướng chính">
            {NAV_ITEMS.map((item) =>
              item.kind === "dropdown" ? (
                <NavDropdownView
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  khoaHocGroups={item.id === "khoa-hoc" ? khoaHocGroups : undefined}
                />
              ) : item.external ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link-ext"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  className={
                    navItemActive(pathname, item, khoaHocGroups) ? "active" : undefined
                  }
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
          {studentSession ? (
            <StudentAvatarMenu
              email={studentSession.email}
              fullName={studentSession.fullName}
              storedAvatar={studentSession.avatarUrl}
            />
          ) : (
            <button
              type="button"
              className="nav-login-btn"
              onClick={() => setDhpNavLoginOpen(true)}
            >
              Đăng nhập
            </button>
          )}
          <button
            type="button"
            className="nav-mobile-toggle"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Đóng menu" : "Mở menu"}</span>
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {!hideNavFloatingCta &&
        (thiThuReplacesEnterCta ? (
          thiThuShowLichImg ? (
            <div className="nav-cta-fixed">
              <div className="nav-cta-lich-stack">
                {!thiThuLichOpen ? (
                  <button
                    type="button"
                    className="nav-cta-lich-toggle"
                    aria-expanded={false}
                    aria-controls="nav-cta-lich-panel"
                    id="nav-cta-lich-toggle"
                    aria-label="Mở lịch chấm thi thử"
                    onClick={() => setThiThuLichOpen(true)}
                  >
                    <span>Lịch chấm thi thử</span>
                  </button>
                ) : null}
                {thiThuLichOpen ? (
                  <div
                    className="nav-cta-lich-wrap"
                    id="nav-cta-lich-panel"
                    role="region"
                    aria-label="Ảnh lịch chấm thi thử"
                  >
                    <button
                      type="button"
                      className="nav-cta-lich-pin"
                      aria-expanded={true}
                      aria-controls="nav-cta-lich-panel"
                      id="nav-cta-lich-toggle"
                      aria-label="Thu gọn lịch chấm"
                      onClick={() => setThiThuLichOpen(false)}
                    >
                      <LichThuNhoIcon />
                    </button>
                    <Image
                      src={thiThuLichTrimmed}
                      alt="Lịch chấm bài"
                      className="nav-cta-lich-img"
                      width={1200}
                      height={336}
                      loading="lazy"
                      decoding="async"
                      unoptimized={nextImageShouldUnoptimize(thiThuLichTrimmed)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null
        ) : (
          <div className="nav-cta-fixed">
            <button
              type="button"
              className="nav-cta-btn"
              aria-label="Vào học"
              onClick={() => {
                setClassroomOverlayEmail(undefined);
                setClassroomSignInOpen(true);
              }}
            >
              <PlayIcon />
              <span>Vào học</span>
            </button>
          </div>
        ))}

      <ClassroomSignInOverlay
        open={classroomSignInOpen}
        initialEmail={classroomOverlayEmail}
        onClose={() => {
          setClassroomSignInOpen(false);
          setClassroomOverlayEmail(undefined);
        }}
      />
      <DongHocPhiEmailGateModal
        open={dhpNavLoginOpen}
        onClose={() => setDhpNavLoginOpen(false)}
        monHocId={null}
        courseTitle=""
        fromNavLogin
        onRequestClassroom={(email) => {
          setClassroomOverlayEmail(email);
          setClassroomSignInOpen(true);
        }}
      />

      {mobileOpen ? (
        <div
          id={menuId}
          className="nav-mobile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
            <div
              className="nav-mobile-backdrop"
              role="presentation"
              aria-hidden
              onClick={() => setMobileOpen(false)}
            />
            <div className="nav-mobile-sheet">
              <div className="nav-mobile-sheet-handle" aria-hidden>
                <span className="nav-mobile-sheet-handle-bar" />
              </div>
              <div className="nav-mobile-sheet-head">
                <span className="nav-mobile-sheet-title">Menu</span>
                <button
                  type="button"
                  className="nav-mobile-close"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Đóng"
                >
                  <CloseIcon />
                </button>
              </div>
              <nav className="nav-mobile-nav" aria-label="Điều hướng chính">
                <MobileNavContent
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  khoaHocGroups={khoaHocGroups}
                />
              </nav>
            </div>
          </div>
        ) : null}
    </>
  );
}
