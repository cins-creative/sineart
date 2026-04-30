import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_WORKER = "https://sine-art-api.nguyenthanhtu-nkl.workers.dev";

/** Public upload bài thi → Worker `upload-cf-images` (cùng luồng phòng học chat). */
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
