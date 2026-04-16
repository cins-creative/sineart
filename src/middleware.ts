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

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = normalizePathname(req.nextUrl.pathname);
  if (!path.startsWith("/admin")) return NextResponse.next();

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
  matcher: ["/admin/:path*"],
};
