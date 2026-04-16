import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Nhãn vai trò hiển thị sidebar admin: cột `hr_nhan_su.vai_tro` của nhân sự đăng nhập.
 */
export async function fetchAdminStaffVaiTro(
  supabase: SupabaseClient,
  staffId: number
): Promise<string | null> {
  if (!Number.isFinite(staffId) || staffId <= 0) return null;

  const res = await supabase.from("hr_nhan_su").select("vai_tro").eq("id", staffId).maybeSingle();

  if (res.error) return null;

  const v = (res.data as { vai_tro?: unknown } | null)?.vai_tro;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}
