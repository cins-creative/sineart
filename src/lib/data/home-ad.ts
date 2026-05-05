import { cache } from "react";

import {
  DEFAULT_HOME_AD,
  isRenderableAdImageUrl,
  normalizeAdConfig,
  type AdVisibleWhere,
  type HomeAdConfig,
} from "@/lib/admin/home-content-schema";

import { getMktHomeContentRow } from "@/lib/data/mkt-home-cached";

/**
 * Lấy cấu hình quảng cáo (`ads`, `visible_where`, `ad_click_url`).
 * Dùng cho public site (anon SELECT).
 *
 * - Cùng cache Data Cache với `getHomeContent` (`getMktHomeContentRow`).
 * - `React.cache` de-dupes trong cùng 1 request tree.
 * - Không throw — trả DEFAULT_HOME_AD nếu lỗi / thiếu env / chưa có row.
 */
export const getHomeAdConfig = cache(async (): Promise<HomeAdConfig> => {
  const row = await getMktHomeContentRow();
  if (!row) return DEFAULT_HOME_AD;

  return normalizeAdConfig({
    ads: row.ads,
    visible_where: row.visible_where,
    ad_click_url: row.ad_click_url,
  });
});

/** Kiểm tra ad có được hiện ở `place` không (dựa theo visibleWhere + ads rỗng hay không). */
export function shouldShowAd(
  cfg: HomeAdConfig,
  place: Exclude<AdVisibleWhere, "both">,
): boolean {
  if (!isRenderableAdImageUrl(cfg.ads)) return false;
  if (cfg.visibleWhere === "both") return true;
  return cfg.visibleWhere === place;
}
