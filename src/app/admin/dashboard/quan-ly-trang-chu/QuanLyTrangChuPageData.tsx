import {
  DEFAULT_HOME_AD,
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  normalizeAdConfig,
  type HomeAdConfig,
  type HomeContent,
} from "@/lib/admin/home-content-schema";
import { normalizeImgClassUrls } from "@/lib/data/home-classroom-photos";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import QuanLyTrangChuView from "./QuanLyTrangChuView";

export default async function QuanLyTrangChuPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <QuanLyTrangChuView
        initialContent={DEFAULT_HOME_CONTENT}
        initialAd={DEFAULT_HOME_AD}
        initialImgClass={[]}
        initialUpdatedAt={null}
        missingServiceRole
      />
    );
  }

  const { data, error } = await supabase
    .from("mkt_home_content")
    .select("content, ads, visible_where, updated_at, img_class")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return (
      <QuanLyTrangChuView
        initialContent={DEFAULT_HOME_CONTENT}
        initialAd={DEFAULT_HOME_AD}
        initialImgClass={[]}
        initialUpdatedAt={null}
        loadError={error.message}
      />
    );
  }

  const content: HomeContent = mergeHomeContent(data?.content ?? {});
  const ad: HomeAdConfig = data
    ? normalizeAdConfig({
        ads: (data as Record<string, unknown>).ads,
        visible_where: (data as Record<string, unknown>).visible_where,
      })
    : DEFAULT_HOME_AD;
  const imgClass = normalizeImgClassUrls((data as Record<string, unknown> | null)?.img_class);
  const updatedAt = (data?.updated_at as string | null) ?? null;

  return (
    <QuanLyTrangChuView
      initialContent={content}
      initialAd={ad}
      initialImgClass={imgClass}
      initialUpdatedAt={updatedAt}
    />
  );
}
