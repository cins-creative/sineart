import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";

const PAGE = 1000;
const IN_CHUNK = 200;

/** Còn trong kỳ: không có ngày kết kỳ hoặc ngày kết kỳ ≥ hôm nay (theo `hp_thu_hp_chi_tiet`). */
function enrollmentRowIsActive(ngay_cuoi_ky: string | null): boolean {
  if (ngay_cuoi_ky == null || ngay_cuoi_ky.trim() === "") return true;
  try {
    const e = new Date(ngay_cuoi_ky.trim().slice(0, 10));
    e.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return e.getTime() >= t.getTime();
  } catch {
    return true;
  }
}

/**
 * Đếm học viên theo lớp: đang học vs đã nghỉ (theo ngày cuối kỳ trên `hp_thu_hp_chi_tiet`).
 */
export async function fetchHvStatsByLopIds(
  supabase: SupabaseClient,
  lopIds: number[]
): Promise<Map<number, { dang_hoc: number; da_nghi: number }>> {
  const map = new Map<number, { dang_hoc: number; da_nghi: number }>();
  const unique = [...new Set(lopIds)].filter((id) => Number.isFinite(id) && id > 0);
  if (!unique.length) return map;

  const enrollRows: { lop_hoc: number; qlId: number }[] = [];

  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("ql_quan_ly_hoc_vien")
        .select("id, lop_hoc")
        .in("lop_hoc", chunk)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) break;
      if (!data?.length) break;
      for (const raw of data as { id?: unknown; lop_hoc?: unknown }[]) {
        const lid = Number(raw.lop_hoc);
        const qid = Number(raw.id);
        if (!Number.isFinite(lid) || lid <= 0 || !Number.isFinite(qid) || qid <= 0) continue;
        enrollRows.push({ lop_hoc: lid, qlId: qid });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const kyMap = await fetchKyByKhoaHocVienIds(
    supabase,
    enrollRows.map((r) => r.qlId)
  );

  for (const { lop_hoc: lid, qlId } of enrollRows) {
    if (!map.has(lid)) map.set(lid, { dang_hoc: 0, da_nghi: 0 });
    const cur = map.get(lid)!;
    const cuoi = kyMap.get(qlId)?.ngay_cuoi_ky ?? null;
    if (enrollmentRowIsActive(cuoi)) cur.dang_hoc++;
    else cur.da_nghi++;
  }

  return map;
}
