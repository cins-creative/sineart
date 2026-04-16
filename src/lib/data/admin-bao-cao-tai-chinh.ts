import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapRowToColData,
  THANG_FULL_ORDER,
  type BaoCaoColumn,
  TC_BAO_CAO_SELECT_COLUMNS,
} from "@/lib/data/bao-cao-tai-chinh-config";

export type TcBaoCaoTaiChinhRow = Record<string, unknown>;

export function rowsToInitialColumns(rows: TcBaoCaoTaiChinhRow[]): BaoCaoColumn[] {
  const cols: BaoCaoColumn[] = rows.map((r) => {
    const id = typeof r.id === "number" ? r.id : Number(r.id);
    return {
      id: String(r.id),
      nam: String(r.nam ?? ""),
      thang: String(r.thang ?? ""),
      data: mapRowToColData(r),
      recordId: Number.isFinite(id) ? id : undefined,
      dirty: false,
    };
  });
  cols.sort((a, b) => {
    const ya = parseInt(a.nam, 10);
    const yb = parseInt(b.nam, 10);
    if (ya !== yb) return ya - yb;
    return THANG_FULL_ORDER.indexOf(a.thang) - THANG_FULL_ORDER.indexOf(b.thang);
  });
  return cols;
}

export async function fetchAdminBaoCaoTaiChinhRows(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: TcBaoCaoTaiChinhRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("tc_bao_cao_tai_chinh")
    .select(TC_BAO_CAO_SELECT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message || "Không đọc được bảng tc_bao_cao_tai_chinh." };
  return { ok: true, rows: (data ?? []) as unknown as TcBaoCaoTaiChinhRow[] };
}
