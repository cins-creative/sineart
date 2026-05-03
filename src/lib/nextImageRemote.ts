import { isCloudflareImageUrl } from "@/lib/cfImageUrl";

/**
 * `next/image` chỉ tối ưu khi `images.remotePatterns` khớp — ảnh Cloudflare Images
 * (imagedelivery.net) đã cấu hình. URL khác (avatar Google/Facebook, blob preview…)
 * giữ nguyên file qua `unoptimized`.
 */
export function nextImageShouldUnoptimize(src: string): boolean {
  const s = src.trim();
  if (!s) return true;
  if (s.startsWith("/")) return false;
  if (/^data:image\//i.test(s) || /^blob:/i.test(s)) return true;
  return !isCloudflareImageUrl(s);
}
