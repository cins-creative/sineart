import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/**
 * Lấy bản ghi `ql_thong_tin_hoc_vien` theo email đã chuẩn hóa (trim + chữ thường).
 * Nếu vẫn còn nhiều dòng trùng email (dữ liệu cũ), lấy bản ghi có `id` lớn nhất.
 */
export async function fetchLatestQlThongTinHocVienByEmail(
  supabase: SupabaseClient,
  normalizedEmail: string,
  columns: string,
): Promise<{
  data: Record<string, unknown> | null;
  error: PostgrestError | null;
}> {
  const email = normalizedEmail.trim().toLowerCase();
  if (!email) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select(columns)
    .eq("email", email)
    .order("id", { ascending: false })
    .limit(1);

  const row = data?.[0];
  return {
    data:
      row != null && typeof row === "object"
        ? (row as Record<string, unknown>)
        : null,
    error,
  };
}
