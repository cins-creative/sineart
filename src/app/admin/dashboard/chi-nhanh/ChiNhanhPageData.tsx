import AdminPagedListBar from "@/components/admin/AdminPagedListBar";
import { ADMIN_LIST_PAGE_SIZE, parseAdminListPage, parseAdminListQuery } from "@/lib/admin/admin-list-params";
import { fetchAdminChiNhanhRows } from "@/lib/data/admin-chi-nhanh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import ChiNhanhView, { type ChiNhanhListStatus } from "./ChiNhanhView";

function parseStatus(raw: string | string[] | undefined): ChiNhanhListStatus {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "active" || v === "inactive") return v;
  return "all";
}

function rowMatchesQuery(
  row: { id: number; ten: string; dia_chi: string | null; sdt: string | null },
  qLower: string,
): boolean {
  if (!qLower) return true;
  return (
    row.ten.toLowerCase().includes(qLower) ||
    String(row.id).includes(qLower) ||
    (row.dia_chi?.toLowerCase().includes(qLower) ?? false) ||
    (row.sdt?.toLowerCase().includes(qLower) ?? false)
  );
}

export default async function ChiNhanhPageData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc được dữ liệu.
      </div>
    );
  }

  const sp = await searchParams;
  const page = parseAdminListPage(sp.page);
  const q = parseAdminListQuery(sp.q);
  const status = parseStatus(sp.status);

  const { rows, error, usedMinimalSelect } = await fetchAdminChiNhanhRows(supabase);
  const qLower = q.toLowerCase();
  const byQ = qLower ? rows.filter((r) => rowMatchesQuery(r, qLower)) : rows;

  const pool = byQ.filter((r) =>
    status === "all" ? true : status === "active" ? r.is_active : !r.is_active,
  );
  const total = pool.length;
  const pages = Math.max(1, Math.ceil(total / ADMIN_LIST_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * ADMIN_LIST_PAGE_SIZE;
  const slice = pool.slice(start, start + ADMIN_LIST_PAGE_SIZE);

  const tabCounts = {
    all: byQ.length,
    active: byQ.filter((r) => r.is_active).length,
    inactive: byQ.filter((r) => !r.is_active).length,
  };

  const listExtra: Record<string, string | undefined> = {};
  if (status !== "all") listExtra.status = status;

  return (
    <div className="space-y-0">
      <AdminPagedListBar
        pathname="/admin/dashboard/chi-nhanh"
        page={safePage}
        q={q}
        total={total}
        extra={Object.keys(listExtra).length ? listExtra : undefined}
      />
      <ChiNhanhView
        rows={slice}
        loadError={error}
        usedMinimalSelect={usedMinimalSelect}
        listStatus={status}
        tabCounts={tabCounts}
      />
    </div>
  );
}
