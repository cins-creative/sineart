import { createClient as createJsClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build-safe anon Supabase client — KHÔNG đụng `next/headers.cookies()`.
 *
 * Dùng cho:
 *   - `generateStaticParams` (chạy lúc build, không có HTTP request nên
 *     `cookies()` sẽ throw `next-dynamic-api-wrong-context`).
 *   - Server Component đọc dữ liệu public (anon SELECT) không cần session
 *     (ebook, tra-cứu, khóa học, gallery, v.v.).
 *
 * Với data cần theo session (hr, admin), vẫn dùng
 * `@/lib/supabase/server#createClient` — client đó đọc cookie để lấy auth.
 */
export function createStaticClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createJsClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
