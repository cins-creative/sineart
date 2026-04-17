import Link from "next/link";

import { adminListTotalPages, ADMIN_LIST_PAGE_SIZE } from "@/lib/admin/admin-list-params";
import { cn } from "@/lib/utils";

function buildHref(
  pathname: string,
  next: { page: number; q: string; extra?: Record<string, string | undefined> },
): string {
  const sp = new URLSearchParams();
  sp.set("page", String(next.page));
  if (next.q) sp.set("q", next.q);
  for (const [k, v] of Object.entries(next.extra ?? {})) {
    if (v != null && v !== "") sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

type Props = {
  pathname: string;
  page: number;
  q: string;
  total: number;
  pageSize?: number;
  /** Giữ tham số khác (vd. `tab` trên quản lý bài học viên). */
  extra?: Record<string, string | undefined>;
  className?: string;
};

/**
 * Thanh tìm kiếm (GET) + phân trang — dùng trong Server Components.
 * `total` là số dòng sau lọc `q` (trước khi slice trang).
 */
export default function AdminPagedListBar({
  pathname,
  page,
  q,
  total,
  pageSize = ADMIN_LIST_PAGE_SIZE,
  extra,
  className,
}: Props) {
  const pages = adminListTotalPages(total, pageSize);
  const safePage = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <form method="GET" action={pathname} className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-black/45">Tìm kiếm</label>
        <div className="flex gap-2">
          <input type="hidden" name="page" value="1" />
          {Object.entries(extra ?? {}).map(([k, v]) =>
            v != null && v !== "" ? <input type="hidden" key={k} name={k} value={v} /> : null,
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder="Gõ để lọc…"
            autoComplete="off"
            className="h-10 min-w-0 flex-1 rounded-lg border border-black/[0.1] bg-white px-3 text-sm outline-none focus:border-[#BC8AF9]"
          />
          <button
            type="submit"
            className="h-10 shrink-0 rounded-lg bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-4 text-xs font-bold text-white"
          >
            Lọc
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-black/55 sm:justify-end">
        <span className="tabular-nums">
          {total === 0 ? "0 kết quả" : `${from}–${to} / ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Link
            href={buildHref(pathname, { page: Math.max(1, safePage - 1), q, extra })}
            aria-disabled={safePage <= 1}
            className={cn(
              "rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 font-semibold text-black/70",
              safePage <= 1 && "pointer-events-none opacity-40",
            )}
          >
            Trước
          </Link>
          <span className="min-w-[5.5rem] text-center font-bold text-black/70">
            {safePage} / {pages}
          </span>
          <Link
            href={buildHref(pathname, { page: Math.min(pages, safePage + 1), q, extra })}
            aria-disabled={safePage >= pages}
            className={cn(
              "rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 font-semibold text-black/70",
              safePage >= pages && "pointer-events-none opacity-40",
            )}
          >
            Sau
          </Link>
        </div>
      </div>
    </div>
  );
}
