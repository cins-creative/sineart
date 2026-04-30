/** Gợi ý khi Postgres trả 42501 (insufficient_privilege). */
export function formatSupabaseWriteError(
  error: { message?: string; code?: string },
  tableHint?: string,
): string {
  const msg = error.message ?? "Lỗi Supabase";
  const tbl = tableHint ? ` (${tableHint})` : "";
  if (error.code === "42501") {
    return `${msg}${tbl} — Thiếu quyền ghi DB (mã 42501). Kiểm tra: (1) .env.local: SUPABASE_SERVICE_ROLE_KEY = secret **service_role** (Dashboard → Settings → API), không dùng anon key. (2) SQL Editor: GRANT ALL ON TABLE public.thi_thu_de_thi TO service_role; (và thi_thu_ky_thi, thi_thu_bai_nop nếu cần).`;
  }
  return msg;
}
