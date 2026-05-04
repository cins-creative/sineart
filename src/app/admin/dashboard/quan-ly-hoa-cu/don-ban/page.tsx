import { redirect } from "next/navigation";

import QuanLyHoaCuView from "@/app/admin/dashboard/quan-ly-hoa-cu/QuanLyHoaCuView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  fetchAllHoaCuSanPham,
  fetchDonBanPage,
  fetchHoaCuStaffStudentContext,
} from "@/lib/data/admin-hoa-cu";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function parsePage(sp: Record<string, string | string[] | undefined>): number {
  const raw = sp.page;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Math.max(1, Number.isFinite(n) ? Math.floor(n) : 1);
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function QuanLyHoaCuDonBanPage({ searchParams }: Props) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const sp = (await searchParams) ?? {};
  const page = parsePage(sp);

  const ctx = await fetchHoaCuStaffStudentContext(supabase, { ensureStaffId: session.staffId });
  if (!ctx.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {ctx.error}
      </div>
    );
  }

  const [cat, don] = await Promise.all([
    fetchAllHoaCuSanPham(supabase),
    fetchDonBanPage(supabase, ctx.data, { page }),
  ]);

  if (cat.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải danh mục: {cat.error}
      </div>
    );
  }
  if (!don.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải đơn bán: {don.error}
      </div>
    );
  }

  return (
    <QuanLyHoaCuView
      defaultStaffId={session.staffId}
      loggedInStaffName={session.name}
      staffOptions={ctx.data.staffOptions}
      studentOptions={ctx.data.studentOptions}
      sanPhamCatalog={cat.data}
      activeSection="ban"
      banPage={{
        rows: don.rows,
        page: don.page,
        pageSize: don.pageSize,
        total: don.total,
      }}
    />
  );
}
