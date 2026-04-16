import type { SupabaseClient } from "@supabase/supabase-js";

/** Giống enum / lựa chọn trong Framer VH_Upload_Sao_ke. */
export const TAI_KHOAN_OPTIONS = [
  "TPbank Sine Art - 00867551531",
  "Vietcombank Sine Art cũ - 1033212336",
  "TPbank Đỗ Ngọc Linh",
  "TPBank Phạm Kim Uyên",
  "TPBank Cty CINs",
] as const;

export const THANG_OPTIONS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
] as const;

export const TINH_TRANG_OPTIONS = ["Chưa xử lý", "Đã xử lý"] as const;

export function namOptions(centerYear: number): string[] {
  return Array.from({ length: 7 }, (_, i) => String(centerYear - 2 + i));
}

/** Dòng `tc_sao_ke_ngan_hang` (theo Framer VH_Upload_Sao_ke). */
export type AdminSaoKeRow = {
  id: number;
  created_at: string;
  tai_khoan_ngan_hang: string | null;
  file_dinh_kem: string | null;
  ky_sao_ke: string | null;
  nam: string | null;
  ghi_chu: string | null;
  tinh_trang: string | null;
};

const SELECT =
  "id,created_at,tai_khoan_ngan_hang,file_dinh_kem,ky_sao_ke,nam,ghi_chu,tinh_trang";

export async function fetchAdminSaoKeRows(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: AdminSaoKeRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("tc_sao_ke_ngan_hang")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message || "Không đọc được tc_sao_ke_ngan_hang." };
  return { ok: true, rows: (data ?? []) as unknown as AdminSaoKeRow[] };
}
