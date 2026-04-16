import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE = 1000;
const IN_CHUNK = 200;

/** Trạng thái đơn đã thanh toán — khớp `hp_don_thu_hoc_phi.status`. */
export const HP_DON_DA_THANH_TOAN = "Đã thanh toán";

export type HpResolvedKy = {
  /** Dòng `hp_thu_hp_chi_tiet` đang dùng để hiển thị / sửa kỳ (cùng logic ưu tiên đơn đã TT). */
  chi_tiet_id: number;
  ngay_dau_ky: string | null;
  ngay_cuoi_ky: string | null;
};

/** Kỳ học phí theo `lop_hoc` (UI đóng học phí / client). */
export type QlEnrollmentKyUi = {
  ngayDauKy: string | null;
  ngayCuoiKy: string | null;
};

function nId(v: unknown): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sliceKyDate(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function pickCreatedAtMs(v: unknown): number {
  if (v == null) return 0;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

/**
 * Một ghi danh (`ql_quan_ly_hoc_vien.id` = `hp_thu_hp_chi_tiet.khoa_hoc_vien`):
 * ưu tiên dòng chi tiết thuộc đơn «Đã thanh toán» mới nhất (`created_at` ↓);
 * không có thì lấy dòng chi tiết mới nhất (mọi trạng thái đơn).
 */
export async function fetchKyByKhoaHocVienIds(
  supabase: SupabaseClient,
  qlhvIds: readonly number[]
): Promise<Map<number, HpResolvedKy>> {
  const map = new Map<number, HpResolvedKy>();
  const unique = [...new Set(qlhvIds.filter((n) => Number.isFinite(n) && n > 0))] as number[];
  if (!unique.length) return map;

  type HpRow = {
    id: number;
    khoa_hoc_vien: number;
    don_thu: number | null;
    ngay_dau_ky: unknown;
    ngay_cuoi_ky: unknown;
    created_at: unknown;
  };

  const allHp: HpRow[] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("hp_thu_hp_chi_tiet")
        .select("id, khoa_hoc_vien, don_thu, ngay_dau_ky, ngay_cuoi_ky, created_at")
        .in("khoa_hoc_vien", chunk)
        .order("id", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error || !data?.length) break;
      for (const raw of data as Record<string, unknown>[]) {
        const id = nId(raw.id);
        const kcv = nId(raw.khoa_hoc_vien);
        if (!id || !kcv) continue;
        allHp.push({
          id,
          khoa_hoc_vien: kcv,
          don_thu: nId(raw.don_thu),
          ngay_dau_ky: raw.ngay_dau_ky,
          ngay_cuoi_ky: raw.ngay_cuoi_ky,
          created_at: raw.created_at,
        });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const donIds = [...new Set(allHp.map((r) => r.don_thu).filter((x): x is number => x != null))];
  const statusByDon = new Map<number, string>();
  for (let di = 0; di < donIds.length; di += IN_CHUNK) {
    const chunk = donIds.slice(di, di + IN_CHUNK);
    const donRes = await supabase.from("hp_don_thu_hoc_phi").select("id, status").in("id", chunk);
    if (!donRes.error && donRes.data) {
      for (const d of donRes.data as { id?: unknown; status?: unknown }[]) {
        const id = nId(d.id);
        if (id) statusByDon.set(id, String(d.status ?? "").trim());
      }
    }
  }

  const byKcv = new Map<number, HpRow[]>();
  for (const r of allHp) {
    if (!byKcv.has(r.khoa_hoc_vien)) byKcv.set(r.khoa_hoc_vien, []);
    byKcv.get(r.khoa_hoc_vien)!.push(r);
  }

  for (const [kcv, rows] of byKcv) {
    const sorted = [...rows].sort((a, b) => {
      const ca = pickCreatedAtMs(a.created_at);
      const cb = pickCreatedAtMs(b.created_at);
      if (cb !== ca) return cb - ca;
      return b.id - a.id;
    });
    const paid = sorted.find(
      (r) => r.don_thu != null && statusByDon.get(r.don_thu) === HP_DON_DA_THANH_TOAN
    );
    const pick = paid ?? sorted[0];
    map.set(kcv, {
      chi_tiet_id: pick.id,
      ngay_dau_ky: sliceKyDate(pick.ngay_dau_ky),
      ngay_cuoi_ky: sliceKyDate(pick.ngay_cuoi_ky),
    });
  }

  return map;
}

/**
 * Từ các hàng `ql_quan_ly_hoc_vien` (mới nhất trước): mỗi `lop_hoc` lấy một `qlhv id`
 * (bản ghi đầu tiên gặp theo thứ tự mảng), chỉ giữ lớp có trong `knownLopIds`.
 */
export function firstQlhvPerLopFromQlRows(
  qlRows: unknown[],
  knownLopIds: Set<number>
): { lopIdsOrdered: number[]; qlhvIdByLop: Record<number, number> } {
  const qlhvIdByLop: Record<number, number> = {};
  const seen = new Set<number>();
  const raw: number[] = [];
  for (const r of qlRows) {
    const row = r as { id?: unknown; lop_hoc?: unknown };
    const lid = Number(row.lop_hoc);
    if (!Number.isFinite(lid) || lid <= 0) continue;
    const qid = Number(row.id);
    if (qlhvIdByLop[lid] == null && Number.isFinite(qid) && qid > 0) {
      qlhvIdByLop[lid] = qid;
    }
    if (!seen.has(lid)) {
      seen.add(lid);
      raw.push(lid);
    }
  }
  const lopIdsOrdered = raw.filter((id) => knownLopIds.has(id));
  return { lopIdsOrdered, qlhvIdByLop };
}

export function qlEnrollmentKyByLopFromHpMap(
  qlhvIdByLop: Record<number, number>,
  kyMap: Map<number, HpResolvedKy>
): Record<number, QlEnrollmentKyUi> {
  const kyByLop: Record<number, QlEnrollmentKyUi> = {};
  for (const lidStr of Object.keys(qlhvIdByLop)) {
    const lid = Number(lidStr);
    if (!Number.isFinite(lid)) continue;
    const qid = qlhvIdByLop[lid];
    const k = kyMap.get(qid);
    kyByLop[lid] = {
      ngayDauKy: k?.ngay_dau_ky ?? null,
      ngayCuoiKy: k?.ngay_cuoi_ky ?? null,
    };
  }
  return kyByLop;
}
