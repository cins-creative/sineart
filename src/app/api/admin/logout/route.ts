import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/admin/session-cookie";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  clearAdminSessionCookie(res);
  return res;
}
