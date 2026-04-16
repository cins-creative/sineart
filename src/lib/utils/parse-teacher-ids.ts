/**
 * `ql_lop_hoc.teacher` có thể là bigint, bigint[], hoặc chuỗi JSON.
 * Dùng chung client/server — không import `next/headers`.
 */
export function parseTeacherIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => Number(v))
      .filter((id) => Number.isFinite(id) && id > 0);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        return parseTeacherIds(JSON.parse(s) as unknown);
      } catch {
        // ignore
      }
    }
    const ids = (s.match(/\d+/g) ?? [])
      .map((v) => Number(v))
      .filter((id) => Number.isFinite(id) && id > 0);
    return [...new Set(ids)];
  }
  const one = Number(raw);
  return Number.isFinite(one) && one > 0 ? [one] : [];
}
