import { notFound } from "next/navigation";

import {
  DH_STUDENTS_PAGE_SIZE,
  fetchAdminDhAvailableNamThi,
  fetchAdminDhStudentsByTruongPaged,
  fetchAdminDhTruongOverviewStats,
  fetchDhNganhListByTruong,
  findDhTruongBySlug,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhTruongDetailView from "./DhTruongDetailView";

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

function parseSlugStringQuery(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) return null;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

export default async function DhTruongDetailPageData({
  params,
  searchParams,
}: {
  params: Promise<{ truongSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { truongSlug } = await params;
  const sp = await searchParams;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhTruongDetailView
        missingServiceRole
        truongSlug={truongSlug}
        truong={null}
        nganhList={[]}
        availableYears={[]}
        nganhSlugFilter={null}
        nganhFilterId={null}
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
      <DhTruongDetailView
        truongSlug={truongSlug}
        truong={null}
        nganhList={[]}
        availableYears={[]}
        nganhSlugFilter={null}
        nganhFilterId={null}
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
  const page = parseIntQuery(sp.page) ?? 1;
  const namFilter = parseYearQuery(sp.nam);
  const nganhSlug = parseSlugStringQuery(sp.nganh);

  /* Cần resolve `nganhFilterId` trước khi tính stats (stats phụ thuộc filter). */
  const [nganhListRes, yearsRes] = await Promise.all([
    fetchDhNganhListByTruong(supabase, truong.id),
    fetchAdminDhAvailableNamThi(supabase, truong.id),
  ]);

  const nganhList = nganhListRes.ok ? nganhListRes.rows : [];
  const availableYears = yearsRes.ok ? yearsRes.years : [];

  const matchedNganh = nganhSlug ? nganhList.find((n) => n.slug === nganhSlug) ?? null : null;
  const nganhFilterId = matchedNganh?.id ?? null;

  const [statsRes, pagedRes] = await Promise.all([
    fetchAdminDhTruongOverviewStats(supabase, {
      truongId: truong.id,
      nganhId: nganhFilterId,
      namThi: namFilter,
    }),
    fetchAdminDhStudentsByTruongPaged(supabase, {
      truongId: truong.id,
      nganhId: nganhFilterId,
      namThi: namFilter,
      page,
      pageSize: DH_STUDENTS_PAGE_SIZE,
    }),
  ]);

  const stats = statsRes.ok ? statsRes.stats : null;
  const students = pagedRes.ok ? pagedRes.result : null;
  const loadError =
    !nganhListRes.ok
      ? nganhListRes.error
      : !yearsRes.ok
        ? yearsRes.error
        : !statsRes.ok
          ? statsRes.error
          : !pagedRes.ok
            ? pagedRes.error
            : null;

  return (
    <DhTruongDetailView
      truongSlug={truongSlug}
      truong={truong}
      nganhList={nganhList}
      availableYears={availableYears}
      nganhSlugFilter={nganhSlug && matchedNganh ? nganhSlug : null}
      nganhFilterId={nganhFilterId}
      namThiFilter={namFilter}
      page={students?.page ?? page}
      pageSize={DH_STUDENTS_PAGE_SIZE}
      students={students}
      stats={stats}
      loadError={loadError}
    />
  );
}
