import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";

const DEFAULT_WORKER = "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";
const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  "pdf",
  "xlsx",
  "xls",
  "csv",
  "docx",
  "doc",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

/** POST multipart field `file` → R2 qua Worker `POST /upload` (đã xác thực admin). */
export async function handleAdminSaoKeR2Upload(req: Request): Promise<NextResponse> {
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
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Body không phải multipart." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Thiếu file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File tối đa 20MB." }, { status: 400 });
  }

  const name = file instanceof File ? file.name : "upload.bin";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { ok: false, error: "Định dạng không được phép (PDF, Excel, Word, ảnh)." },
      { status: 400 },
    );
  }

  const out = new FormData();
  out.append("file", file, name);

  const url = `${base.replace(/\/$/, "")}/upload`;
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
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  if (
    typeof json === "object" &&
    json !== null &&
    (json as { success?: boolean }).success === true &&
    typeof (json as { url?: unknown }).url === "string"
  ) {
    return NextResponse.json({ ok: true, url: (json as { url: string }).url });
  }

  return NextResponse.json({ ok: false, error: "Phản hồi worker không hợp lệ." }, { status: 502 });
}
