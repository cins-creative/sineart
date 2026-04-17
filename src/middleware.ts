import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import { clearAdminSessionCookie } from "@/lib/admin/session-cookie";
import { isHrStaffBlockedFromAdminStatus } from "@/lib/admin/staff-employment-status";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

  const supabase = createServiceRoleClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("hr_nhan_su")
      .select("status")
      .eq("id", session.staffId)
      .maybeSingle();

    if (!error && (!data || isHrStaffBlockedFromAdminStatus(data.status as string | null))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("notice", "inactive");
      const res = NextResponse.redirect(url);
      clearAdminSessionCookie(res);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
