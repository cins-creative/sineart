import { getHomeAdConfig, shouldShowAd } from "@/lib/data/home-ad";
import { getPhongHocClassroomShellBySlug } from "@/lib/data/phong-hoc-classroom-shell";

import { PhongHocSlugClassroomClient } from "./PhongHocSlugClassroomClient";

/**
 * Async Server Component: song song ad + shell lớp theo slug; client bundle tách chunk (dynamic import).
 */
export async function PhongHocSlugClassroomSection({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [adConfig, lopShell] = await Promise.all([
    getHomeAdConfig(),
    getPhongHocClassroomShellBySlug(slug),
  ]);
  const adImageUrl = shouldShowAd(adConfig, "class") ? adConfig.ads : "";
  return (
    <PhongHocSlugClassroomClient
      classSlug={slug}
      adImageUrl={adImageUrl}
      initialLopShell={lopShell}
    />
  );
}
