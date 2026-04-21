import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { traCuuImagesToHtml, type TraCuuImagePayload } from "@/lib/admin/tra-cuu-image-to-html";

export const runtime = "nodejs";
export const maxDuration = 300;

type ReqBody = { images?: unknown; note?: unknown };

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images: TraCuuImagePayload[] = [];
  for (const it of rawImages) {
    if (!it || typeof it !== "object") continue;
    const { mediaType, base64 } = it as Record<string, unknown>;
    if (
      typeof mediaType !== "string" ||
      typeof base64 !== "string" ||
      !ALLOWED_MIME.has(mediaType) ||
      !base64.trim()
    ) {
      continue;
    }
    images.push({ mediaType, base64: base64.trim() });
  }

  if (!images.length) {
    return NextResponse.json(
      { ok: false, error: "Không có ảnh hợp lệ (chỉ chấp nhận PNG, JPEG, WEBP, GIF)." },
      { status: 400 },
    );
  }
  if (images.length > 8) {
    return NextResponse.json(
      { ok: false, error: "Chỉ hỗ trợ tối đa 8 ảnh mỗi lần." },
      { status: 400 },
    );
  }

  const note = typeof body.note === "string" ? body.note : "";

  try {
    const html = await traCuuImagesToHtml(images, note);
    return NextResponse.json({ ok: true, html });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
