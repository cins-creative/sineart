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

/**
 * Account hash CF Images chính thức của Sine Art — ảnh upload qua worker đều
 * thuộc account này và `Allowed origins` đã whitelist cho sineart.vn.
 */
export const SINE_ART_CF_ACCOUNT = "PtnQ1mNuCedkboD0kJ2_4w";

const CF_IMAGE_RE =
  /^(https?:\/\/imagedelivery\.net\/)([^/]+)\/([^/]+)\/([^/?#]+)(.*)$/i;

export function isCloudflareImageUrl(url: string): boolean {
  return CF_IMAGE_RE.test(url.trim());
}

/**
 * Rewrite account hash về `SINE_ART_CF_ACCOUNT`.
 *
 * Bối cảnh: một số row cũ trong DB (`mkt_ebooks.thumbnail`, `img_src_link`…)
 * được paste URL với account hash cũ (ví dụ `1b18105c3bd0ffb1d78c010d220ae8e1`)
 * trong khi image ID thực tế đã tồn tại ở account Sine Art. Account hash cũ bị
 * "Allowed origins" từ chối (err=9426) nên `<img>` không render được.
 *
 * Hàm này **chỉ đổi đoạn account**, giữ nguyên image ID + variant + query.
 */
export function cfImageNormalizeAccount(
  url: string | null | undefined,
): string | null {
  if (url == null) return null;
  const u = url.trim();
  if (!u) return null;
  const m = u.match(CF_IMAGE_RE);
  if (!m) return u;
  const [, origin, account, imageId, variant, rest] = m;
  if (account === SINE_ART_CF_ACCOUNT) return u;
  return `${origin}${SINE_ART_CF_ACCOUNT}/${imageId}/${variant}${rest}`;
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
