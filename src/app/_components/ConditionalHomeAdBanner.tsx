import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ConditionalHomeAdBannerClient from "./ConditionalHomeAdBannerClient";

/**
 * Server component: fetch cấu hình ad 1 lần / request, chỉ render banner nếu
 * `visible_where` cho phép ở "home" (hoặc "both"). Ẩn hoàn toàn trên
 * /admin và /phong-hoc (handle qua client component dựa vào pathname).
 */
export default async function ConditionalHomeAdBanner() {
  const cfg = await getHomeAdConfig();
  if (!shouldShowAd(cfg, "home")) return null;
  return <ConditionalHomeAdBannerClient html={cfg.ads} />;
}
