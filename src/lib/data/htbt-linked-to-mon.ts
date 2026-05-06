import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mọi `hv_he_thong_bai_tap.id` gắn với một `ql_mon_hoc.id` qua bảng nối và/hoặc cột legacy `mon_hoc`.
 */
export async function collectHeThongBaiTapIdsForMon(
  supabase: SupabaseClient,
  monId: number
): Promise<number[]> {
  if (!Number.isFinite(monId) || monId <= 0) return [];

  const idSet = new Set<number>();

  const { data: jRows, error: jErr } = await supabase
    .from("hv_he_thong_bai_tap_mon_hoc")
    .select("bai_tap_id")
    .eq("mon_hoc_id", monId);

  if (jErr && process.env.NODE_ENV === "development") {
    console.warn("[collectHeThongBaiTapIdsForMon] junction:", jErr.message);
  }
  if (!jErr && jRows?.length) {
    for (const raw of jRows) {
      const bid = Number((raw as { bai_tap_id?: unknown }).bai_tap_id);
      if (Number.isFinite(bid) && bid > 0) idSet.add(bid);
    }
  }

  const { data: scalarRows, error: sErr } = await supabase
    .from("hv_he_thong_bai_tap")
    .select("id")
    .eq("mon_hoc", monId);

  if (sErr) throw new Error(sErr.message);

  for (const raw of scalarRows ?? []) {
    const id = Number((raw as { id?: unknown }).id);
    if (Number.isFinite(id) && id > 0) idSet.add(id);
  }

  return [...idSet];
}
