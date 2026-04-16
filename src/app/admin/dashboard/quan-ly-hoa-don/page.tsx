import { redirect } from "next/navigation";

import QuanLyHoaDonView from "@/app/admin/dashboard/quan-ly-hoa-don/QuanLyHoaDonView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminHoaDonBundle } from "@/lib/data/admin-quan-ly-hoa-don";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const DAY_PRESETS = new Set([-1, 0, 7, 30, 90]);

function parseDays(raw: string | undefined): number {
  if (raw == null || raw === "") return 30;
  const n = Number(raw);
  if (DAY_PRESETS.has(n)) return n;
  return 30;
}

export default async function AdminQuanLyHoaDonPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const days = parseDays(sp.days);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const bundle = await fetchAdminHoaDonBundle(supabase, { days });
  if (!bundle.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {bundle.error}
      </div>
    );
  }

  return <QuanLyHoaDonView bundle={bundle.data} days={days} />;
}
