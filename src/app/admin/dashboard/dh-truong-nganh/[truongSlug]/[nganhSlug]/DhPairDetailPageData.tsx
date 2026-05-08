import { notFound } from "next/navigation";

import {
  DH_STUDENTS_PAGE_SIZE,
  fetchAdminDhAvailableNamThi,
  fetchAdminDhStudentsByTruongPaged,
  fetchAdminDhTruongOverviewStats,
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
      />
    );
  }
  if (!nganhRes.row) notFound();
  const nganh = nganhRes.row;

  const page = parseIntQuery(sp.page) ?? 1;
  const namFilter = parseYearQuery(sp.nam);

  const [yearsRes, statsRes, pagedRes] = await Promise.all([
    fetchAdminDhAvailableNamThi(supabase, truong.id),
    fetchAdminDhTruongOverviewStats(supabase, {
      truongId: truong.id,
      nganhId: nganh.id,
      namThi: namFilter,
    }),
    fetchAdminDhStudentsByTruongPaged(supabase, {
      truongId: truong.id,
      nganhId: nganh.id,
      namThi: namFilter,
      page,
      pageSize: DH_STUDENTS_PAGE_SIZE,
    }),
  ]);

  const availableYears = yearsRes.ok ? yearsRes.years : [];
  const stats = statsRes.ok ? statsRes.stats : null;
  const students = pagedRes.ok ? pagedRes.result : null;

  const loadError = !yearsRes.ok
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
    />
  );
}
