import { notFound } from "next/navigation";

import {
  DH_STUDENTS_PAGE_SIZE,
  fetchAdminDhStudentsByTruongPaged,
  fetchAdminDhTruongOverviewStats,
  fetchDhTruongNganhNamMerged,
  findDhTruongBySlug,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhTuyenSinhNamView from "./DhTuyenSinhNamView";

function parseIntQuery(raw: string | string[] | undefined, min = 1): number | null {
  if (Array.isArray(raw)) return null;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n >= min ? Math.trunc(n) : null;
}

export default async function DhTuyenSinhNamPageData({
  params,
  searchParams,
}: {
  params: Promise<{ truongSlug: string; nam: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { truongSlug, nam: namStr } = await params;
  const sp = await searchParams;

  const nam = Number(String(namStr).trim());
  if (!Number.isFinite(nam) || nam < 2000 || nam > 2100) notFound();

  const page = parseIntQuery(sp.page) ?? 1;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhTuyenSinhNamView
        missingServiceRole
        truongSlug={truongSlug}
        nam={nam}
        truong={null}
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
      <DhTuyenSinhNamView
        truongSlug={truongSlug}
        nam={nam}
        truong={null}
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

  const [mergedRes, statsRes, pagedRes] = await Promise.all([
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

  const nganhRows = mergedRes.ok ? mergedRes.rows : [];
  const stats = statsRes.ok ? statsRes.stats : null;
  const students = pagedRes.ok ? pagedRes.result : null;

  const loadError = !mergedRes.ok
    ? mergedRes.error
    : !statsRes.ok
      ? statsRes.error
      : !pagedRes.ok
        ? pagedRes.error
        : null;

  return (
    <DhTuyenSinhNamView
      truongSlug={truongSlug}
      nam={nam}
      truong={truong}
      nganhRows={nganhRows}
      students={students}
      stats={stats}
      page={students?.page ?? page}
      pageSize={DH_STUDENTS_PAGE_SIZE}
      loadError={loadError}
    />
  );
}
