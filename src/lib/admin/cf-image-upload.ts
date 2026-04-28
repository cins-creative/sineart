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

  const rawText = await res.text();
  let json: unknown = {};
  try {
    json = rawText.trim() ? JSON.parse(rawText) : {};
  } catch {
    const preview = rawText.replace(/\s+/g, " ").trim().slice(0, 160);
    const wrongAgentWorker = /sine art agent/i.test(rawText);
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return "";
      }
    })();

    /** URL đúng sine-art-api nhưng Cloudflare đang mount nhầm script Agent → vẫn trả plain text */
    const agentBundleOnUploadHost =
      wrongAgentWorker && /sine-art-api/i.test(host);

    let msg: string;
    if (agentBundleOnUploadHost) {
      msg =
        `Worker ${host} đang chạy code Messenger Agent (text "Sine Art Agent…"), không phải sine-art-api upload. Không phải lỗi biến môi trường: cần trên Cloudflare Workers deploy lại đúng file repo workers/sine-art-api/index.mjs vào worker gắn subdomain này (route POST /upload-cf-images). Giữ Worker Agent (api-meta) là project riêng. Đang gọi: ${url}`;
    } else if (wrongAgentWorker) {
      msg =
        `Upload nhận text Worker Agent — SINE_ART_WORKER_URL đang trỏ Worker Messenger (api-meta). Đặt origin của Worker sine-art-api (upload-cf-images). Đang gọi: ${url}`;
    } else {
      msg = `Phản hồi worker không phải JSON (${res.status}). Body: ${preview || "(rỗng)"}`;
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error?: unknown }).error ?? res.statusText)
        : res.statusText;
    return NextResponse.json({ error: msg, ok: false }, { status: 502 });
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
          : "Phản hồi worker không có URL ảnh hợp lệ. Kiểm tra Worker /upload-cf-images và biến CF trên Cloudflare.",
    },
    { status: 502 },
  );
}

/** Chuẩn hoá URL từ `{ success, url }` hoặc payload Cloudflare Images v4 lẫn vào. */
function extractWorkerImageUploadUrl(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;

  const topUrl = o.url;
  if (typeof topUrl === "string") {
    const u = topUrl.trim();
    if (/^https?:\/\//i.test(u)) return u;
  }

  const inner =
    typeof o.result === "object" && o.result !== null ? (o.result as Record<string, unknown>) : o;

  const variants = inner.variants;
  if (Array.isArray(variants)) {
    const urls = variants
      .filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v.trim()))
      .map((v) => v.trim());
    if (urls.length) {
      const pub = urls.find((x) => x.endsWith("/public"));
      return pub ?? urls[0];
    }
  }

  const ok = o.success === true || o.ok === true;
  if (ok && typeof topUrl === "string" && topUrl.trim()) return topUrl.trim();

  return null;
}
