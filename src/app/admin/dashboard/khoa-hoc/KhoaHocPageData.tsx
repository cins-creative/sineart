import AdminPagedListBar from "@/components/admin/AdminPagedListBar";
import { ADMIN_LIST_PAGE_SIZE, parseAdminListPage, parseAdminListQuery } from "@/lib/admin/admin-list-params";
import { fetchMonHocLopAndStudentCounts } from "@/lib/data/admin-khoa-hoc-stats";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import KhoaHocListView, { type AdminMonRow } from "./KhoaHocListView";

function monMatchesQuery(row: AdminMonRow, qLower: string): boolean {
  if (!qLower) return true;
  return (
    row.ten_mon_hoc.toLowerCase().includes(qLower) ||
    String(row.id).includes(qLower) ||
    (row.loai_khoa_hoc?.toLowerCase().includes(qLower) ?? false) ||
    (row.hinh_thuc?.toLowerCase().includes(qLower) ?? false)
  );
}

export default async function KhoaHocPageData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const sp = await searchParams;
  const page = parseAdminListPage(sp.page);
  const q = parseAdminListQuery(sp.q);
  const qLower = q.toLowerCase();

  const selectMon =
    "id, ten_mon_hoc, thumbnail, loai_khoa_hoc, thu_tu_hien_thi, is_featured, hinh_thuc, si_so";

  const monRes = await supabase
    .from("ql_mon_hoc")
    .select(selectMon)
    .order("loai_khoa_hoc", { ascending: false })
    .order("ten_mon_hoc", { ascending: false });

  if (monRes.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được danh sách: {monRes.error.message}
      </div>
    );
  }

  const monIds = (monRes.data ?? [])
    .map((raw) => Number((raw as { id?: unknown }).id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const countsByMon = await fetchMonHocLopAndStudentCounts(supabase, monIds);

  const allRows: AdminMonRow[] = (monRes.data ?? []).map((raw) => {
    const r = raw as {
      id?: unknown;
      ten_mon_hoc?: unknown;
      thumbnail?: unknown;
      loai_khoa_hoc?: unknown;
      thu_tu_hien_thi?: unknown;
      is_featured?: unknown;
      hinh_thuc?: unknown;
      si_so?: unknown;
    };
    const id = Number(r.id);
    const siRaw = r.si_so;
    const siNum = typeof siRaw === "number" ? siRaw : Number(siRaw);
    const monId = Number.isFinite(id) && id > 0 ? id : 0;
    const c = countsByMon.get(monId) ?? { soLop: 0, soHocVien: 0 };
    return {
      id: monId,
      ten_mon_hoc: String(r.ten_mon_hoc ?? "").trim() || "—",
      thumbnail: r.thumbnail != null ? String(r.thumbnail).trim() || null : null,
      loai_khoa_hoc: r.loai_khoa_hoc != null ? String(r.loai_khoa_hoc).trim() || null : null,
      thu_tu_hien_thi: Number.isFinite(Number(r.thu_tu_hien_thi)) ? Number(r.thu_tu_hien_thi) : 99,
      is_featured: Boolean(r.is_featured),
      hinh_thuc: r.hinh_thuc != null ? String(r.hinh_thuc).trim() || null : null,
      si_so: siRaw != null && Number.isFinite(siNum) ? siNum : null,
      so_lop_hoc: c.soLop,
      so_hoc_vien: c.soHocVien,
    };
  });

  const validRows = allRows.filter((x) => x.id > 0);
  const dbEmpty = validRows.length === 0;
  const pool = qLower ? validRows.filter((r) => monMatchesQuery(r, qLower)) : validRows;
  const total = pool.length;
  const pages = Math.max(1, Math.ceil(total / ADMIN_LIST_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * ADMIN_LIST_PAGE_SIZE;
  const slice = pool.slice(start, start + ADMIN_LIST_PAGE_SIZE);
  const featuredInPool = pool.filter((r) => r.is_featured).length;

  return (
    <div className="space-y-0">
      <AdminPagedListBar pathname="/admin/dashboard/khoa-hoc" page={safePage} q={q} total={total} />
      <KhoaHocListView
        rows={slice}
        listStats={{ total, featured: featuredInPool }}
        dbEmpty={dbEmpty}
        searchHadNoMatch={!dbEmpty && pool.length === 0}
      />
    </div>
  );
}
