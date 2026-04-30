import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Dev-only: cảnh báo nếu nhầm anon/authenticated key vào SUPABASE_SERVICE_ROLE_KEY → hay gặp 42501 khi INSERT/UPDATE. */
function warnIfServiceRoleKeyLooksWrong(key: string): void {
  if (process.env.NODE_ENV !== "development") return;
  const payload = decodeJwtPayload(key.trim());
  const role = typeof payload?.role === "string" ? payload.role : null;
  if (role && role !== "service_role") {
    console.warn(
      `[supabase] SUPABASE_SERVICE_ROLE_KEY có JWT role "${role}". Cần secret **service_role** (Dashboard → Settings → API). Dùng anon key sẽ gây lỗi permission (42501) khi ghi bảng.`,
    );
  }
}

/**
 * Chỉ dùng trong Route Handler / Server Action — không import vào Client Component.
 * Cần `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) cho `hp_*`, `ql_quan_ly_hoc_vien`.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  warnIfServiceRoleKeyLooksWrong(key);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
