import {
  fetchAdminDhTruongNganhRows,
  fetchDhTruongLookupOrdered,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhTruongNganhView from "./DhTruongNganhView";

function parseTruongQuery(
  raw: string | string[] | undefined,
): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export default async function DhTruongNganhPageData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const truongFilter = parseTruongQuery(sp.truong);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhTruongNganhView
        truongs={[]}
        rows={[]}
        truongFilterId={truongFilter}
        missingServiceRole
        loadError={null}
      />
    );
  }

  const [tRes, rRes] = await Promise.all([
    fetchDhTruongLookupOrdered(supabase),
    fetchAdminDhTruongNganhRows(supabase, truongFilter),
  ]);

  if (!tRes.ok) {
    return (
      <DhTruongNganhView
        truongs={[]}
        rows={[]}
        truongFilterId={truongFilter}
        loadError={tRes.error}
      />
    );
  }

  if (!rRes.ok) {
    return (
      <DhTruongNganhView
        truongs={tRes.rows}
        rows={[]}
        truongFilterId={truongFilter}
        loadError={rRes.error}
      />
    );
  }

  return (
    <DhTruongNganhView
      truongs={tRes.rows}
      rows={rRes.rows}
      truongFilterId={truongFilter}
      loadError={null}
    />
  );
}
