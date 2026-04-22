import QuanLyEbookView, { type AdminEbookRow } from "./QuanLyEbookView";
import { cfImageNormalizeAccount } from "@/lib/cfImageUrl";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function QuanLyEbookPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <QuanLyEbookView initialEbooks={[]} missingServiceRole />;
  }

  const { data, error } = await supabase
    .from("mkt_ebooks")
    .select("id, slug, title, so_trang, featured, categories, thumbnail, created_at, updated_at")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return <QuanLyEbookView initialEbooks={[]} loadError={error.message} />;
  }

  const rows: AdminEbookRow[] = (data ?? []).map((r) => ({
    id: Number(r.id),
    slug: (r.slug as string | null) ?? "",
    title: (r.title as string | null) ?? "",
    so_trang: r.so_trang == null ? null : Number(r.so_trang),
    featured: (r.featured as boolean | null) ?? false,
    categories: Array.isArray(r.categories)
      ? (r.categories as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    thumbnail: cfImageNormalizeAccount(r.thumbnail as string | null),
    created_at: (r.created_at as string | null) ?? null,
    updated_at: (r.updated_at as string | null) ?? null,
  }));

  return <QuanLyEbookView initialEbooks={rows} />;
}
