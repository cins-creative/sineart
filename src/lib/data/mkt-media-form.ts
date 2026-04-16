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
