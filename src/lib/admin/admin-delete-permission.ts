import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";

import { ADMIN_DELETE_FORBIDDEN_MSG, adminStaffCanDeleteRecords } from "@/lib/admin/staff-mutation-access";

/**
 * Kiểm tra `hr_nhan_su.vai_tro` có được xóa bản ghi (qua action delete) hay không.
 * Gọi sau khi đã có `supabase` + `session.staffId`.
 */
export async function assertStaffMayDeleteRecords(
  supabase: SupabaseClient,
  staffId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await fetchAdminStaffShellProfile(supabase, staffId);
  if (!adminStaffCanDeleteRecords(profile.vai_tro)) {
    return { ok: false, error: ADMIN_DELETE_FORBIDDEN_MSG };
  }
  return { ok: true };
}
