import QuanLyBlogView, { type AdminBlogRow } from "@/app/admin/dashboard/quan-ly-blog/QuanLyBlogView";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function QuanLyBlogPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <QuanLyBlogView initialBlogs={[]} missingServiceRole />;
  }

  const { data, error } = await supabase
    .from("mkt_blogs")
    .select("id, created_at, title, thumbnail, feature, nguon, image_alt")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return <QuanLyBlogView initialBlogs={[]} loadError={error.message} />;
  }

  const rows: AdminBlogRow[] = (data ?? []).map((r) => ({
    id: Number(r.id),
    created_at: String(r.created_at),
    title: (r.title as string | null) ?? null,
    thumbnail: (r.thumbnail as string | null) ?? null,
    feature: (r.feature as boolean | null) ?? null,
    nguon: (r.nguon as string | null) ?? null,
    image_alt: (r.image_alt as string | null) ?? null,
  }));

  return <QuanLyBlogView initialBlogs={rows} />;
}
