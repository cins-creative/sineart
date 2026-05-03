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
  const adImageUrl = shouldShowAd(adConfig, "class") ? adConfig.ads : "";
  return <ClassroomClient classSlug={slug} adImageUrl={adImageUrl} />;
}
