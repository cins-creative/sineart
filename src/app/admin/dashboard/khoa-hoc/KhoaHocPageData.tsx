import { fetchMonHocLopAndStudentCounts } from "@/lib/data/admin-khoa-hoc-stats";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import KhoaHocListView, { type AdminMonRow } from "./KhoaHocListView";

export default async function KhoaHocPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const selectMon =
    "id, ten_mon_hoc, thumbnail, loai_khoa_hoc, thu_tu_hien_thi, is_featured, hinh_thuc, si_so, video_gioi_thieu, gioi_thieu_mon_hoc";

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
      video_gioi_thieu?: unknown;
      gioi_thieu_mon_hoc?: unknown;
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
      video_gioi_thieu:
        r.video_gioi_thieu != null && String(r.video_gioi_thieu).trim()
          ? String(r.video_gioi_thieu).trim()
          : null,
      gioi_thieu_mon_hoc:
        r.gioi_thieu_mon_hoc != null && String(r.gioi_thieu_mon_hoc).trim()
          ? String(r.gioi_thieu_mon_hoc).trim()
          : null,
      so_lop_hoc: c.soLop,
      so_hoc_vien: c.soHocVien,
    };
  });

  const validRows = allRows.filter((x) => x.id > 0);
  const dbEmpty = validRows.length === 0;
  const total = validRows.length;
  const featuredInPool = validRows.filter((r) => r.is_featured).length;

  return (
    <div className="space-y-0">
      <KhoaHocListView
        rows={validRows}
        listStats={{ total, featured: featuredInPool }}
        dbEmpty={dbEmpty}
        searchHadNoMatch={false}
      />
    </div>
  );
}
