import type { SupabaseClient } from "@supabase/supabase-js";

import { LEVEL_HINH_HOA_VALUES } from "@/lib/ql-lop-hoc/level-hinh-hoa";

/**
 * Đọc danh sách "Loại Hình họa" động từ bảng `ql_loai_hinh_hoa_options`.
 *
 * - Tự dedupe + trim, sort theo tên (locale `vi`).
 * - Nếu bảng chưa tồn tại (PostgREST trả về 42P01 / "relation … does not exist")
 *   → fallback về `LEVEL_HINH_HOA_VALUES` để UI không bị vỡ trước khi migration chạy.
 */
export async function fetchLoaiHinhHoaOptions(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("ql_loai_hinh_hoa_options")
    .select("ten")
    .order("ten", { ascending: true });

  if (error) {
    const msg = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (
      msg.includes("42p01") ||
      msg.includes("does not exist") ||
      msg.includes("could not find the table")
    ) {
      return [...LEVEL_HINH_HOA_VALUES];
    }
    return [...LEVEL_HINH_HOA_VALUES];
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of (data ?? []) as { ten?: unknown }[]) {
    const t = String(row.ten ?? "").trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length > 0 ? out : [...LEVEL_HINH_HOA_VALUES];
}
