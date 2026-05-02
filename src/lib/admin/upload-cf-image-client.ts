/** POST multipart `file` → `/admin/api/upload-cf-image` (cookie admin). */
export type UploadCfImageProgress = (percent: number) => void;

function safeImageFilename(filename: string): string {
  const t = typeof filename === "string" ? filename.trim() : "";
  return t.length > 0 ? t : "image.jpg";
}

function parseXhrUploadJson(xhr: XMLHttpRequest): { ok: boolean; url?: string; error?: string } {
  try {
    const json: unknown = JSON.parse(xhr.responseText || "{}");
    if (typeof json !== "object" || json === null) return { ok: false, error: "Phản hồi không hợp lệ." };
    const ok = (json as { ok?: unknown }).ok === true;
    const url = (json as { url?: unknown }).url;
    const errRaw = (json as { error?: unknown }).error;
    const error = typeof errRaw === "string" ? errRaw : undefined;
    return {
      ok,
      url: typeof url === "string" ? url : undefined,
      error,
    };
  } catch {
    return { ok: false, error: "Phản hồi không hợp lệ từ máy chủ." };
  }
}

function xhrFailedMessage(xhr: XMLHttpRequest): string {
  const parsed = parseXhrUploadJson(xhr);
  if (parsed.error?.trim()) return parsed.error.trim();
  if (xhr.status) return `Tải ảnh thất bại (${xhr.status}).`;
  return "Lỗi mạng khi tải ảnh.";
}

/** Tiến trình gửi file: 0–99 trong lúc upload, 100 khi máy chủ trả JSON thành công. */
const XHR_UPLOAD_TIMEOUT_MS = 120_000;

function uploadAdminCfImageWithProgress(blob: Blob, filename: string, onProgress: UploadCfImageProgress): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/api/upload-cf-image");
    xhr.withCredentials = true;
    xhr.timeout = XHR_UPLOAD_TIMEOUT_MS;

    onProgress(0);

    xhr.upload.addEventListener("loadstart", () => {
      onProgress(1);
    });

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      } else if (ev.loaded > 0) {
        onProgress(55);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(xhrFailedMessage(xhr)));
        return;
      }
      const parsed = parseXhrUploadJson(xhr);
      if (!parsed.ok || !parsed.url?.trim()) {
        reject(new Error(parsed.error?.trim() || "Tải ảnh thất bại."));
        return;
      }
      onProgress(100);
      resolve(parsed.url.trim());
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Lỗi mạng khi tải ảnh."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Đã hủy tải ảnh."));
    });

    xhr.addEventListener("timeout", () => {
      xhr.abort();
      reject(new Error(`Hết thời gian chờ (${Math.round(XHR_UPLOAD_TIMEOUT_MS / 1000)}s). Kiểm tra mạng hoặc máy chủ upload.`));
    });

    const fd = new FormData();
    fd.append("file", blob, safeImageFilename(filename));
    xhr.send(fd);
  });
}

export async function uploadAdminCfImage(
  blob: Blob,
  filename: string,
  onProgress?: UploadCfImageProgress,
): Promise<string> {
  if (onProgress) {
    return uploadAdminCfImageWithProgress(blob, filename, onProgress);
  }

  const fd = new FormData();
  fd.append("file", blob, safeImageFilename(filename));
  const res = await fetch("/admin/api/upload-cf-image", { method: "POST", body: fd, credentials: "same-origin" });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok || typeof json !== "object" || json === null || (json as { ok?: unknown }).ok !== true) {
    const err =
      typeof json === "object" && json !== null && "error" in json && String((json as { error?: unknown }).error).trim()
        ? String((json as { error?: unknown }).error)
        : `Tải ảnh thất bại (HTTP ${res.status}).`;
    throw new Error(err);
  }
  const url = (json as { url?: unknown }).url;
  if (typeof url !== "string" || !url.trim()) throw new Error("Không nhận được link ảnh.");
  return url.trim();
}
