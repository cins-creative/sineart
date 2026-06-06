import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin",
  "/admin/forgot",
  "/admin/reset",
  "/admin/setup",
]);

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = normalizePathname(req.nextUrl.pathname);

  /* Blog: /blogs/123-ten-bai → /blogs/ten-bai (301/308 — khớp Framer, SEO) */
  if (path.startsWith("/blogs/")) {
    const rest = path.slice("/blogs/".length);
    if (rest && /^\d+-/.test(rest)) {
      const clean = rest.replace(/^\d+-/, "");
      if (clean) {
        const url = req.nextUrl.clone();
        url.pathname = `/blogs/${clean}`;
        return NextResponse.redirect(url, 308);
      }
    }
  }

  /**
   * URL ngành cũ: `/dh-truong-nganh/[truong]/[nganh]` → `.../[truong]/nganh/[nganh]`.
   * Không đụng `/[truong]/tuyen-sinh/[nam]` (độ dài path khác).
   */
  const dhParts = path.split("/").filter(Boolean);
  if (
    dhParts.length === 5 &&
    dhParts[0] === "admin" &&
    dhParts[1] === "dashboard" &&
    dhParts[2] === "dh-truong-nganh"
  ) {
    const seg2 = dhParts[4];
    if (seg2 !== "tuyen-sinh" && seg2 !== "nganh") {
      const url = req.nextUrl.clone();
      url.pathname = `/admin/dashboard/dh-truong-nganh/${dhParts[3]}/nganh/${seg2}`;
      return NextResponse.redirect(url);
    }
  }

  if (!path.startsWith("/admin")) return NextResponse.next();

  /** Route handlers dưới `/admin/api/*` tự trả JSON 401 — tránh redirect POST → HTML login (XHR/fetch parse lỗi). */
  if (path.startsWith("/admin/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.has(path)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/blogs/:path*"],
};
