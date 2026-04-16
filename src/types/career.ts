/**
 * Thẻ ngành học trên trang chủ (CINS `bai_viet_nganh_hoc`: name, ma_nganh, thumbnail).
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
