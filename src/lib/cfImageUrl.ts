/**
 * Cloudflare Images: `https://imagedelivery.net/<account>/<image_id>/<variant>`
 *
 * Bật **Flexible variants** (Dashboard → Images → Delivery), rồi đặt biến môi trường
 * (ví dụ `NEXT_PUBLIC_CF_IMAGE_VARIANT=w=900,fit=contain,quality=85`) để thay segment
 * variant — phía Cloudflare trả ảnh **fit=contain** (không crop), kích thước tối đa theo `w=`.
 *
 * Không đặt biến = giữ nguyên URL trong database (variant gốc, ví dụ `public`).
 *
 * Tránh `fit=cover` trong variant thumbnail nếu thấy ảnh trong gallery bị **crop** — dùng `contain`.
 *
 * @see https://developers.cloudflare.com/images/manage-images/enable-flexible-variants/
 */

const CF_IMAGE_RE =
  /^(https?:\/\/imagedelivery\.net\/)([^/]+)\/([^/]+)\/([^/?#]+)(.*)$/i;

export function isCloudflareImageUrl(url: string): boolean {
  return CF_IMAGE_RE.test(url.trim());
}

/**
 * Thay segment variant bằng `variant` (chuỗi flexible, không khoảng trắng, dùng dấu phẩy).
 */
export function cfImageWithVariant(
  url: string | null | undefined,
  variant: string
): string | null {
  if (url == null || url === "") return null;
  const u = url.trim();
  const v = variant.trim();
  if (!v) return u;

  const m = u.match(CF_IMAGE_RE);
  if (!m) return u;

  const [, origin, account, imageId, , rest] = m;
  return `${origin}${account}/${imageId}/${v}${rest}`;
}

function envThumbVariant(): string {
  return (
    process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT_THUMB?.trim() ||
    process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT?.trim() ||
    ""
  );
}

function envFullVariant(): string {
  return (
    process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT_FULL?.trim() ||
    process.env.NEXT_PUBLIC_CF_IMAGE_VARIANT?.trim() ||
    ""
  );
}

export function cfImageForLightbox(url: string | null | undefined): string | null {
  if (url == null || url === "") return null;
  return cfImageWithVariant(url, envFullVariant());
}

export function cfImageForThumbnail(url: string | null | undefined): string | null {
  if (url == null || url === "") return null;
  return cfImageWithVariant(url, envThumbVariant());
}
