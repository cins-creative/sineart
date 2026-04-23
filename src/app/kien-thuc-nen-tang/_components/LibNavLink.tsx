"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

/** Spinner hiện khi Link đang pending route change.
 *  `useLinkStatus` chỉ chạy khi component là DESCENDANT của <Link>. */
function LibNavPendingPip() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="lib-link-pending" aria-hidden />;
}

type Props = Omit<ComponentProps<typeof Link>, "children"> & {
  /** Có render spinner bên phải khi loading? Mặc định `true`. */
  showPending?: boolean;
  children: React.ReactNode;
  /** Class khi bài hiện tại đang active. Cha component tự quyết định truyền
   *  hay không (dựa vào `pathname`). */
  isActive?: boolean;
};

/**
 * Link có animation pending + shimmer hover, scoped cho thư viện
 * `/kien-thuc-nen-tang`. Dùng thay `<Link>` ở sidebar `.lnav-item` để user
 * thấy feedback tức thì khi click (trước khi route mới render).
 *
 * Khi route đang pending:
 *   - Thêm class `.is-pending` vào link (CSS render shimmer bar trên link).
 *   - Hiện dot pulsing phía phải (`.lib-link-pending`).
 *
 * Không dùng JS scroll / preventDefault — để Next.js handle prefetch
 * + navigation natively.
 */
export default function LibNavLink({
  className = "",
  isActive,
  showPending = true,
  children,
  ...rest
}: Props) {
  const activeClass = isActive ? " on" : "";
  return (
    <Link
      {...rest}
      aria-current={isActive ? "page" : undefined}
      className={`${className}${activeClass} lib-link`}
    >
      <span className="lib-link-label">{children}</span>
      {showPending ? <LibNavPendingPip /> : null}
    </Link>
  );
}
