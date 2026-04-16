/**
 * URL phòng học: `/phong-hoc/{slug}` với slug suy từ `ql_lop_hoc.class_name`
 * (vd: `ttm_03` → `/phong-hoc/ttm_03`).
 */

/** Chuẩn hoá `class_name` → segment đường dẫn (so khớp session ↔ URL). */
export function phongHocSlugFromClassName(className: string): string {
  const s = String(className ?? "").trim();
  if (!s) return "";
  return s.replace(/\s+/g, "_").toLowerCase();
}

/** Slug từ `params.slug` / địa chỉ (decode + lower). */
export function normalizePhongHocPathSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}
