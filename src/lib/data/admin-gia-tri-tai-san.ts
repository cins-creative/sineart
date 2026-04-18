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

/** Số tháng đã qua kể từ ngày mua (không âm). */
export function monthsElapsedSincePurchase(ngayMua: string | null): number {
  if (!ngayMua?.trim()) return 0;
  try {
    const start = new Date(ngayMua.trim());
    const now = new Date();
    const m =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, m);
  } catch {
    return 0;
  }
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
