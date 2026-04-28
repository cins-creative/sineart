import { GV_SYNC_COOKIE } from "@/lib/phong-hoc/gv-session-cookie";
import { HV_SYNC_COOKIE } from "@/lib/phong-hoc/hv-session-cookie";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const baseOpts = {
  path: "/" as const,
  maxAge: 0,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Xóa cookie đồng bộ Phòng học (HV/GV) — dùng khi đăng xuất hoặc trước khi đặt session mới
 * để tránh SSR `/he-thong-bai-tap` nhầm user cũ (cookie httpOnly, client không xóa được).
 */
export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: HV_SYNC_COOKIE, value: "", ...baseOpts });
  res.cookies.set({ name: GV_SYNC_COOKIE, value: "", ...baseOpts });
  return res;
}
