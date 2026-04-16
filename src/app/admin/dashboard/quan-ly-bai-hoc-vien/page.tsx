import { redirect } from "next/navigation";

import QuanLyBaiHocVienView from "@/app/admin/dashboard/quan-ly-bai-hoc-vien/QuanLyBaiHocVienView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { adminBhvTabFromSearch, fetchAdminQuanLyBaiHocVienBundle } from "@/lib/data/admin-quan-ly-bai-hoc-vien";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string | string[] }>;
};

export default async function QuanLyBaiHocVienPage({ searchParams }: PageProps) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const sp = (await searchParams) ?? {};
  const tab = adminBhvTabFromSearch(sp.tab);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const bundle = await fetchAdminQuanLyBaiHocVienBundle(supabase, tab);
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  return <QuanLyBaiHocVienView bundle={bundle.data} activeTab={tab} />;
}
