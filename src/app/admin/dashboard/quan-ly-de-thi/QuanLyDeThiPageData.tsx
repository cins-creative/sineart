import QuanLyDeThiView, { type AdminDeThiRow } from "@/app/admin/dashboard/quan-ly-de-thi/QuanLyDeThiView";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function QuanLyDeThiPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <QuanLyDeThiView initialRows={[]} missingServiceRole />;
  }

  const { data, error } = await supabase
    .from("mkt_de_thi")
    .select("id, slug, ten, thumbnail_url, nam, mon, created_at")
    .order("nam", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return <QuanLyDeThiView initialRows={[]} loadError={error.message} />;
  }

  const rows: AdminDeThiRow[] = (data ?? []).map((r) => ({
    id: Number(r.id),
    created_at: String(r.created_at ?? ""),
    ten: (r.ten as string | null) ?? null,
    slug: (r.slug as string | null) ?? null,
    thumbnail_url: cfImageNormalizeAccount(r.thumbnail_url as string | null),
    nam: r.nam == null ? null : Number(r.nam),
    mon: Array.isArray(r.mon)
      ? (r.mon as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
  }));

  return <QuanLyDeThiView initialRows={rows} />;
}
