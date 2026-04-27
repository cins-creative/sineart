import type { SupabaseClient } from "@supabase/supabase-js";

export const TC_TAI_SAN_TABLE = "tc_tai_san_rong" as const;

export type TaiSanDbRow = {
  id: number;
  ten_tai_san: string;
  loai_tai_san: string | null;
  ngay_mua: string | null;
  gia_tri_moi_mua: number | null;
  thoi_gian_khau_hao: number | null;
  created_at?: string;
};

const SELECT_LIST =
  "id,ten_tai_san,loai_tai_san,ngay_mua,gia_tri_moi_mua,thoi_gian_khau_hao,created_at";

export async function fetchAdminTaiSanRows(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: TaiSanDbRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from(TC_TAI_SAN_TABLE)
    .select(SELECT_LIST)
    .order("gia_tri_moi_mua", { ascending: false });

  if (error) return { ok: false, error: error.message || "Không đọc được tc_tai_san_rong." };
  return { ok: true, rows: (data ?? []) as TaiSanDbRow[] };
}

const num = (v: unknown): number => {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Số tháng dương lịch đã qua từ tháng mua đến tháng chứa `ref` (cùng quy ước với UI Giá trị tài sản). */
export function monthsElapsedSincePurchaseRef(ngayMua: string | null, ref: Date): number {
  if (!ngayMua?.trim()) return 0;
  try {
    const start = new Date(ngayMua.trim());
    const m =
      (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth());
    return Math.max(0, m);
  } catch {
    return 0;
  }
}

/** Số tháng đã qua kể từ ngày mua đến hiện tại (không âm). */
export function monthsElapsedSincePurchase(ngayMua: string | null): number {
  return monthsElapsedSincePurchaseRef(ngayMua, new Date());
}

function endOfCalendarMonthFromKey(monthKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) return null;
  return new Date(y, mo, 0, 23, 59, 59, 999);
}

function endOfPrevCalendarMonthFromKey(monthKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) return null;
  return new Date(y, mo - 1, 0, 23, 59, 59, 999);
}

/** Lũy kế khấu hao đến hết tháng `monthKey` (YYYY-MM), cùng mô hình đường thẳng với `computeTaiSanDepreciation`. */
export function cumulativeDepreciationThroughMonth(row: TaiSanDbRow, monthKey: string): number {
  const end = endOfCalendarMonthFromKey(monthKey);
  if (!end) return 0;
  const giaTri = num(row.gia_tri_moi_mua);
  const thoiGian = Math.floor(num(row.thoi_gian_khau_hao));
  if (thoiGian <= 0 || giaTri <= 0) return 0;
  const khauHaoThang = giaTri / thoiGian;
  const elapsed = monthsElapsedSincePurchaseRef(row.ngay_mua, end);
  return Math.min(giaTri, khauHaoThang * elapsed);
}

/**
 * Chi phí khấu hao **phát sinh trong** tháng dương lịch `monthKey`.
 * = lũy kế đến hết tháng − lũy kế đến hết tháng trước (retro khi đổi nguyên giá / kỳ KH trên DB).
 *
 * Không cần bảng snapshot: luôn đọc `tc_tai_san_rong` và tái tính — nhất quán với trang Giá trị tài sản.
 */
export function depreciationExpenseForCalendarMonth(row: TaiSanDbRow, monthKey: string): number {
  const endThis = endOfCalendarMonthFromKey(monthKey);
  const endPrev = endOfPrevCalendarMonthFromKey(monthKey);
  if (!endThis || !endPrev) return 0;
  const cumThis = cumulativeDepreciationThroughMonth(row, monthKey);
  const yPrev = endPrev.getFullYear();
  const mPrev = String(endPrev.getMonth() + 1).padStart(2, "0");
  const prevKey = `${yPrev}-${mPrev}`;
  const cumPrev = cumulativeDepreciationThroughMonth(row, prevKey);
  const delta = cumThis - cumPrev;
  return delta > 0 ? Math.round(delta) : 0;
}

export type TaiSanComputed = Omit<TaiSanDbRow, "gia_tri_moi_mua" | "thoi_gian_khau_hao"> & {
  gia_tri_moi_mua: number;
  thoi_gian_khau_hao: number | null;
  khauHaoThang: number;
  daKhauHao: number;
  conLai: number;
  pctConLai: number;
};

/** Logic khớp Framer: khấu hao đều theo tháng, đã khấu max = nguyên giá. */
export function computeTaiSanDepreciation(row: TaiSanDbRow): TaiSanComputed {
  const giaTri = num(row.gia_tri_moi_mua);
  const thoiGian = Math.floor(num(row.thoi_gian_khau_hao));

  let khauHaoThang = 0;
  let daKhauHao = 0;
  let conLai = giaTri;

  if (thoiGian > 0 && giaTri > 0) {
    khauHaoThang = giaTri / thoiGian;
    const elapsed = monthsElapsedSincePurchase(row.ngay_mua);
    daKhauHao = Math.min(giaTri, khauHaoThang * elapsed);
    conLai = giaTri - daKhauHao;
  }

  return {
    ...row,
    gia_tri_moi_mua: giaTri,
    thoi_gian_khau_hao: thoiGian || null,
    khauHaoThang,
    daKhauHao,
    conLai,
    pctConLai: giaTri > 0 ? Math.round((conLai / giaTri) * 100) : 100,
  };
}
