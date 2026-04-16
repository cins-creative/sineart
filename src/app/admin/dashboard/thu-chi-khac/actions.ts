"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/thu-chi-khac";

export type ThuChiActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function createThuChiKhacPhieu(input: {
  tieu_de: string;
  chu_thich: string | null;
  loai: "thu" | "chi";
  so_tien: number;
  hinh_thuc: string;
  loai_thu_chi_id: number | null;
  nguoi_tao_id: number;
}): Promise<ThuChiActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const tieu_de = input.tieu_de.trim();
  if (!tieu_de) return { ok: false, error: "Nhập tiêu đề." };
  if (!Number.isFinite(input.so_tien) || input.so_tien <= 0) return { ok: false, error: "Số tiền không hợp lệ." };
  if (!Number.isFinite(input.nguoi_tao_id) || input.nguoi_tao_id <= 0) {
    return { ok: false, error: "Chọn người tạo phiếu." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const thu = input.loai === "thu" ? input.so_tien : 0;
  const chi = input.loai === "chi" ? input.so_tien : 0;

  const { error } = await supabase.from("tc_thu_chi_khac").insert({
    tieu_de,
    chu_thich: input.chu_thich?.trim() || null,
    thu,
    chi,
    hinh_thuc: input.hinh_thuc.trim() || "Tiền mặt",
    loai_thu_chi_id: input.loai_thu_chi_id,
    nguoi_tao_id: input.nguoi_tao_id,
  });

  if (error) return { ok: false, error: error.message || "Không thêm được phiếu." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã thêm phiếu." };
}

export async function createLoaiThuChi(input: {
  giai_nghia: string;
  loai_thu_chi: "Thu" | "Chi";
}): Promise<ThuChiActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const giai_nghia = input.giai_nghia.trim();
  if (!giai_nghia) return { ok: false, error: "Nhập tên danh mục." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("tc_loai_thu_chi").insert({
    giai_nghia,
    loai_thu_chi: input.loai_thu_chi,
  });

  if (error) return { ok: false, error: error.message || "Không thêm được danh mục." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã thêm danh mục." };
}
