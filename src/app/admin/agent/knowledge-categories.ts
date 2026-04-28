/** Slug lưu Supabase `ag_knowledge_base.category` — khớp key JSON export. */

export type KbCategorySlug =
  | "hoc_phi"
  | "khoa_hoc"
  | "thi_dai_hoc"
  | "lich_hoc"
  | "chinh_sach"
  | "dia_diem"
  | "khac";

export const KB_CATEGORY_ORDER: readonly KbCategorySlug[] = [
  "hoc_phi",
  "khoa_hoc",
  "thi_dai_hoc",
  "lich_hoc",
  "chinh_sach",
  "dia_diem",
  "khac",
];

export const KB_CATEGORY_LABEL_VI: Record<KbCategorySlug, string> = {
  hoc_phi: "Học phí",
  khoa_hoc: "Khóa học",
  thi_dai_hoc: "Thi đại học",
  lich_hoc: "Lịch học",
  chinh_sach: "Chính sách",
  dia_diem: "Địa điểm",
  khac: "Khác",
};

export type PriorityValue = "high" | "medium" | "low";

export const PRIORITY_OPTIONS: { value: PriorityValue; label: string }[] = [
  { value: "high", label: "Cao (high)" },
  { value: "medium", label: "Trung bình (medium)" },
  { value: "low", label: "Thấp (low)" },
];

export function isKbCategorySlug(s: string): s is KbCategorySlug {
  return (KB_CATEGORY_ORDER as readonly string[]).includes(s);
}
