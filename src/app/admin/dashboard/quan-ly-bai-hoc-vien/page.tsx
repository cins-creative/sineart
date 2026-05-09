import { redirect } from "next/navigation";

import {
  adminBhvPathSegmentFromTab,
  adminBhvTabFromSearch,
} from "@/lib/data/admin-quan-ly-bai-hoc-vien";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Chuẩn hoá về `/quan-ly-bai-hoc-vien/[tab]` — tab không còn trong query. */
export default async function QuanLyBaiHocVienLegacyRedirect({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const tab = adminBhvTabFromSearch(sp.tab);
  const segment = adminBhvPathSegmentFromTab(tab);
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (key === "tab") continue;
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) {
        if (v !== undefined) qs.append(key, String(v));
      }
    } else {
      qs.set(key, String(val));
    }
  }
  const q = qs.toString();
  redirect(`/admin/dashboard/quan-ly-bai-hoc-vien/${segment}${q ? `?${q}` : ""}`);
}
