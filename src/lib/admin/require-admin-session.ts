import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin/constants";
import type { AdminSessionPayload } from "@/lib/admin/jwt-admin";
import { verifyAdminSessionToken } from "@/lib/admin/jwt-admin";

/** Phiên admin (cookie JWT). Dùng trong Server Component / Server Action sau khi middleware đã chặn. */
export async function getAdminSessionOrNull(): Promise<AdminSessionPayload | null> {
  const jar = await cookies();
  return verifyAdminSessionToken(jar.get(ADMIN_SESSION_COOKIE)?.value);
}
