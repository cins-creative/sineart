import LopHocListView from "@/app/admin/dashboard/lop-hoc/LopHocListView";
import { fetchHvStatsByLopIds } from "@/lib/data/admin-lop-hoc-enrollment-stats";
import {
  fetchAllLopIds,
  fetchLopHocPage,
  fetchTotalLopCountUnfiltered,
  parseLopHocListSearchParams,
} from "@/lib/data/admin-lop-hoc-page";
import { normalizePortfolioToUrls } from "@/lib/data/courses-page";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function LopHocPageData({ searchParams }: Props) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const sp = (await searchParams) ?? {};
  const { page, filters } = parseLopHocListSearchParams(sp);

  const [lopPage, monRes, nsRes, cnRes, banRes, totalAll, allLopIds] = await Promise.all([
    fetchLopHocPage(supabase, page, filters),
    supabase.from("ql_mon_hoc").select("id, ten_mon_hoc").order("ten_mon_hoc", { ascending: true }),
    supabase.from("hr_nhan_su").select("id, full_name, avatar, ban, portfolio").order("full_name", { ascending: true }),
    supabase.from("ql_chi_nhanh").select("id, ten").order("id", { ascending: true }),
    supabase.from("hr_ban").select("id, ten_ban"),
    fetchTotalLopCountUnfiltered(supabase),
    fetchAllLopIds(supabase),
  ]);

  if (!lopPage.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được lớp học: {lopPage.error}
      </div>
    );
  }

  if (monRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được môn học: {monRes.error.message}
      </div>
    );
  }
  if (nsRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được nhân sự: {nsRes.error.message}
      </div>
    );
  }

  const monRows = (monRes.data ?? []) as { id?: unknown; ten_mon_hoc?: unknown }[];
  const monList = monRows
    .map((r) => ({
      id: Number(r.id),
      ten_mon_hoc: r.ten_mon_hoc != null ? String(r.ten_mon_hoc).trim() || null : null,
    }))
    .filter((m) => Number.isFinite(m.id) && m.id > 0);

  const banRows = (!banRes.error ? banRes.data ?? [] : []) as { id?: unknown; ten_ban?: unknown }[];
  const daotaoBan = banRows.find((b) =>
    String(b.ten_ban ?? "")
      .trim()
      .toLowerCase()
      .includes("đào tạo"),
  );
  const daotaoBanId =
    daotaoBan?.id != null && Number.isFinite(Number(daotaoBan.id)) ? Number(daotaoBan.id) : null;

  const nsRows = (nsRes.data ?? []) as {
    id?: unknown;
    full_name?: unknown;
    avatar?: unknown;
    ban?: unknown;
    portfolio?: unknown;
  }[];
  const nhanSuListFull = nsRows
    .map((r) => ({
      id: Number(r.id),
      full_name: String(r.full_name ?? "").trim() || "—",
      avatar: r.avatar != null ? String(r.avatar).trim() || null : null,
      banId: r.ban != null && Number.isFinite(Number(r.ban)) ? Number(r.ban) : null,
      portfolio: normalizePortfolioToUrls(r.portfolio),
    }))
    .filter((n) => Number.isFinite(n.id) && n.id > 0);

  const nhanSuList = nhanSuListFull.map(({ id, full_name, avatar, portfolio }) => ({
    id,
    full_name,
    avatar,
    portfolio,
  }));

  const pickerNhanSuList =
    daotaoBanId != null
      ? nhanSuListFull
          .filter((n) => n.banId === daotaoBanId)
          .map(({ id, full_name, avatar, portfolio }) => ({ id, full_name, avatar, portfolio }))
      : nhanSuList;

  const cnRows = !cnRes.error ? ((cnRes.data ?? []) as { id?: unknown; ten?: unknown }[]) : [];
  const chiNhanhList = cnRows
    .map((r) => ({
      id: Number(r.id),
      ten: String(r.ten ?? "").trim() || `CN #${r.id}`,
    }))
    .filter((c) => Number.isFinite(c.id) && c.id > 0);

  const statsMap = await fetchHvStatsByLopIds(supabase, allLopIds);
  let tongDangHoc = 0;
  let tongDaNghi = 0;
  for (const v of statsMap.values()) {
    tongDangHoc += v.dang_hoc;
    tongDaNghi += v.da_nghi;
  }

  const statsByLopId: Record<string, { dang_hoc: number; da_nghi: number }> = {};
  for (const row of lopPage.rows) {
    const st = statsMap.get(row.id);
    if (st) statsByLopId[String(row.id)] = st;
  }

  const defaultChiNhanhId = chiNhanhList[0]?.id ?? null;

  return (
    <LopHocListView
      rows={lopPage.rows}
      listState={{
        page: lopPage.page,
        pageSize: lopPage.pageSize,
        total: lopPage.total,
        filters,
      }}
      totalAllLop={totalAll}
      tongDangHoc={tongDangHoc}
      tongDaNghi={tongDaNghi}
      monList={monList}
      nhanSuList={nhanSuList}
      pickerNhanSuList={pickerNhanSuList}
      chiNhanhList={chiNhanhList}
      statsByLopId={statsByLopId}
      defaultChiNhanhId={defaultChiNhanhId}
    />
  );
}
