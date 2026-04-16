"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import type { AdminSaoKeRow } from "@/lib/data/admin-sao-ke";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/sao-ke";

export type SaoKeActionResult =
  | { ok: true; row?: AdminSaoKeRow }
  | { ok: false; error: string };

export async function createSaoKeNganHang(input: {
  tai_khoan_ngan_hang: string;
  file_dinh_kem: string;
  ky_sao_ke: string;
  nam: string;
  ghi_chu: string | null;
}): Promise<SaoKeActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const tk = input.tai_khoan_ngan_hang.trim();
  const url = input.file_dinh_kem.trim();
  const ky = input.ky_sao_ke.trim();
  const nam = input.nam.trim();
  if (!tk || !url || !ky || !nam) return { ok: false, error: "Thiếu thông tin bắt buộc." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data, error } = await supabase
    .from("tc_sao_ke_ngan_hang")
    .insert({
      tai_khoan_ngan_hang: tk,
      file_dinh_kem: url,
      ky_sao_ke: ky,
      nam,
      ghi_chu: input.ghi_chu?.trim() || null,
      tinh_trang: "Chưa xử lý",
    })
    .select("id,created_at,tai_khoan_ngan_hang,file_dinh_kem,ky_sao_ke,nam,ghi_chu,tinh_trang")
    .single();

  if (error) return { ok: false, error: error.message || "Không thêm được bản ghi." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, row: data as unknown as AdminSaoKeRow };
}

export async function updateSaoKeTinhTrang(
  id: number,
  tinh_trang: string,
): Promise<SaoKeActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Id không hợp lệ." };
  if (tinh_trang !== "Chưa xử lý" && tinh_trang !== "Đã xử lý") {
    return { ok: false, error: "Tình trạng không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("tc_sao_ke_ngan_hang").update({ tinh_trang }).eq("id", id);

  if (error) return { ok: false, error: error.message || "Không cập nhật được." };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
