/**
 * Thẻ ngành học trên trang chủ (CINS `article_bai_viet`: tieu_de, meta.ma_nganh, thumbnail/cover_id).
 */
export type CareerCard = {
  slug: string;
  title: string;
  sub: string;
  href: string;
  imageUrl: string | null;
  emoji: string;
  tint: string;
  grad: string;
};
