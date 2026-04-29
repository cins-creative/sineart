"use client";

import {
  NAV_ITEMS,
  type NavItem,
  type NavKhoaHocGroup,
  type NavSubItem,
} from "@/constants/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import ClassroomSignInOverlay from "./ClassroomSignInOverlay";

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
    return (
      <Link
        key={c.href + c.label + (c.navHinhThucLabel ?? c.hinhThucTag ?? "")}
        href={c.href}
        className={`nav-dd-item${subActive ? " active" : ""}`}
        role="menuitem"
      >
        <span className="nav-dd-emoji">{c.emoji}</span>
        <NavSubItemLabel item={c} />
      </Link>
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
  reducedMotion,
  khoaHocGroups,
}: {
  pathname: string;
  onNavigate: () => void;
  reducedMotion: boolean | null;
  khoaHocGroups?: NavKhoaHocGroup[] | null;
}) {
  const rm = !!reducedMotion;
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: rm ? 0 : 0.045,
        delayChildren: rm ? 0 : 0.06,
      },
    },
  };
  const row = {
    hidden: { opacity: 0, y: rm ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: rm ? 0.12 : 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
  };

  return (
    <motion.div
      className="nav-m-list"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {NAV_ITEMS.map((item) => {
        if (item.kind === "link") {
          if (item.external) {
            return (
              <motion.div key={item.id} variants={row}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-m-link"
                  onClick={onNavigate}
                >
                  {item.label}
                </a>
              </motion.div>
            );
          }
          return (
            <motion.div key={item.id} variants={row}>
                <Link
                  href={item.href}
                  className={`nav-m-link${navItemActive(pathname, item, khoaHocGroups) ? " active" : ""}`}
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
            </motion.div>
          );
        }

        return (
          <motion.div key={item.id} variants={row}>
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
                          return (
                            <Link
                              key={c.href + c.label + (c.navHinhThucLabel ?? c.hinhThucTag ?? "")}
                              href={c.href}
                              className={`nav-m-sublink${subActive ? " active" : ""}`}
                              onClick={onNavigate}
                            >
                              <span className="nav-dd-emoji">{c.emoji}</span>
                              <NavSubItemLabel item={c} />
                            </Link>
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
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default function NavBar({
  khoaHocGroups,
}: {
  /** Từ `ql_mon_hoc` — nhóm + nhãn tên môn + Online/tại lớp */
  khoaHocGroups?: NavKhoaHocGroup[] | null;
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
  const menuId = useId();
  const reducedMotion = useReducedMotion();

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

  const prefersReducedMotion = reducedMotion === true;

  const sheetTransition = prefersReducedMotion
    ? { duration: 0.2, ease: "easeOut" as const }
    : {
        type: "tween" as const,
        duration: 0.46,
        ease: [0.32, 0.72, 0, 1] as const,
      };

  const backdropTransition = prefersReducedMotion
    ? { duration: 0.15 }
    : {
        duration: 0.34,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      };

  return (
    <>
      <div className="nav-bottom-fixed">
        <div className="sticky">
          <Link href="/" className="sticky-logo" aria-label="Sine Art — Trang chủ">
            <img
              src="https://imagedelivery.net/PtnQ1mNuCedkboD0kJ2_4w/65b0e187-cbc0-42f6-4978-b3da96efe300/public"
              alt="Sine Art"
              className="sticky-logo-img"
              width={140}
              height={56}
              decoding="async"
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

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id={menuId}
            key="nav-mobile-overlay"
            className="nav-mobile-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
          >
            <div
              className="nav-mobile-backdrop"
              role="presentation"
              aria-hidden
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="nav-mobile-sheet"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { y: "100%", opacity: 0.96 }
              }
              animate={
                prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { y: "100%", opacity: 0.96 }
              }
              transition={sheetTransition}
            >
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
                  reducedMotion={reducedMotion}
                  khoaHocGroups={khoaHocGroups}
                />
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
