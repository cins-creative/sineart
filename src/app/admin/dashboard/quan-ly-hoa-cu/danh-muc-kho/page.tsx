import { redirect } from "next/navigation";

import QuanLyHoaCuView from "@/app/admin/dashboard/quan-ly-hoa-cu/QuanLyHoaCuView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAdminChiNhanhOptions } from "@/lib/data/admin-chi-nhanh";
import {
  fetchHoaCuStaffStudentContext,
  fetchKhoInventoryStats,
  fetchKhoSanPhamPage,
  HOA_CU_KHO_PATH,
} from "@/lib/data/admin-hoa-cu";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function parsePage(sp: Record<string, string | string[] | undefined>): number {
  const raw = sp.page;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Math.max(1, Number.isFinite(n) ? Math.floor(n) : 1);
}

function parseQ(sp: Record<string, string | string[] | undefined>): string {
  const raw = sp.q;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return (s ?? "").trim();
}

function parseChiNhanh(sp: Record<string, string | string[] | undefined>): number | null {
  const raw = sp.chi_nhanh;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function QuanLyHoaCuDanhMucKhoPage({ searchParams }: Props) {
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
  const q = parseQ(sp);
  const chiNhanhId = parseChiNhanh(sp);

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

  if (chiNhanhRes.options.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Chưa có chi nhánh trong hệ thống. Thêm chi nhánh tại mục Chi nhánh trước khi quản lý kho.
      </div>
    );
  }

  const resolvedChiNhanhId =
    chiNhanhId != null && chiNhanhRes.options.some((b) => b.id === chiNhanhId)
      ? chiNhanhId
      : chiNhanhRes.options[0]!.id;

  if (chiNhanhId !== resolvedChiNhanhId) {
    const p = new URLSearchParams();
    p.set("chi_nhanh", String(resolvedChiNhanhId));
    if (q) p.set("q", q);
    if (page > 1) p.set("page", String(page));
    redirect(`${HOA_CU_KHO_PATH}?${p.toString()}`);
  }

  const chiNhanhTen = chiNhanhRes.options.find((b) => b.id === resolvedChiNhanhId)?.ten ?? "—";
  const branchNames = new Map(chiNhanhRes.options.map((b) => [b.id, b.ten]));

  const [kho, inv] = await Promise.all([
    fetchKhoSanPhamPage(supabase, {
      page,
      q: q || undefined,
      chi_nhanh_id: resolvedChiNhanhId,
      branchNames,
    }),
    fetchKhoInventoryStats(supabase, { chi_nhanh_id: resolvedChiNhanhId }),
  ]);

  if (!kho.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được danh mục kho: {kho.error}
        {kho.error.toLowerCase().includes("chi_nhanh") ? (
          <p className="mt-2 text-xs">
            Chạy migration <code className="rounded bg-red-100 px-1">scripts/sql/hc-danh-sach-chi-nhanh-id.sql</code>{" "}
            trong Supabase SQL Editor.
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
      activeSection="kho"
      khoPage={{
        rows: kho.rows,
        page: kho.page,
        pageSize: kho.pageSize,
        total: kho.total,
        searchQ: q,
        chiNhanhId: resolvedChiNhanhId,
        chiNhanhTen,
        inventoryTotal: inv.total,
        inventoryHetHang: inv.hetHang,
        inventoryTonSum: inv.tonSum,
      }}
    />
  );
}
