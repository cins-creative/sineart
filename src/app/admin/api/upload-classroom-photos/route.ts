import { NextResponse } from "next/server";

import { postFormDataToCfWorker } from "@/lib/admin/cf-image-upload";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { optimizeBufferForCfUpload } from "@/lib/admin/sharp-classroom-photo";

export const runtime = "nodejs";

const MAX_FILES = 24;
const MAX_INPUT_BYTES = 18 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  if (
    !process.env.SINE_ART_WORKER_SECRET?.trim() &&
    !process.env.WORKER_API_SECRET?.trim()
  ) {
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

  const entries = form.getAll("files");
  const files = entries.filter((x): x is File => x instanceof File && x.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "Chọn ít nhất một ảnh." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { ok: false, error: `Tối đa ${MAX_FILES} ảnh mỗi lần.` },
      { status: 400 },
    );
  }

  const urls: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    if (file.size > MAX_INPUT_BYTES) {
      errors.push(`Ảnh ${i + 1}: quá lớn (tối đa ~18MB).`);
      continue;
    }
    if (!/^image\//i.test(file.type) && !/\.(jpe?g|png|webp|gif|bmp|tif)$/i.test(file.name)) {
      errors.push(`Ảnh ${i + 1}: không phải định dạng ảnh hợp lệ.`);
      continue;
    }

    try {
      const ab = await file.arrayBuffer();
      const raw = Buffer.from(ab);
      const { buffer, filename } = await optimizeBufferForCfUpload(raw, `u${i}`);
      const fd = new FormData();
      fd.append("file", new Blob([new Uint8Array(buffer)], { type: "image/webp" }), filename);
      const up = await postFormDataToCfWorker(fd);
      if (!up.ok) {
        errors.push(`Ảnh ${i + 1}: ${up.error}`);
        continue;
      }
      urls.push(up.url);
    } catch (e) {
      errors.push(
        `Ảnh ${i + 1}: ${e instanceof Error ? e.message : "xử lý thất bại."}`,
      );
    }
  }

  if (urls.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          errors.join(" ") ||
          "Không upload được ảnh nào. Kiểm tra Worker Cloudflare và định dạng file.",
        errors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    urls,
    warnings: errors.length ? errors : undefined,
  });
}
