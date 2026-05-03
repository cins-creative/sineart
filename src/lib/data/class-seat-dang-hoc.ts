import type { SupabaseClient } from "@supabase/supabase-js";

import { isEnrollmentDangHocByKy } from "@/lib/data/admin-qlhv-tinh-trang";
import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";

/**
 * Số học viên **Đang học** trên từng lớp — cùng quy tắc «Đang học» như Quản lý học viên
 * (`deriveEnrollmentStatus` / kỳ HP đã thanh toán), không đếm mọi dòng `ql_quan_ly_hoc_vien`.
 */
export async function countDangHocByLopIds(
  supabase: SupabaseClient,
  lopIds: readonly number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  const ids = [...new Set(lopIds.filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) return counts;

  const { data, error } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id, lop_hoc")
    .in("lop_hoc", ids);

  if (error || !data?.length) return counts;

  const rows = data as { id?: unknown; lop_hoc?: unknown }[];
  const qlIds = rows
    .map((r) => Number(r.id))
    .filter((n) => Number.isFinite(n) && n > 0);

  const kyMap = await fetchKyByKhoaHocVienIds(supabase, qlIds);

  for (const r of rows) {
    const lid = Number(r.lop_hoc);
    const qid = Number(r.id);
    if (!Number.isFinite(lid) || !Number.isFinite(qid)) continue;
    const ky = kyMap.get(qid);
    const dau = ky?.ngay_dau_ky ?? null;
    const cuoi = ky?.ngay_cuoi_ky ?? null;
    if (!isEnrollmentDangHocByKy(dau, cuoi)) continue;
    counts.set(lid, (counts.get(lid) ?? 0) + 1);
  }

  return counts;
}
