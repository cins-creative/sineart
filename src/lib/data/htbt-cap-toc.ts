import { unstable_cache } from "next/cache";

import { MKT_HOME_CONTENT_TAG } from "@/lib/data/mkt-home-cached";
import { createStaticClient } from "@/lib/supabase/static";

/**
 * Khi bật (`true`), học viên (`viewer === "hv"`) xem được toàn bộ bài trong hệ thống bài tập
 * (không khóa theo `tien_do_hoc`). Giá trị lưu cột `mkt_home_content.htbt_cap_toc` (singleton id=1).
 *
 * Chạy migration SQL trước khi dùng admin toggle — xem comment trong `setHtbtCapTocAction`.
 */
async function loadHtbtCapTocUncached(): Promise<boolean> {
  const supabase = createStaticClient();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("mkt_home_content")
    .select("htbt_cap_toc")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[htbt-cap-toc]", error.message);
    }
    return false;
  }

  const raw = data != null ? (data as { htbt_cap_toc?: unknown }).htbt_cap_toc : undefined;
  return raw === true;
}

export const getHtbtCapTocCached = unstable_cache(loadHtbtCapTocUncached, ["mkt-htbt-cap-toc"], {
  revalidate: 120,
  tags: [MKT_HOME_CONTENT_TAG],
});
