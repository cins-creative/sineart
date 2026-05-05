import { unstable_cache } from "next/cache";

import { createStaticClient } from "@/lib/supabase/static";

/** Dùng với `revalidateTag` khi admin lưu trang chủ (API `home-content-save`). */
export const MKT_HOME_CONTENT_TAG = "mkt-home-content" as const;

type MktHomeRow = {
  content: unknown;
  ads: unknown;
  visible_where: unknown;
  img_class: unknown;
};

async function loadMktHomeRowUncached(): Promise<MktHomeRow | null> {
  const supabase = createStaticClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mkt_home_content")
    .select("content, ads, visible_where, img_class")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return data as MktHomeRow;
}

/**
 * Một lần đọc `mkt_home_content` (singleton id=1), cache Data Cache Next.js.
 * Giảm độ trễ toàn site: trước đây layout + getHomeContent = 2 round-trip / request.
 */
export const getMktHomeContentRow = unstable_cache(
  loadMktHomeRowUncached,
  ["mkt-home-singleton"],
  { revalidate: 300, tags: [MKT_HOME_CONTENT_TAG] },
);
