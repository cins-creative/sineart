import type { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";

const ONE_WEEK_S = 60 * 60 * 24 * 7;

const SESSION_COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/admin",
};

type MutableCookieJar = { set: (name: string, value: string, options: object) => void };

/** Xóa cookie phiên admin trên `NextResponse` hoặc `cookies()` (RSC / Server Action). */
export function clearAdminSessionOnCookieJar(jar: MutableCookieJar): void {
  jar.set(ADMIN_SESSION_COOKIE, "", { ...SESSION_COOKIE_BASE, maxAge: 0 });
}

export function attachAdminSessionCookie(res: NextResponse, jwt: string): void {
  res.cookies.set(ADMIN_SESSION_COOKIE, jwt, {
    ...SESSION_COOKIE_BASE,
    maxAge: ONE_WEEK_S,
  });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  clearAdminSessionOnCookieJar(res.cookies);
}
