import { LY_THUYET_LIST, getBySlug } from "@/data/ly-thuyet";

/**
 * Tách mảng `video_ly_thuyet` từ DB: slug bài Thư viện vs dòng còn lại (YouTube / định dạng cũ).
 */
export function partitionVideoLyThuyet(
  items: string[] | null | undefined
): { slugs: string[]; extraLines: string } {
  const slugs: string[] = [];
  const extras: string[] = [];
  for (const raw of items ?? []) {
    const t = raw.trim();
    if (!t) continue;
    if (getBySlug(t)) slugs.push(t);
    else extras.push(raw);
  }
  return { slugs, extraLines: extras.join("\n") };
}

/**
 * Ghi lại DB: slugs theo thứ tự giáo trình, sau đó các dòng YouTube thêm thủ công.
 */
export function mergeCatalogSlugsWithExtra(
  slugs: string[],
  extraUrlText: string
): string[] | null {
  const slugSet = new Set(slugs);
  const ordered = LY_THUYET_LIST.filter((b) => slugSet.has(b.slug)).map((b) => b.slug);
  const extra = extraUrlText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const merged = [...ordered, ...extra];
  return merged.length ? merged : null;
}
