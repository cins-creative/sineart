import { fetchAdminChiNhanhRows } from "@/lib/data/admin-chi-nhanh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import ChiNhanhView, { type ChiNhanhListStatus } from "./ChiNhanhView";

function parseStatus(raw: string | string[] | undefined): ChiNhanhListStatus {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "active" || v === "inactive") return v;
  return "all";
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
  const status = parseStatus(sp.status);

  const { rows, error, usedMinimalSelect } = await fetchAdminChiNhanhRows(supabase);

  const pool = rows.filter((r) =>
    status === "all" ? true : status === "active" ? r.is_active : !r.is_active,
  );

  const tabCounts = {
    all: rows.length,
    active: rows.filter((r) => r.is_active).length,
    inactive: rows.filter((r) => !r.is_active).length,
  };

  return (
    <div className="space-y-0">
      <ChiNhanhView
        rows={pool}
        loadError={error}
        usedMinimalSelect={usedMinimalSelect}
        listStatus={status}
        tabCounts={tabCounts}
      />
    </div>
  );
}
