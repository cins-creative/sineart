/**
 * Client-only: chuẩn hoá ảnh bài thi trước khi POST — giảm đứng UI / upload chậm.
 */

/** Cạnh dài tối đa sau resize (đủ đọc bài, nhẹ hơn Full HD dọc raw). */
const MAX_LONG_EDGE = 2200;

export const JPEG_QUALITY = 0.84;

/** Khung chụp từ camera web: 9:16, nhỏ hơn 1080×1920 để encode + upload nhanh hơn. */
export const CAPTURE_OUTPUT_WIDTH = 900;
export const CAPTURE_OUTPUT_HEIGHT = 1600;

/** File lớn hơn ngưỡng → ép JPEG (giữ nguyên nếu nhỏ và đã vừa khung). */
const COMPRESS_MIN_BYTES = 650_000;

export async function yieldToMain(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export async function canvasToExamJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  await yieldToMain();
  await yieldToMain();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Không tạo được ảnh.");
  return blob;
}

/**
 * Ảnh chọn từ máy / paste: resize nếu quá lớn + JPEG nếu file nặng.
 * Giữ nguyên file nếu không decode được (fallback an toàn).
 */
export async function prepareExamImageFile(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const long = Math.max(w, h);
    const needScale = long > MAX_LONG_EDGE;
    const needCompress = file.size >= COMPRESS_MIN_BYTES;
    if (!needScale && !needCompress) {
      return file;
    }

    const scale = needScale ? MAX_LONG_EDGE / long : 1;
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, tw, th);
    await yieldToMain();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
    );
    return out ?? file;
  } finally {
    bitmap.close();
  }
}

export function pickImageFileFromClipboard(items: DataTransferItemList): File | null {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item?.kind === "file") {
      const file = item.getAsFile();
      if (file?.type.startsWith("image/")) return file;
    }
  }
  return null;
}
