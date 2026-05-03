/**
 * Chuẩn hoá segment slug ebook (URL ↔ DB): decode %, NFC, ký tự gạch Unicode → `-` ASCII.
 * Dùng chung `fetchEbookBySlug` và redirect canonical trong `ebook/[slug]/page.tsx`.
 */
export function normalizeEbookSlugSegment(raw: string): string {
  let s = (raw ?? "").trim();
  if (!s) return s;

  try {
    for (let i = 0; i < 3; i++) {
      if (!/%[0-9A-Fa-f]{2}/i.test(s)) break;
      try {
        const d = decodeURIComponent(s);
        if (d === s) break;
        s = d;
      } catch {
        break;
      }
    }
  } catch {
    /* giữ s */
  }

  try {
    s = s.normalize("NFC");
  } catch {
    /* ignore */
  }

  return s
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .trim();
}
