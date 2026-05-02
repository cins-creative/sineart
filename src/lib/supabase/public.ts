/**
 * Supabase anon client cho dữ liệu public — không gọi `cookies()`.
 * Tránh `DYNAMIC_SERVER_USAGE` trên các route dùng Nav / listing khóa học.
 *
 * Cùng implementation với `createStaticClient` (timeout fetch).
 */
export { createStaticClient as createPublicSupabaseClient } from "./static";
