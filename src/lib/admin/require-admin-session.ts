import { cookies } from "next/headers";
import { cache } from "react";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import type { AdminSessionPayload } from "@/lib/admin/jwt-admin";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";
import { isHrStaffBlockedFromAdminStatus } from "@/lib/admin/staff-employment-status";
import { clearAdminSessionOnCookieJar } from "@/lib/admin/session-cookie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Phiên admin (cookie JWT + trạng thái nhân sự).
 * Dùng trong Server Component / Server Action; nếu nhân sự đã nghỉ hoặc không còn dòng DB, xóa cookie và trả null.
 */
export const getAdminSessionOrNull = cache(async (): Promise<AdminSessionPayload | null> => {
  const jar = await cookies();
  const session = await verifyAdminSessionToken(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return null;

  const supabase = createServiceRoleClient();
  if (!supabase) return session;

  const { data, error } = await supabase
    .from("hr_nhan_su")
    .select("status")
    .eq("id", session.staffId)
    .maybeSingle();

  if (error) return session;

  if (!data) {
    clearAdminSessionOnCookieJar(jar);
    return null;
  }

  if (isHrStaffBlockedFromAdminStatus(data.status as string | null)) {
    clearAdminSessionOnCookieJar(jar);
    return null;
  }

  return session;
});
