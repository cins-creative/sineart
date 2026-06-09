import { NextResponse } from "next/server";

/** CORS cho app iPad / Expo web gọi API phong-hoc cross-origin. */
export const PHONG_HOC_MOBILE_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Cookie",
};

export function phongHocOptionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: PHONG_HOC_MOBILE_CORS });
}

export function phongHocJsonResponse(
  body: unknown,
  init?: { status?: number; headers?: HeadersInit }
): NextResponse {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(PHONG_HOC_MOBILE_CORS)) {
    headers.set(k, v);
  }
  return NextResponse.json(body, { status: init?.status, headers });
}
