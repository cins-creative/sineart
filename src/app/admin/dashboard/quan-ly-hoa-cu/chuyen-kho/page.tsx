import { redirect } from "next/navigation";

import QuanLyHoaCuView from "@/app/admin/dashboard/quan-ly-hoa-cu/QuanLyHoaCuView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminChiNhanhOptions } from "@/lib/data/admin-chi-nhanh";
import { fetchDonChuyenPage, fetchHoaCuStaffStudentContext } from "@/lib/data/admin-hoa-cu";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function parsePage(sp: Record<string, string | string[] | undefined>): number {
  const raw = sp.page;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Math.max(1, Number.isFinite(n) ? Math.floor(n) : 1);
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function QuanLyHoaCuChuyenKhoPage({ searchParams }: Props) {
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

  const [ctx, chiNhanhRes] = await Promise.all([
    fetchHoaCuStaffStudentContext(supabase, { ensureStaffId: session.staffId }),
    fetchAdminChiNhanhOptions(supabase),
  ]);

  if (!ctx.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {ctx.error}
      </div>
    );
  }

  const branchNames = new Map(chiNhanhRes.options.map((b) => [b.id, b.ten]));
  const don = await fetchDonChuyenPage(supabase, ctx.data, { page, branchNames });

  if (!don.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải phiếu chuyển: {don.error}
        {don.error.toLowerCase().includes("does not exist") || don.error.toLowerCase().includes("relation") ? (
          <p className="mt-2 text-xs">
            Chạy <code className="rounded bg-red-100 px-1">scripts/sql/hc-chuyen-kho.sql</code> trong Supabase SQL Editor.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <QuanLyHoaCuView
      defaultStaffId={session.staffId}
      loggedInStaffName={session.name}
      staffOptions={ctx.data.staffOptions}
      studentOptions={ctx.data.studentOptions}
      chiNhanhOptions={chiNhanhRes.options}
      sanPhamCatalog={null}
      activeSection="chuyen"
      chuyenPage={{
        rows: don.rows,
        page: don.page,
        pageSize: don.pageSize,
        total: don.total,
      }}
    />
  );
}
