/** Kích thước trang danh sách admin — tối đa 10 dòng/trang. */
export const ADMIN_LIST_PAGE_SIZE = 10;

export function parseAdminListPage(raw: string | string[] | undefined | null): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function parseAdminListQuery(raw: string | string[] | undefined | null): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null || typeof v !== "string") return "";
  return v.trim().slice(0, 200);
}

export function adminListTotalPages(total: number, pageSize = ADMIN_LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
