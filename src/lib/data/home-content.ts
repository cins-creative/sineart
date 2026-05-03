import { cache } from "react";

import {
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  type HomeContent,
} from "@/lib/admin/home-content-schema";

import { getMktHomeContentRow } from "@/lib/data/mkt-home-cached";

/**
 * Lấy nội dung tĩnh trang chủ do dashboard admin quản lý.
 * Không throw để public site luôn fallback về nội dung mặc định nếu thiếu row/env/RLS.
 */
export const getHomeContent = cache(async (): Promise<HomeContent> => {
  const row = await getMktHomeContentRow();
  if (!row?.content) return DEFAULT_HOME_CONTENT;
  return mergeHomeContent(row.content);
});
