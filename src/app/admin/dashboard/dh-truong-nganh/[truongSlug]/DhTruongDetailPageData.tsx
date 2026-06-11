import { notFound } from "next/navigation";

import {
  DH_STUDENTS_PAGE_SIZE,
  fetchAdminDhStudentsByTruongPaged,
  fetchAdminDhTruongOverviewStats,
  fetchDhDistinctTuyenSinhYearsForTruong,
  fetchDhSchoolYearSummaries,
  fetchDhTruongNganhNamMerged,
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

function parseNamQuery(raw: string | string[] | undefined): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
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
  const page = parseIntQuery(sp.page) ?? 1;
  const namFromQuery = parseNamQuery(sp.nam);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhTruongDetailView
        missingServiceRole
        truongSlug={truongSlug}
        nam={namFromQuery ?? new Date().getFullYear()}
        truong={null}
        yearOptions={[]}
        yearSummaries={[]}
        nganhRows={[]}
        students={null}
        stats={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        loadError={null}
      />
    );
  }

  const truongRes = await findDhTruongBySlug(supabase, truongSlug);
  if (!truongRes.ok) {
    return (
      <DhTruongDetailView
        truongSlug={truongSlug}
        nam={namFromQuery ?? new Date().getFullYear()}
        truong={null}
        yearOptions={[]}
        yearSummaries={[]}
        nganhRows={[]}
        students={null}
        stats={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        loadError={truongRes.error}
      />
    );
  }
  if (!truongRes.row) notFound();
  const truong = truongRes.row;

  const yearsRes = await fetchDhDistinctTuyenSinhYearsForTruong(supabase, truong.id);
  const yearOptions = yearsRes.ok ? yearsRes.years : [];
  const nam = namFromQuery ?? yearOptions[0] ?? new Date().getFullYear();

  const yearsForSummary = yearOptions.includes(nam) ? yearOptions : [nam, ...yearOptions];

  const [sumRes, mergedRes, statsRes, pagedRes] = await Promise.all([
    fetchDhSchoolYearSummaries(supabase, truong.id, yearsForSummary),
    fetchDhTruongNganhNamMerged(supabase, truong.id, nam),
    fetchAdminDhTruongOverviewStats(supabase, {
      truongId: truong.id,
      nganhId: null,
      namThi: nam,
    }),
    fetchAdminDhStudentsByTruongPaged(supabase, {
      truongId: truong.id,
      nganhId: null,
      namThi: nam,
      page,
      pageSize: DH_STUDENTS_PAGE_SIZE,
    }),
  ]);

  const yearSummaries = sumRes.ok ? sumRes.summaries : [];
  const nganhRows = mergedRes.ok ? mergedRes.rows : [];
  const stats = statsRes.ok ? statsRes.stats : null;
  const students = pagedRes.ok ? pagedRes.result : null;

  const loadError = !yearsRes.ok
    ? yearsRes.error
    : !sumRes.ok
      ? sumRes.error
      : !mergedRes.ok
        ? mergedRes.error
        : !statsRes.ok
          ? statsRes.error
          : !pagedRes.ok
            ? pagedRes.error
            : null;

  return (
    <DhTruongDetailView
      truongSlug={truongSlug}
      nam={nam}
      truong={truong}
      yearOptions={yearOptions}
      yearSummaries={yearSummaries}
      nganhRows={nganhRows}
      students={students}
      stats={stats}
      page={students?.page ?? page}
      pageSize={DH_STUDENTS_PAGE_SIZE}
      loadError={loadError}
    />
  );
}
