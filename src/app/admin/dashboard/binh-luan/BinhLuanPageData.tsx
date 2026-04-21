import {
  DANH_GIA_COLS,
  mapRowToListItem,
  type AdminDanhGiaListRow,
  type MonHocLookupRow,
} from "@/lib/admin/binh-luan-schema";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import BinhLuanView from "./BinhLuanView";

export default async function BinhLuanPageData() {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <BinhLuanView initialRows={[]} initialMonHocs={[]} missingServiceRole />;
  }

  const [rowsRes, monRes] = await Promise.all([
    supabase
      .from("ql_danh_gia")
      .select(DANH_GIA_COLS)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .order("thu_tu_hien_thi", { ascending: true }),
  ]);

  if (rowsRes.error) {
    return <BinhLuanView initialRows={[]} initialMonHocs={[]} loadError={rowsRes.error.message} />;
  }

  const rows: AdminDanhGiaListRow[] = (rowsRes.data ?? []).map((r) =>
    mapRowToListItem(r as Record<string, unknown>),
  );

  const monHocs: MonHocLookupRow[] = (monRes.data ?? [])
    .map((r): MonHocLookupRow | null => {
      const row = r as { id?: unknown; ten_mon_hoc?: unknown };
      const id = Number(row.id);
      const ten = typeof row.ten_mon_hoc === "string" ? row.ten_mon_hoc.trim() : "";
      if (!Number.isFinite(id) || !ten) return null;
      return { id, ten };
    })
    .filter((x): x is MonHocLookupRow => x !== null);

  return <BinhLuanView initialRows={rows} initialMonHocs={monHocs} />;
}
