import { notFound } from "next/navigation";

import {
  DH_STUDENTS_PAGE_SIZE,
  fetchAdminDhAvailableNamThi,
  fetchAdminDhStudentsByTruongPaged,
  fetchAdminDhTruongOverviewStats,
  fetchDhTruongNganhCatalogForPair,
  findDhNganhBySlugWithinTruong,
  findDhTruongBySlug,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhPairDetailView from "./DhPairDetailView";

function parseIntQuery(raw: string | string[] | undefined, min = 1): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n >= min ? Math.trunc(n) : null;
}

function parseYearQuery(raw: string | string[] | undefined): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  const y = Math.trunc(n);
  return y >= 1900 && y <= 2200 ? y : null;
}

function parseMonQuery(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  return String(raw).trim();
}

export default async function DhPairDetailPageData({
  params,
  searchParams,
}: {
  params: Promise<{ truongSlug: string; nganhSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { truongSlug, nganhSlug } = await params;
  const sp = await searchParams;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhPairDetailView
        missingServiceRole
        truongSlug={truongSlug}
        nganhSlug={nganhSlug}
        truong={null}
        nganh={null}
        availableYears={[]}
        namThiFilter={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        students={null}
        stats={null}
        loadError={null}
        catalog={{ mon_thi: [], details: null }}
        monThiFilter={null}
      />
    );
  }

  const truongRes = await findDhTruongBySlug(supabase, truongSlug);
  if (!truongRes.ok) {
    return (
      <DhPairDetailView
        truongSlug={truongSlug}
        nganhSlug={nganhSlug}
        truong={null}
        nganh={null}
        availableYears={[]}
        namThiFilter={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        students={null}
        stats={null}
        loadError={truongRes.error}
        catalog={{ mon_thi: [], details: null }}
        monThiFilter={null}
      />
    );
  }
  if (!truongRes.row) notFound();
  const truong = truongRes.row;

  const nganhRes = await findDhNganhBySlugWithinTruong(supabase, truong.id, nganhSlug);
  if (!nganhRes.ok) {
    return (
      <DhPairDetailView
        truongSlug={truongSlug}
        nganhSlug={nganhSlug}
        truong={truong}
        nganh={null}
        availableYears={[]}
        namThiFilter={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        students={null}
        stats={null}
        loadError={nganhRes.error}
        catalog={{ mon_thi: [], details: null }}
        monThiFilter={null}
      />
    );
  }
  if (!nganhRes.row) notFound();
  const nganh = nganhRes.row;

  const page = parseIntQuery(sp.page) ?? 1;
  const namFilter = parseYearQuery(sp.nam);
  const monRaw = parseMonQuery(sp.mon);

  const [catalogRes, yearsRes, statsRes, pagedRes] = await Promise.all([
    fetchDhTruongNganhCatalogForPair(supabase, truong.id, nganh.id),
    fetchAdminDhAvailableNamThi(supabase, truong.id),
    fetchAdminDhTruongOverviewStats(supabase, {
      truongId: truong.id,
      nganhId: nganh.id,
      namThi: namFilter,
      monThiChon: monRaw,
    }),
    fetchAdminDhStudentsByTruongPaged(supabase, {
      truongId: truong.id,
      nganhId: nganh.id,
      namThi: namFilter,
      monThiChon: monRaw,
      page,
      pageSize: DH_STUDENTS_PAGE_SIZE,
    }),
  ]);

  const catalog = catalogRes.ok
    ? { mon_thi: catalogRes.mon_thi, details: catalogRes.details }
    : { mon_thi: [] as string[], details: null as string | null };

  const monThiFilter =
    monRaw != null &&
    monRaw !== "" &&
    (catalog.mon_thi.length === 0 || catalog.mon_thi.includes(monRaw))
      ? monRaw
      : null;

  const availableYears = yearsRes.ok ? yearsRes.years : [];
  const stats = statsRes.ok ? statsRes.stats : null;
  const students = pagedRes.ok ? pagedRes.result : null;

  const loadError = !catalogRes.ok
    ? catalogRes.error
    : !yearsRes.ok
      ? yearsRes.error
      : !statsRes.ok
        ? statsRes.error
        : !pagedRes.ok
          ? pagedRes.error
          : null;

  return (
    <DhPairDetailView
      truongSlug={truongSlug}
      nganhSlug={nganhSlug}
      truong={truong}
      nganh={nganh}
      availableYears={availableYears}
      namThiFilter={namFilter}
      page={students?.page ?? page}
      pageSize={DH_STUDENTS_PAGE_SIZE}
      students={students}
      stats={stats}
      loadError={loadError}
      catalog={catalog}
      monThiFilter={monThiFilter}
    />
  );
}
