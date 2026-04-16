import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";

const DEFAULT_WORKER = "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/** POST multipart field `file` → Cloudflare Images qua Worker (đã xác thực admin). */
export async function handleAdminCfImageUpload(req: Request): Promise<NextResponse> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() || process.env.WORKER_API_SECRET?.trim();
  const base = process.env.SINE_ART_WORKER_URL?.trim() || DEFAULT_WORKER;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình SINE_ART_WORKER_SECRET trên server." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body không phải multipart.", ok: false }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Thiếu file.", ok: false }, { status: 400 });
  }

  const mime = file.type || "image/jpeg";
  const filename = `upload.${extFromMime(mime)}`;
  const out = new FormData();
  out.append("file", file, filename);

  const url = `${base.replace(/\/$/, "")}/upload-cf-images`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-secret": secret },
    body: out,
  });

  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error ?? res.statusText)
        : res.statusText;
    return NextResponse.json({ error: msg, ok: false }, { status: 502 });
  }

  if (
    typeof json === "object" &&
    json !== null &&
    (json as { success?: boolean }).success === true &&
    typeof (json as { url?: unknown }).url === "string"
  ) {
    return NextResponse.json({ ok: true, url: (json as { url: string }).url });
  }

  return NextResponse.json({ error: "Phản hồi worker không hợp lệ.", ok: false }, { status: 502 });
}
