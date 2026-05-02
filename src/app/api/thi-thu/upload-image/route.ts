import { NextResponse } from "next/server";

import { extractWorkerImageUploadUrl } from "@/lib/admin/cf-image-upload";

export const runtime = "nodejs";

const DEFAULT_WORKER = "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";

/** Public upload bài thi → Worker `upload-cf-images` (cùng luồng admin /cf-image-upload). */
export async function POST(req: Request): Promise<NextResponse> {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() || process.env.WORKER_API_SECRET?.trim();
  const base = process.env.SINE_ART_WORKER_URL?.trim() || DEFAULT_WORKER;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Chưa cấu hình SINE_ART_WORKER_SECRET trên server.",
      },
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

  const ext =
    file instanceof File && file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : ".jpg";
  const out = new FormData();
  out.append("file", file, `thi-thu${ext}`);

  const url = `${base.replace(/\/$/, "")}/upload-cf-images`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-secret": secret },
    body: out,
  });

  const rawText = await res.text();
  let json: unknown = {};
  try {
    json = rawText.trim() ? JSON.parse(rawText) : {};
  } catch {
    const preview = rawText.replace(/\s+/g, " ").trim().slice(0, 160);
    return NextResponse.json(
      {
        ok: false,
        error:
          preview || `Phản hồi worker không phải JSON (HTTP ${res.status}).`,
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error ?? res.statusText)
        : res.statusText;
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  const extracted = extractWorkerImageUploadUrl(json);
  if (extracted) {
    return NextResponse.json({ ok: true, url: extracted });
  }

  const hint =
    typeof json === "object" && json !== null && "error" in json
      ? String((json as { error?: unknown }).error)
      : rawText.slice(0, 280);
  return NextResponse.json(
    {
      ok: false,
      error:
        hint && hint !== "[object Object]"
          ? hint
          : "Phản hồi worker không có URL ảnh hợp lệ.",
    },
    { status: 502 },
  );
}
