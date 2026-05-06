import { postFormDataToCfWorker } from "@/lib/admin/cf-image-upload";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy upload ảnh chat → Worker `POST /upload-cf-images` (header `x-api-secret`).
 * Dùng chung `postFormDataToCfWorker` với admin để parse phản hồi text/HTML (502) an toàn.
 *
 * Vercel / server:
 * - `SINE_ART_WORKER_SECRET` = **cùng giá trị** với secret Worker (`API_SECRET` Wrangler).
 * - `SINE_ART_WORKER_URL` (tuỳ chọn) = origin Worker (mặc định trong `postFormDataToCfWorker`).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() || process.env.WORKER_API_SECRET?.trim();
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

  const result = await postFormDataToCfWorker(out);
  if (!result.ok) {
    const status =
      result.error.includes("Chưa cấu hình SINE_ART_WORKER_SECRET") ||
      result.error.includes("SINE_ART_WORKER_SECRET")
        ? 503
        : 502;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, url: result.url });
}
