import { notFound } from "next/navigation";

import { parseAdminListQuery } from "@/lib/admin/admin-list-params";
import {
  buildAdminDhNganhFilterRows,
  DH_STUDENTS_PAGE_SIZE,
  fetchAdminDhHvDistinctCountsByNganhForNam,
  fetchAdminDhStudentsByTruongPaged,
  fetchAdminDhTruongNganhRows,
  fetchAdminDhTruongOverviewStats,
  fetchDhDistinctTuyenSinhYearsForTruong,
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

function parseNganhSlugQuery(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  return String(raw).trim();
}

function yearHvMapFromStats(
  byYear: ReadonlyArray<{ nam: number; hocVien: number }> | undefined,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const row of byYear ?? []) out[row.nam] = row.hocVien;
  return out;
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
  const nganhSlugFromQuery = parseNganhSlugQuery(sp.nganh);
  const searchQuery = parseAdminListQuery(sp.q);

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhTruongDetailView
        missingServiceRole
        truongSlug={truongSlug}
        nam={namFromQuery ?? new Date().getFullYear()}
        truong={null}
        yearOptions={[]}
        yearHvByNam={{}}
        nganhRows={[]}
        hvCountByNganhId={{}}
        totalHvDistinct={0}
        selectedNganhSlug={null}
        students={null}
        stats={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        searchQuery=""
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
        yearHvByNam={{}}
        nganhRows={[]}
        hvCountByNganhId={{}}
        totalHvDistinct={0}
        selectedNganhSlug={null}
        students={null}
        stats={null}
        page={1}
        pageSize={DH_STUDENTS_PAGE_SIZE}
        searchQuery={searchQuery}
        loadError={truongRes.error}
      />
    );
  }
  if (!truongRes.row) notFound();
  const truong = truongRes.row;

  const yearsRes = await fetchDhDistinctTuyenSinhYearsForTruong(supabase, truong.id);
  const yearOptions = yearsRes.ok ? yearsRes.years : [];
  const nam = namFromQuery ?? yearOptions[0] ?? new Date().getFullYear();

  const pairsRes = await fetchAdminDhTruongNganhRows(supabase, truong.id);
  const nganhRows = pairsRes.ok ? buildAdminDhNganhFilterRows(pairsRes.rows) : [];
  const selectedRow =
    nganhSlugFromQuery != null ? nganhRows.find((r) => r.nganh_slug === nganhSlugFromQuery) ?? null : null;
  if (nganhSlugFromQuery != null && !selectedRow && nganhRows.length > 0) notFound();
  const selectedNganhId = selectedRow?.nganh_id ?? null;

  const [allYearStatsRes, hvCountsRes, statsRes, pagedRes] = await Promise.all([
    fetchAdminDhTruongOverviewStats(supabase, { truongId: truong.id }),
    fetchAdminDhHvDistinctCountsByNganhForNam(supabase, truong.id, nam),
    fetchAdminDhTruongOverviewStats(supabase, {
      truongId: truong.id,
      nganhId: selectedNganhId,
      namThi: nam,
    }),
    fetchAdminDhStudentsByTruongPaged(supabase, {
      truongId: truong.id,
      nganhId: selectedNganhId,
      namThi: nam,
      search: searchQuery || null,
      page,
      pageSize: DH_STUDENTS_PAGE_SIZE,
    }),
  ]);

  const yearHvByNam = yearHvMapFromStats(allYearStatsRes.ok ? allYearStatsRes.stats.byYear : undefined);
  const hvCountByNganhId = hvCountsRes.ok ? hvCountsRes.counts : {};
  const totalHvDistinct = hvCountsRes.ok ? hvCountsRes.totalDistinct : 0;
  const stats = statsRes.ok ? statsRes.stats : null;
  const students = pagedRes.ok ? pagedRes.result : null;

  const loadError = !yearsRes.ok
    ? yearsRes.error
    : !pairsRes.ok
      ? pairsRes.error
      : !allYearStatsRes.ok
        ? allYearStatsRes.error
        : !hvCountsRes.ok
          ? hvCountsRes.error
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
      yearHvByNam={yearHvByNam}
      nganhRows={nganhRows}
      hvCountByNganhId={hvCountByNganhId}
      totalHvDistinct={totalHvDistinct}
      selectedNganhSlug={selectedRow?.nganh_slug ?? null}
      students={students}
      stats={stats}
      page={students?.page ?? page}
      pageSize={DH_STUDENTS_PAGE_SIZE}
      searchQuery={searchQuery}
      loadError={loadError}
    />
  );
}
