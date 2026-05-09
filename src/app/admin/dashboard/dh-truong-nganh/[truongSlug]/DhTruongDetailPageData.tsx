import { notFound } from "next/navigation";

import {
  fetchDhDistinctTuyenSinhYearsForTruong,
  fetchDhMocLichTuyenSinh,
  fetchDhSchoolYearSummaries,
  findDhTruongBySlug,
} from "@/lib/data/admin-dh-truong-nganh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import DhSchoolHubView from "./DhSchoolHubView";

export default async function DhTruongDetailPageData({
  params,
}: {
  params: Promise<{ truongSlug: string }>;
}) {
  const { truongSlug } = await params;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <DhSchoolHubView
        missingServiceRole
        truongSlug={truongSlug}
        truong={null}
        yearSummaries={[]}
        mocPanelYear={null}
        mocPanelRows={[]}
        mocYearOptions={[]}
        loadError={null}
      />
    );
  }

  const truongRes = await findDhTruongBySlug(supabase, truongSlug);
  if (!truongRes.ok) {
    return (
      <DhSchoolHubView
        truongSlug={truongSlug}
        truong={null}
        yearSummaries={[]}
        mocPanelYear={null}
        mocPanelRows={[]}
        mocYearOptions={[]}
        loadError={truongRes.error}
      />
    );
  }
  if (!truongRes.row) notFound();

  const truong = truongRes.row;

  const yearsRes = await fetchDhDistinctTuyenSinhYearsForTruong(supabase, truong.id);
  const years = yearsRes.ok ? yearsRes.years : [];

  const sumRes = await fetchDhSchoolYearSummaries(supabase, truong.id, years);
  const yearSummaries = sumRes.ok ? sumRes.summaries : [];

  const mocFocusYear = years.length > 0 ? years[0]! : new Date().getFullYear();
  const mocRes = await fetchDhMocLichTuyenSinh(supabase, truong.id, mocFocusYear);
  const mocPanelRows = mocRes.ok ? mocRes.rows : [];
  const mocYearOptions = years.length > 0 ? years : [mocFocusYear];

  const loadError = !yearsRes.ok
    ? yearsRes.error
    : !sumRes.ok
      ? sumRes.error
      : !mocRes.ok
        ? mocRes.error
        : null;

  return (
    <DhSchoolHubView
      truongSlug={truongSlug}
      truong={truong}
      yearSummaries={yearSummaries}
      mocPanelYear={mocFocusYear}
      mocPanelRows={mocPanelRows}
      mocYearOptions={mocYearOptions}
      loadError={loadError}
    />
  );
}
