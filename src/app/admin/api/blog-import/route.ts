import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { importBlogFromUrl } from "@/lib/admin/blog-import";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let payload: { url?: unknown };
  try {
    payload = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!url) {
    return NextResponse.json({ ok: false, error: "Thiếu URL." }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ ok: false, error: "URL không hợp lệ." }, { status: 400 });
  }

  try {
    const data = await importBlogFromUrl(url);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
