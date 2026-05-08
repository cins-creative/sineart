import {
  fetchAdminDhAvailableNamThi,
  fetchAdminDhPairHvDistinctCounts,
  fetchAdminDhStudentsByTruong,
  fetchAdminDhTruongNganhRows,
  fetchDhTruongLookupOrdered,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhTruongNganhView from "./DhTruongNganhView";

function parsePositiveIntQuery(raw: string | string[] | undefined): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function parseYearQuery(raw: string | string[] | undefined): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  const y = Math.trunc(n);
  return y >= 1900 && y <= 2200 ? y : null;
}

export default async function DhTruongNganhPageData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const truongFilter = parsePositiveIntQuery(sp.truong);
  const namFilter = parseYearQuery(sp.nam);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhTruongNganhView
        truongs={[]}
        rows={[]}
        students={[]}
        availableYears={[]}
        hvCountByPair={{}}
        truongFilterId={truongFilter}
        namThiFilter={namFilter}
        missingServiceRole
        loadError={null}
      />
    );
  }

  const [tRes, rRes, yRes, sRes, cRes] = await Promise.all([
    fetchDhTruongLookupOrdered(supabase),
    fetchAdminDhTruongNganhRows(supabase, truongFilter),
    fetchAdminDhAvailableNamThi(supabase, truongFilter),
    truongFilter != null
      ? fetchAdminDhStudentsByTruong(supabase, truongFilter, namFilter)
      : Promise.resolve({ ok: true as const, rows: [] }),
    fetchAdminDhPairHvDistinctCounts(supabase, truongFilter),
  ]);

  const hvCountByPair = cRes.ok ? cRes.counts : {};

  if (!tRes.ok) {
    return (
      <DhTruongNganhView
        truongs={[]}
        rows={[]}
        students={[]}
        availableYears={[]}
        hvCountByPair={hvCountByPair}
        truongFilterId={truongFilter}
        namThiFilter={namFilter}
        loadError={tRes.error}
      />
    );
  }

  const availableYears = yRes.ok ? yRes.years : [];

  if (!rRes.ok) {
    return (
      <DhTruongNganhView
        truongs={tRes.rows}
        rows={[]}
        students={[]}
        availableYears={availableYears}
        hvCountByPair={hvCountByPair}
        truongFilterId={truongFilter}
        namThiFilter={namFilter}
        loadError={rRes.error}
      />
    );
  }

  if (!sRes.ok) {
    return (
      <DhTruongNganhView
        truongs={tRes.rows}
        rows={rRes.rows}
        students={[]}
        availableYears={availableYears}
        hvCountByPair={hvCountByPair}
        truongFilterId={truongFilter}
        namThiFilter={namFilter}
        loadError={sRes.error}
      />
    );
  }

  return (
    <DhTruongNganhView
      truongs={tRes.rows}
      rows={rRes.rows}
      students={sRes.rows}
      availableYears={availableYears}
      hvCountByPair={hvCountByPair}
      truongFilterId={truongFilter}
      namThiFilter={namFilter}
      loadError={null}
    />
  );
}
