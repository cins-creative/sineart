"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ADMIN_MODAL_ROOT_ELEMENT_ID } from "@/lib/admin/constants";
import {
  DASHBOARD_OVERVIEW_HREF,
  NAV_MAIN,
  NAV_HR,
  NAV_MARKETING,
  ORDER_MEDIA_HREF,
} from "@/lib/admin/dashboard-nav-config";
import type { DashboardNavAccess } from "@/lib/admin/dashboard-nav-visibility";
import { canAccessDashboardHref } from "@/lib/admin/dashboard-nav-visibility";

type Props = {
  staffName: string;
  staffEmail: string;
  /** `hr_nhan_su.vai_tro` (null nếu trống hoặc không đọc được). */
  staffRole: string | null;
  /** `hr_nhan_su.avatar` — hiển thị ảnh đại diện; nếu trống thì dùng chữ cái + gradient. */
  staffAvatarUrl?: string | null;
  /** Menu sidebar theo `hr_phong.ten_phong` (allowlist href). */
  dashboardNav: DashboardNavAccess;
  children: React.ReactNode;
};

function staffInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

/** Trang tổng quan — chỉ highlight khi đúng `/admin/dashboard`, không gồm route con. */
function overviewNavClass(pathname: string | null): string {
  const active = pathname === DASHBOARD_OVERVIEW_HREF;
  const base =
    "mb-1 block rounded-xl px-3 py-2.5 text-[13px] font-bold tracking-tight transition";
  if (active) {
    return `${base} border border-[#f8a668]/40 bg-gradient-to-r from-[#fff4eb] via-[#fef5f3] to-[#fdeef6] text-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]`;
  }
  return `${base} border border-transparent bg-gradient-to-r from-[#f8a668]/10 to-[#ee5b9f]/10 text-black/85 hover:border-black/[0.08] hover:from-[#f8a668]/16 hover:to-[#ee5b9f]/14`;
}

function navItemClass(href: string, pathname: string | null, searchParams: URLSearchParams): string {
  const base = "block rounded-lg px-2 py-2 text-black/80 transition hover:bg-black/[0.04]";
  const [pathPart, queryPart] = href.split("?");
  const pathMatches =
    pathname === pathPart ||
    (pathPart !== DASHBOARD_OVERVIEW_HREF && (pathname?.startsWith(`${pathPart}/`) ?? false));

  let queryMatches = true;
  if (pathMatches && queryPart) {
    const want = new URLSearchParams(queryPart);
    queryMatches = [...want.entries()].every(([k, v]) => searchParams.get(k) === v);
  } else if (pathMatches && !queryPart && pathPart === "/admin/dashboard/quan-ly-bai-hoc-vien") {
    const tab = searchParams.get("tab");
    queryMatches = tab == null || tab === "cho";
  }

  if (pathMatches && queryMatches) return `${base} bg-black/[0.06] font-medium text-black`;
  return base;
}

