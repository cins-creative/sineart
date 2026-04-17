/** Khớp key `TYPE_COLOR` trong timeline Quản lý media. */
export const MKT_MEDIA_TYPE_OPTIONS = [
  "Album ảnh",
  "Ảnh",
  "Video 16x9",
  "Short 9x16",
  "Web",
  "Micro interactive",
] as const;

export type MktMediaTypeOption = (typeof MKT_MEDIA_TYPE_OPTIONS)[number];

export function isAllowedMktMediaType(s: string | null | undefined): s is MktMediaTypeOption {
  return Boolean(s && (MKT_MEDIA_TYPE_OPTIONS as readonly string[]).includes(s));
}

/** Khớp `STATUS_ORDER` / pill trên timeline Quản lý media. */
export const MKT_MEDIA_STATUS_OPTIONS = ["Đang làm", "Chờ xác nhận", "Hoàn thành", "Hủy dự án"] as const;

export type MktMediaStatusOption = (typeof MKT_MEDIA_STATUS_OPTIONS)[number];

export function isAllowedMktMediaStatus(s: string | null | undefined): s is MktMediaStatusOption {
  return Boolean(s && (MKT_MEDIA_STATUS_OPTIONS as readonly string[]).includes(s));
}
