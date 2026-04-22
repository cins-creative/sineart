import { cache } from "react";

import {
  DEFAULT_HOME_AD,
  normalizeAdConfig,
  type AdVisibleWhere,
  type HomeAdConfig,
} from "@/lib/admin/home-content-schema";
import { createStaticClient } from "@/lib/supabase/static";

/**
 * Lấy cấu hình quảng cáo trang chủ (`mkt_home_content.ads` + `visible_where`).
 * Dùng cho public site (anon SELECT).
 *
 * - `React.cache` de-dupes trong cùng 1 request tree.
 * - Không throw — trả DEFAULT_HOME_AD nếu lỗi / thiếu env / chưa có row.
 */
export const getHomeAdConfig = cache(async (): Promise<HomeAdConfig> => {
  const supabase = createStaticClient();
  if (!supabase) return DEFAULT_HOME_AD;

  const { data, error } = await supabase
    .from("mkt_home_content")
    .select("ads, visible_where")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_HOME_AD;

  return normalizeAdConfig({
    ads: (data as Record<string, unknown>).ads,
    visible_where: (data as Record<string, unknown>).visible_where,
  });
});

/** Kiểm tra ad có được hiện ở `place` không (dựa theo visibleWhere + ads rỗng hay không). */
export function shouldShowAd(
  cfg: HomeAdConfig,
  place: Exclude<AdVisibleWhere, "both">,
): boolean {
  if (!cfg.ads || !cfg.ads.trim()) return false;
  if (cfg.visibleWhere === "both") return true;
  return cfg.visibleWhere === place;
}