export default function AdminShell({
  staffName,
  staffEmail,
  staffRole,
  staffAvatarUrl,
  dashboardNav,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  const allowed = dashboardNav.allowedHrefs;

  const navMainVisible = useMemo(
    () => NAV_MAIN.filter((i) => !i.disabled && canAccessDashboardHref(allowed, i.href)),
    [allowed],
  );
  const navHrVisible = useMemo(
    () => NAV_HR.filter((i) => !i.disabled && canAccessDashboardHref(allowed, i.href)),
    [allowed],
  );
  const navMarketingVisible = useMemo(
    () => NAV_MARKETING.filter((i) => !i.disabled && canAccessDashboardHref(allowed, i.href)),
    [allowed],
  );

  const showOrderMedia = canAccessDashboardHref(allowed, ORDER_MEDIA_HREF);

  const prefetchTargets = useMemo(() => {
    const out: string[] = [DASHBOARD_OVERVIEW_HREF];
    if (showOrderMedia) out.push(ORDER_MEDIA_HREF);
    for (const i of navMainVisible) out.push(i.href);
    for (const i of navHrVisible) out.push(i.href);
    for (const i of navMarketingVisible) out.push(i.href);
    return [...new Set(out)];
  }, [showOrderMedia, navMainVisible, navHrVisible, navMarketingVisible]);

  useEffect(() => {
    for (const href of prefetchTargets) {
      router.prefetch(href);
    }
  }, [router, prefetchTargets]);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen text-[#1a1a1a] [font-family:ui-sans-serif,system-ui,sans-serif]"
      style={{ background: "#F5F4F2" }}
    >
      <aside className="fixed left-0 top-0 z-[8] hidden h-full w-[260px] flex-col border-r border-black/[0.06] bg-white md:flex">
        <div className="flex h-14 min-w-0 items-center gap-2 border-b border-black/[0.06] px-5">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-black/[0.06] bg-black/[0.04]">
            {staffAvatarUrl?.trim() ? (
              <img
                src={staffAvatarUrl.trim()}
                alt={staffName.trim() ? `Ảnh đại diện ${staffName.trim()}` : "Ảnh đại diện"}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #f8a668, #ee5b9f)" }}
                aria-hidden
              >
                {staffInitial(staffName)}
              </div>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{staffName || "—"}</div>
            <div className="truncate text-[11px] text-black/45">{staffRole ?? "—"}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 text-[13px]">
          <Link href={DASHBOARD_OVERVIEW_HREF} className={overviewNavClass(pathname)}>
            Tổng quan
          </Link>
          {showOrderMedia ? (
            <Link
              href={ORDER_MEDIA_HREF}
              className={`mb-3 mt-1 ${navItemClass(ORDER_MEDIA_HREF, pathname, searchParams)}`}
            >
              Order nội dung media
            </Link>
          ) : (
            <div className="mb-3 mt-1" aria-hidden />
          )}
          {navMainVisible.length > 0 ? (
            <>
              <p className="mb-2 mt-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
                Điều hành
              </p>
              <ul className="space-y-0.5">
                {navMainVisible.map((item) => (
                  <li key={item.label}>
                    {item.disabled ? (
                      <span className="block cursor-not-allowed rounded-lg px-2 py-2 text-black/35">
                        {item.label}
                      </span>
                    ) : (
                      <Link href={item.href} className={navItemClass(item.href, pathname, searchParams)}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {navHrVisible.length > 0 ? (
            <>
              <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
                Nhân sự & TC
              </p>
              <ul className="space-y-0.5">
                {navHrVisible.map((item) => (
                  <li key={item.label}>
                    {item.disabled ? (
                      <span className="block cursor-not-allowed rounded-lg px-2 py-2 text-black/35">
                        {item.label}
                      </span>
                    ) : (
                      <Link href={item.href} className={navItemClass(item.href, pathname, searchParams)}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {navMarketingVisible.length > 0 ? (
            <>
              <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
                Marketing
              </p>
              <ul className="space-y-0.5">
                {navMarketingVisible.map((item) => (
                  <li key={item.label}>
                    {item.disabled ? (
                      <span className="block cursor-not-allowed rounded-lg px-2 py-2 text-black/35">
                        {item.label}
                      </span>
                    ) : (
                      <Link href={item.href} className={navItemClass(item.href, pathname, searchParams)}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
      </aside>

      <div className="min-w-0 max-w-full md:pl-[260px]">
        <header className="sticky top-0 z-[9] flex h-14 w-full min-w-0 items-center justify-between gap-3 border-b border-black/[0.06] bg-white/90 px-4 backdrop-blur md:px-[24px]">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-black/70 transition hover:bg-black/[0.04] hover:text-black"
            aria-label="Về trang chủ"
            title="Trang chủ"
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </Link>
          <div className="flex min-w-0 max-w-full flex-1 items-center justify-end gap-3 text-end">
            <span className="hidden max-w-[min(320px,45vw)] truncate text-xs text-black/45 sm:inline">
              {staffEmail}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={logout}
              className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="relative min-w-0 w-full max-w-full p-4 md:p-6">{children}</main>
      </div>
      <div
        id={ADMIN_MODAL_ROOT_ELEMENT_ID}
        className="pointer-events-none fixed inset-0 z-[100] isolate"
      />
    </div>
  );
}
