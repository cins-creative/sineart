import { cfResolvedImageUrl, SINE_ART_CF_ACCOUNT } from "@/lib/cfImageUrl";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Môn chưa có thumbnail trên CINS (`plh_*`) — dùng ảnh môn gần nhất đã có UUID
 * trong cùng catalog `edu_mon_thi` (verified 2026-06).
 */
const MON_THI_MA_FALLBACK_CF_ID: Record<string, string> = {
  hinh_hoa_toan_than: "2ca02768-7b48-4c0b-74da-8fda2b6ca300",
  tuong_tron: "22d2f199-22cc-4e8f-0575-dccb70875500",
  bo_cuc_cham_noi: "73b432c5-1306-4ebe-df38-cd9fd718ae00",
};

export function isMonThiPlaceholder(thumbnailId: string | null | undefined): boolean {
  const t = thumbnailId?.trim() ?? "";
  if (!t) return true;
  return t.startsWith("plh_");
}

export function monThiCfDeliveryUrl(thumbnailId: string, variant = "public"): string {
  return `https://imagedelivery.net/${SINE_ART_CF_ACCOUNT}/${thumbnailId}/${variant}`;
}

export function resolveMonThiImageUrl(thumbnailId: string | null | undefined): string | null {
  const t = thumbnailId?.trim() ?? "";
  if (!t || isMonThiPlaceholder(t)) return null;
  if (UUID_RE.test(t)) {
    return cfResolvedImageUrl(monThiCfDeliveryUrl(t), "thumb");
  }
  if (/^https?:\/\//i.test(t)) {
    return cfResolvedImageUrl(t, "thumb");
  }
  return null;
}

export function resolveMonThiThumbDisplay(
  thumbnailId: string | null | undefined,
  ma: string,
): { imageUrl: string | null; placeholder: boolean } {
  const direct = resolveMonThiImageUrl(thumbnailId);
  if (direct) return { imageUrl: direct, placeholder: false };

  const fallbackId = MON_THI_MA_FALLBACK_CF_ID[ma.trim()];
  if (fallbackId) {
    const url = cfResolvedImageUrl(monThiCfDeliveryUrl(fallbackId), "thumb");
    if (url) return { imageUrl: url, placeholder: false };
  }

  return { imageUrl: null, placeholder: true };
}

const MON_THI_GRADS = [
  "linear-gradient(135deg,#fef9d6,#fde859)",
  "linear-gradient(135deg,#f1e6ff,#bb89f8)",
  "linear-gradient(135deg,#dcfff2,#6efec0)",
  "linear-gradient(135deg,#fef0e4,#f8a668)",
  "linear-gradient(135deg,#fde8f3,#ee5b9f)",
];

export function monThiPlaceholderGrad(ma: string): string {
  let h = 0;
  for (let i = 0; i < ma.length; i += 1) h = (h + ma.charCodeAt(i) * (i + 1)) % MON_THI_GRADS.length;
  return MON_THI_GRADS[h] ?? MON_THI_GRADS[0]!;
}

/** Viết tắt hiển thị trên placeholder (vd. "Hình họa Chân dung" → "HC"). */
export function monThiPlaceholderLabel(ten: string, ma: string): string {
  const words = ten.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (ma.slice(0, 2) || ten.slice(0, 2)).toUpperCase();
}
