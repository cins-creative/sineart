import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminStaffShellProfile = {
  /** `hr_nhan_su.vai_tro` */
  vai_tro: string | null;
  /** `hr_nhan_su.avatar` — URL Cloudflare Images */
  avatar: string | null;
};

/**
 * Vai trò + ảnh đại diện sidebar admin từ `hr_nhan_su`.
 */
export async function fetchAdminStaffShellProfile(
  supabase: SupabaseClient,
  staffId: number,
): Promise<AdminStaffShellProfile> {
  if (!Number.isFinite(staffId) || staffId <= 0) {
    return { vai_tro: null, avatar: null };
  }

  const res = await supabase.from("hr_nhan_su").select("vai_tro, avatar").eq("id", staffId).maybeSingle();

  if (res.error) return { vai_tro: null, avatar: null };

  const row = res.data as { vai_tro?: unknown; avatar?: unknown } | null;
  if (!row) return { vai_tro: null, avatar: null };

  const v = row.vai_tro;
  const vai_tro = v == null ? null : String(v).trim() || null;

  const a = row.avatar;
  const avatar =
    a != null && String(a).trim() ? String(a).trim() : null;

  return { vai_tro, avatar };
}
