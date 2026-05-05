import { cache } from "react";

import { getMktHomeContentRow } from "@/lib/data/mkt-home-cached";

/** Chuẩn hoá `mkt_home_content.img_class` → danh sách URL hiển thị được. */
export function normalizeImgClassUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((s) => /^https?:\/\//i.test(s));
}

/**
 * URL ảnh lớp thực tế (cột `img_class`) — cùng cache với `getMktHomeContentRow`.
 */
export const getHomeClassroomPhotoUrls = cache(async (): Promise<string[]> => {
  const row = await getMktHomeContentRow();
  if (!row) return [];
  return normalizeImgClassUrls(row.img_class);
});
