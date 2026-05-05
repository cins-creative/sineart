/**
 * Upload ảnh chat qua `/api/phong-hoc/upload-chat-image`.
 * - Nén JPEG/PNG/WebP (trước khi gửi) để tránh 413 / proxy limit.
 * - Parse JSON an toàn khi server trả plain text (413, nginx, …).
 */

/** Khớp `experimental.proxyClientMaxBodySize` trong `next.config.ts`. */
export const CHAT_IMAGE_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const CHAT_IMAGE_UPLOAD_MAX_LABEL = "25 MB";

export function chatImageExceedsMaxSizeMessage(): string {
  return `Dung lượng ảnh vượt quá giới hạn cho phép (${CHAT_IMAGE_UPLOAD_MAX_LABEL}), vui lòng chọn ảnh khác.`;
}

function responseLooksLikePayloadTooLarge(res: Response, text: string): boolean {
  if (res.status === 413) return true;
  const lower = text.trim().toLowerCase();
  return (
    lower.includes("entity too large") ||
    lower.includes("request entity too large") ||
    lower.includes("body exceeded") ||
    lower.includes("payload too large") ||
    lower.includes("maximum body") ||
    lower.includes("content too large")
  );
}

const COMPRESS_IF_LARGER_THAN = 900_000;
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.85;

function looksLikeCompressibleRaster(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return false;
  return true;
}

/**
 * Giảm kích thước file ảnh phía client (canvas → JPEG) khi file đủ lớn.
 * GIF / không phải ảnh raster / lỗi decode → trả nguyên `file`.
 */
export async function compressImageFileForChat(file: File): Promise<File> {
  if (!looksLikeCompressibleRaster(file) || file.size <= COMPRESS_IF_LARGER_THAN) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const finish = (out: File) => {
      URL.revokeObjectURL(url);
      resolve(out.size < file.size ? out : file);
    };

    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w < 1 || h < 1) {
          finish(file);
          return;
        }
        const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              finish(file);
              return;
            }
            const base =
              file.name.replace(/\.[^.]+$/, "") ||
              "chat";
            const out = new File([blob], `${base}.jpg`, {
              type: "image/jpeg",
            });
            finish(out);
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      } catch {
        finish(file);
      }
    };

    img.onerror = () => finish(file);
    img.src = url;
  });
}

export type UploadChatImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Đọc phản hồi upload — luôn dùng thay vì `res.json()` thuần. */
export async function parseUploadChatImageResponse(
  res: Response
): Promise<UploadChatImageResult> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const snippet = text.trim().slice(0, 200);
    if (responseLooksLikePayloadTooLarge(res, snippet)) {
      return { ok: false, error: chatImageExceedsMaxSizeMessage() };
    }
    return {
      ok: false,
      error:
        snippet ||
        (res.status ? `Không tải được ảnh (HTTP ${res.status}).` : "Không tải được ảnh."),
    };
  }

  const obj = data as { ok?: unknown; url?: unknown; error?: unknown };
  if (
    res.ok &&
    obj.ok === true &&
    typeof obj.url === "string" &&
    obj.url.length > 0
  ) {
    return { ok: true, url: obj.url };
  }

  if (!res.ok && responseLooksLikePayloadTooLarge(res, typeof obj.error === "string" ? obj.error : "")) {
    return { ok: false, error: chatImageExceedsMaxSizeMessage() };
  }

  const errMsg =
    typeof obj.error === "string" && obj.error.length > 0
      ? obj.error
      : res.status === 503
        ? "Không kết nối được dịch vụ upload. Thử lại sau hoặc liên hệ quản trị."
        : res.status === 502
          ? "Máy chủ không xử lý được ảnh (lỗi tải lên). Thử lại sau."
          : `Không gửi được ảnh${res.status ? ` (HTTP ${res.status})` : ""}.`;

  return { ok: false, error: errMsg };
}

/** Nén (nếu cần) + POST multipart + parse JSON an toàn. */
export async function postUploadChatImage(file: File): Promise<UploadChatImageResult> {
  const prepared = await compressImageFileForChat(file);
  if (prepared.size > CHAT_IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, error: chatImageExceedsMaxSizeMessage() };
  }
  const fd = new FormData();
  fd.append(
    "file",
    prepared,
    prepared.name || file.name || "chat.jpg"
  );
  const res = await fetch("/api/phong-hoc/upload-chat-image", {
    method: "POST",
    body: fd,
  });
  return parseUploadChatImageResponse(res);
}
