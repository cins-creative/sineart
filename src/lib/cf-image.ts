import { cfImageNormalizeAccount, SINE_ART_CF_ACCOUNT } from "@/lib/cfImageUrl";

const CF_DELIVERY = /^https?:\/\/imagedelivery\.net\//i;

/**
 * URL ảnh Cloudflare Images — nhận **image ID** (UUID) hoặc URL đầy đủ đã lưu trong DB.
 * Variant mặc định `public` (OG / hero); dùng `thumbnail` nếu đã tạo variant trên CF dashboard.
 */
export function cfImage(idOrUrl: string | null | undefined, variant = "public"): string | null {
  if (!idOrUrl?.trim()) return null;
  const t = idOrUrl.trim();
  if (CF_DELIVERY.test(t)) {
    return cfImageNormalizeAccount(t) ?? t;
  }
  const v = variant.trim() || "public";
  return `https://imagedelivery.net/${SINE_ART_CF_ACCOUNT}/${t}/${v}`;
}
