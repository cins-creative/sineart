import type { GalleryDisplayItem } from "@/types/homepage";

/** Chuẩn hoá điểm (Supabase/JSON đôi khi trả string). */
export function galleryNumericScore(item: GalleryDisplayItem): number | null {
  const raw = item.score as unknown;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Điểm cao → thấp; không điểm xếp sau; cùng điểm thì `id` lớn hơn (mới hơn) trước. */
export function compareGalleryByScoreDesc(
  a: GalleryDisplayItem,
  b: GalleryDisplayItem
): number {
  const sa = galleryNumericScore(a);
  const sb = galleryNumericScore(b);
  if (sa != null && sb != null) {
    if (sa !== sb) return sb - sa;
  } else if (sa != null || sb != null) {
    if (sa == null) return 1;
    if (sb == null) return -1;
  }
  const ida = Number(a.id);
  const idb = Number(b.id);
  if (Number.isFinite(ida) && Number.isFinite(idb) && ida !== idb) return idb - ida;
  return 0;
}

export function sortGalleryItemsByScoreDesc(
  items: GalleryDisplayItem[]
): GalleryDisplayItem[] {
  return [...items].sort(compareGalleryByScoreDesc);
}
