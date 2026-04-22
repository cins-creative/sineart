import {
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  type HomeContent,
} from "@/lib/admin/home-content-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import QuanLyTrangChuView from "./QuanLyTrangChuView";

export default async function QuanLyTrangChuPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <QuanLyTrangChuView
        initialContent={DEFAULT_HOME_CONTENT}
        initialUpdatedAt={null}
        missingServiceRole
      />
    );
  }

  const { data, error } = await supabase
    .from("mkt_home_content")
    .select("content, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return (
      <QuanLyTrangChuView
        initialContent={DEFAULT_HOME_CONTENT}
        initialUpdatedAt={null}
        loadError={error.message}
      />
    );
  }

  const content: HomeContent = mergeHomeContent(data?.content ?? {});
  const updatedAt = (data?.updated_at as string | null) ?? null;

  return (
    <QuanLyTrangChuView initialContent={content} initialUpdatedAt={updatedAt} />
  );
}
