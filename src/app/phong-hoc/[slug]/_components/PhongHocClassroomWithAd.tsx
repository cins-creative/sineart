import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";

import ClassroomClient from "../../ClassroomClient";

export async function PhongHocClassroomWithAd({ classSlug }: { classSlug: string }) {
  const adConfig = await getHomeAdConfig();
  const adImageUrl = shouldShowAd(adConfig, "class") ? adConfig.ads : "";
  return <ClassroomClient classSlug={classSlug} adImageUrl={adImageUrl} />;
}
