import type { CourseGroupId } from "@/types/khoa-hoc";

/** Cùng thứ tự / nhãn với trang /khoa-hoc */
export type KhoaHocFilterId = "all" | CourseGroupId;

export const KHOA_HOC_FILTERS: {
  id: KhoaHocFilterId;
  label: string;
  className?: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "lthi", label: "Luyện thi Đại học", className: "g-lthi" },
  { id: "digital", label: "Digital", className: "g-digital" },
  { id: "kids", label: "Kids", className: "g-kids" },
  { id: "botro", label: "Bổ trợ", className: "g-botro" },
];

/** Chỉ 4 nhóm (không có “Tất cả”) — dùng toolbar trang chủ */
export const KHOA_HOC_GROUP_FILTERS = KHOA_HOC_FILTERS.filter(
  (x): x is { id: CourseGroupId; label: string; className?: string } =>
    x.id !== "all"
);

const NHOM_ALIASES: Record<string, KhoaHocFilterId> = {
  all: "all",
  "tat-ca": "all",
  lthi: "lthi",
  "luyen-thi": "lthi",
  "luyen-thi-dh": "lthi",
  digital: "digital",
  kids: "kids",
  botro: "botro",
  "bo-tro": "botro",
};

/** Query `?nhom=` trên `/khoa-hoc` */
export function parseNhomSearchParam(
  raw: string | string[] | undefined | null
): KhoaHocFilterId | null {
  if (raw == null) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string") return null;
  const k = s.trim().toLowerCase();
  if (!k) return null;
  return NHOM_ALIASES[k] ?? null;
}
