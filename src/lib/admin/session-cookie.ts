import type { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";

const ONE_WEEK_S = 60 * 60 * 24 * 7;

export function attachAdminSessionCookie(res: NextResponse, jwt: string): void {
  res.cookies.set(ADMIN_SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: ONE_WEEK_S,
  });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}
