import { cache } from "react";

import {
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  type HomeContent,
} from "@/lib/admin/home-content-schema";
import { createStaticClient } from "@/lib/supabase/static";

/**
 * Lấy nội dung tĩnh trang chủ do dashboard admin quản lý.
 * Không throw để public site luôn fallback về nội dung mặc định nếu thiếu row/env/RLS.
 */
export const getHomeContent = cache(async (): Promise<HomeContent> => {
  const supabase = createStaticClient();
  if (!supabase) return DEFAULT_HOME_CONTENT;

  const { data, error } = await supabase
    .from("mkt_home_content")
    .select("content")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_HOME_CONTENT;

  return mergeHomeContent((data as Record<string, unknown>).content);
});
