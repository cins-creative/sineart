import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addCalendarDays,
  diffCalendarDays,
  formatIsoLocalDate,
  parseLocalDateFromIso,
} from "@/lib/donghocphi/ngay-cuoi-ky-renewal";

const PAGE = 1000;
const IN_CHUNK = 200;

/**
 * Chuỗi «Đã thanh toán» — dùng cho `hp_thu_hp_chi_tiet.status` (và trùng với `hp_don_thu_hoc_phi.status`).
 * Chỉ dòng chi tiết có status này mới được dùng để tính / hiển thị kỳ học (ngày học).
 */
export const HP_THU_HP_CHI_TIET_DA_THANH_TOAN = "Đã thanh toán";

/** @deprecated Dùng `HP_THU_HP_CHI_TIET_DA_THANH_TOAN` — cùng giá trị. */
export const HP_DON_DA_THANH_TOAN = HP_THU_HP_CHI_TIET_DA_THANH_TOAN;

export type HpResolvedKy = {
  /** Dòng `hp_thu_hp_chi_tiet` mới nhất (đã TT) — dùng khi admin sửa kỳ trên một dòng. */
  chi_tiet_id: number;
  /** Kỳ hiển thị: cộng dồn mọi dòng đã TT (`min(ngay_dau)` + tổng buổi các gói). */
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

async function fetchSoBuoiByGoiIds(
  supabase: SupabaseClient,
  goiIds: readonly number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  const unique = [...new Set(goiIds.filter((n) => Number.isFinite(n) && n > 0))] as number[];
  if (!unique.length) return map;
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase.from("hp_goi_hoc_phi").select("id, so_buoi").in("id", chunk);
    if (error || !data?.length) continue;
    for (const raw of data as { id?: unknown; so_buoi?: unknown }[]) {
      const id = nId(raw.id);
      if (!id) continue;
      const sb = raw.so_buoi;
      if (sb != null && Number.isFinite(Number(sb)) && Number(sb) > 0) {
        map.set(id, Math.round(Number(sb)));
      }
    }
  }
  return map;
}

/**
 * Số buổi (ngày lịch) một dòng chi tiết đã TT đóng góp — ưu tiên `hp_goi_hoc_phi.so_buoi`,
 * không có thì lấy từ `ngay_dau_ky` → `ngay_cuoi_ky` (khoảng + 1).
 */
function linePurchasedBuoi(row: {
  ngay_dau_ky: unknown;
  ngay_cuoi_ky: unknown;
  goi_so_buoi: number | null;
}): number {
  if (row.goi_so_buoi != null && row.goi_so_buoi > 0) return row.goi_so_buoi;
  const dau = parseLocalDateFromIso(sliceKyDate(row.ngay_dau_ky));
  const cuoi = parseLocalDateFromIso(sliceKyDate(row.ngay_cuoi_ky));
  if (dau && cuoi) {
    const diff = diffCalendarDays(dau, cuoi);
    if (diff >= 0) return diff + 1;
  }
  return 0;
}

function minIsoYmd(a: string | null, b: string): string | null {
  if (!a) return b;
  return b < a ? b : a;
}

function maxIsoYmd(a: string | null, b: string): string | null {
  if (!a) return b;
  return b > a ? b : a;
}

/**
 * Một ghi danh (`ql_quan_ly_hoc_vien.id` = `hp_thu_hp_chi_tiet.khoa_hoc_vien`):
 * chỉ dòng `hp_thu_hp_chi_tiet` có `status` = «Đã thanh toán».
 * **Cộng dồn kỳ:** `ngay_dau_ky` = mốc đầu sớm nhất trong các dòng đã TT;
 * tổng buổi = cộng từng dòng (ưu tiên `so_buoi` gói, không thì khoảng ngày trên dòng);
 * `ngay_cuoi_ky` = mốc đầu + (tổng buổi − 1) ngày lịch.
 * `chi_tiet_id` = dòng đã TT mới nhất (`created_at` ↓) để admin cập nhật một dòng đại diện.
 * Không có dòng đã TT → không ghi map.
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
    status: string;
    ngay_dau_ky: unknown;
    ngay_cuoi_ky: unknown;
    created_at: unknown;
    goi_hoc_phi: number | null;
    goi_so_buoi: number | null;
  };

  const allHp: HpRow[] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("hp_thu_hp_chi_tiet")
        .select("id, khoa_hoc_vien, status, ngay_dau_ky, ngay_cuoi_ky, created_at, goi_hoc_phi")
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
          status: String(raw.status ?? "").trim(),
          ngay_dau_ky: raw.ngay_dau_ky,
          ngay_cuoi_ky: raw.ngay_cuoi_ky,
          created_at: raw.created_at,
          goi_hoc_phi: nId(raw.goi_hoc_phi),
          goi_so_buoi: null,
        });
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const goiIdsForBuoi = [
    ...new Set(
      allHp
        .map((r) => r.goi_hoc_phi)
        .filter((x): x is number => x != null && x > 0)
    ),
  ];
  const soBuoiByGoi = await fetchSoBuoiByGoiIds(supabase, goiIdsForBuoi);
  for (const r of allHp) {
    const gid = r.goi_hoc_phi;
    if (gid != null && soBuoiByGoi.has(gid)) {
      r.goi_so_buoi = soBuoiByGoi.get(gid)!;
    }
  }

  const byKcv = new Map<number, HpRow[]>();
  for (const r of allHp) {
    if (!byKcv.has(r.khoa_hoc_vien)) byKcv.set(r.khoa_hoc_vien, []);
    byKcv.get(r.khoa_hoc_vien)!.push(r);
  }

  for (const [kcv, rows] of byKcv) {
    const paidRows = rows.filter((r) => r.status === HP_THU_HP_CHI_TIET_DA_THANH_TOAN);
    if (!paidRows.length) continue;

    let anchor: string | null = null;
    for (const r of paidRows) {
      const d = sliceKyDate(r.ngay_dau_ky);
      if (d) anchor = minIsoYmd(anchor, d);
    }

    let totalBuoi = 0;
    for (const r of paidRows) {
      totalBuoi += linePurchasedBuoi(r);
    }

    const sortedPaidNewestFirst = [...paidRows].sort((a, b) => {
      const ca = pickCreatedAtMs(a.created_at);
      const cb = pickCreatedAtMs(b.created_at);
      if (cb !== ca) return cb - ca;
      return b.id - a.id;
    });
    const chiTietId = sortedPaidNewestFirst[0]!.id;

    let ngay_dau_ky: string | null = anchor;
    let ngay_cuoi_ky: string | null = null;

    if (anchor && totalBuoi > 0) {
      const anchorDt = parseLocalDateFromIso(anchor);
      if (anchorDt) {
        ngay_cuoi_ky = formatIsoLocalDate(addCalendarDays(anchorDt, totalBuoi - 1));
      }
    }

    if (!ngay_cuoi_ky) {
      let fallbackCuoi: string | null = null;
      for (const r of paidRows) {
        const c = sliceKyDate(r.ngay_cuoi_ky);
        if (c) fallbackCuoi = maxIsoYmd(fallbackCuoi, c);
      }
      if (!fallbackCuoi) continue;
      ngay_cuoi_ky = fallbackCuoi;
      if (!ngay_dau_ky) {
        for (const r of paidRows) {
          const d = sliceKyDate(r.ngay_dau_ky);
          if (d) ngay_dau_ky = minIsoYmd(ngay_dau_ky, d);
        }
      }
    }

    map.set(kcv, {
      chi_tiet_id: chiTietId,
      ngay_dau_ky,
      ngay_cuoi_ky,
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
