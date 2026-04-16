import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_WORKER = "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";

/**
 * Proxy upload ảnh chat → Worker `POST /upload-cf-images` (header `x-api-secret`).
 *
 * Vercel / server:
 * - `SINE_ART_WORKER_SECRET` = **cùng giá trị** với secret Worker (`env.API_SECRET` trong code Worker / Wrangler `API_SECRET`).
 * - `SINE_ART_WORKER_URL` (tuỳ chọn) = origin Worker, mặc định DEFAULT_WORKER.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() || process.env.WORKER_API_SECRET?.trim();
  const base = process.env.SINE_ART_WORKER_URL?.trim() || DEFAULT_WORKER;
  if (!secret) {
    return NextResponse.json(
      {
        error: "Chưa cấu hình SINE_ART_WORKER_SECRET trên server.",
        hint: "Đặt biến môi trường bằng đúng giá trị API_SECRET đã khai báo trên Cloudflare Worker (Wrangler: wrangler secret put API_SECRET). Header gửi lên worker là x-api-secret.",
        ok: false,
      },
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

  const out = new FormData();
  out.append("file", file, "chat.jpg");

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
