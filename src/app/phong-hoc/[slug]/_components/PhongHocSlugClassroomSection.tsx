import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ClassroomClient from "../../ClassroomClient";

/**
 * Async Server Component: đọc slug từ `params`, `getHomeAdConfig` (mkt), render client phòng học.
 * Không đổi logic query — cùng `getHomeAdConfig` / `shouldShowAd` như trước.
 */
export async function PhongHocSlugClassroomSection({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const adConfig = await getHomeAdConfig();
  const showAd = shouldShowAd(adConfig, "class");
  const adImageUrl = showAd ? adConfig.ads : "";
  const adClickUrl = showAd ? adConfig.clickUrl : "";
  return (
    <ClassroomClient classSlug={slug} adImageUrl={adImageUrl} adClickUrl={adClickUrl} />
  );
}
