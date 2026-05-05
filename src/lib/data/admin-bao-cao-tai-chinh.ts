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

const ID_CHUNK = 200;

function nId(v: unknown): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Chỉ khóa kỳ — nhẹ hơn select đầy đủ (overview BCTC bước 1). */
export async function fetchAdminBaoCaoTaiChinhMeta(
  supabase: SupabaseClient,
): Promise<
  { ok: true; rows: { id: number; nam: string; thang: string }[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("tc_bao_cao_tai_chinh")
    .select("id, nam, thang")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message || "Không đọc được tc_bao_cao_tai_chinh (meta)." };

  const rows: { id: number; nam: string; thang: string }[] = [];
  for (const raw of data ?? []) {
    const r = raw as Record<string, unknown>;
    const id = nId(r.id);
    if (!id) continue;
    rows.push({
      id,
      nam: String(r.nam ?? "").trim(),
      thang: String(r.thang ?? "").trim(),
    });
  }
  return { ok: true, rows };
}

export async function fetchAdminBaoCaoTaiChinhRowsByIds(
  supabase: SupabaseClient,
  ids: number[],
): Promise<{ ok: true; rows: TcBaoCaoTaiChinhRow[] } | { ok: false; error: string }> {
  const uniq = [...new Set(ids)].filter((x) => x > 0);
  if (uniq.length === 0) return { ok: true, rows: [] };

  const acc: TcBaoCaoTaiChinhRow[] = [];
  for (let i = 0; i < uniq.length; i += ID_CHUNK) {
    const chunk = uniq.slice(i, i + ID_CHUNK);
    const { data, error } = await supabase
      .from("tc_bao_cao_tai_chinh")
      .select(TC_BAO_CAO_SELECT_COLUMNS)
      .in("id", chunk)
      .order("created_at", { ascending: true });

    if (error) return { ok: false, error: error.message || "Không đọc được tc_bao_cao_tai_chinh (theo id)." };
    acc.push(...((data ?? []) as unknown as TcBaoCaoTaiChinhRow[]));
  }
  return { ok: true, rows: acc };
}
