"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { ADMIN_MODAL_ROOT_ELEMENT_ID } from "@/lib/admin/constants";

const NAV_MAIN: { label: string; href: string; disabled?: boolean }[] = [
  { label: "Tổng quan", href: "/admin/dashboard" },
  { label: "Chi nhánh", href: "/admin/dashboard/chi-nhanh" },
  { label: "Khóa học", href: "/admin/dashboard/khoa-hoc" },
  { label: "Lớp học", href: "/admin/dashboard/lop-hoc" },
  { label: "Quản lý hóa đơn", href: "/admin/dashboard/quan-ly-hoa-don" },
  { label: "Quản lý học viên", href: "/admin/dashboard/quan-ly-hoc-vien" },
  { label: "Thu chi khác", href: "/admin/dashboard/thu-chi-khac" },
  { label: "Quản lý họa cụ", href: "/admin/dashboard/quan-ly-hoa-cu" },
  { label: "Hệ thống bài tập", href: "/admin/dashboard/he-thong-bai-tap" },
];

const NAV_HR: { label: string; href: string; disabled?: boolean }[] = [
  { label: "Nhân sự", href: "/admin/dashboard/quan-ly-nhan-su" },
  { label: "Bảng lương", href: "#", disabled: true },
  { label: "Báo cáo tài chính", href: "/admin/dashboard/bao-cao-tai-chinh" },
  { label: "Upload sao kê", href: "#", disabled: true },
];

type Props = {
  staffName: string;
  staffEmail: string;
  /** `hr_nhan_su.vai_tro` (null nếu trống hoặc không đọc được). */
  staffRole: string | null;
  /** `hr_nhan_su.avatar` — hiển thị ảnh đại diện; nếu trống thì dùng chữ cái + gradient. */
  staffAvatarUrl?: string | null;
  children: React.ReactNode;
};

function staffInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

function navItemClass(href: string, pathname: string | null): string {
  const base = "block rounded-lg px-2 py-2 text-black/80 transition hover:bg-black/[0.04]";
  const active =
    pathname === href || (href !== "/admin/dashboard" && (pathname?.startsWith(`${href}/`) ?? false));
  if (active) return `${base} bg-black/[0.06] font-medium text-black`;
  return base;
}

export default function AdminShell({
  staffName,
  staffEmail,
  staffRole,
  staffAvatarUrl,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

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
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
            Điều hành
          </p>
          <ul className="space-y-0.5">
            {NAV_MAIN.map((item) => (
              <li key={item.label}>
                {item.disabled ? (
                  <span className="block cursor-not-allowed rounded-lg px-2 py-2 text-black/35">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className={navItemClass(item.href, pathname)}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
            Nhân sự & TC
          </p>
          <ul className="space-y-0.5">
            {NAV_HR.map((item) => (
              <li key={item.label}>
                {item.disabled ? (
                  <span className="block cursor-not-allowed rounded-lg px-2 py-2 text-black/35">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className={navItemClass(item.href, pathname)}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
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
