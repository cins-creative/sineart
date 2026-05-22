import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ConditionalHomeAdBannerClient from "./ConditionalHomeAdBannerClient";

/**
 * Server component: fetch cấu hình ad 1 lần / request, chỉ render banner nếu
 * `visible_where` = `home` hoặc `both` → banner nổi chỉ trên `/` (trang chủ).
 * `class` / `both` → phòng học render banner riêng qua `ClassroomClient`.
 */
export default async function ConditionalHomeAdBanner() {
  const cfg = await getHomeAdConfig();
  if (!shouldShowAd(cfg, "home")) return null;
  return <ConditionalHomeAdBannerClient imageUrl={cfg.ads} />;
}
