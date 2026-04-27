"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  adminStaffCanEditThuChiKhacPhieu,
  THU_CHI_KHAC_EDIT_FORBIDDEN_MSG,
} from "@/lib/admin/staff-mutation-access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/thu-chi-khac";

export type ThuChiActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function gateThuChiKhacMutation(
  supabase: SupabaseClient,
  staffId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: editorRow, error: editorErr } = await supabase
    .from("hr_nhan_su")
    .select("vai_tro")
    .eq("id", staffId)
    .maybeSingle();

  if (editorErr) return { ok: false, error: editorErr.message };
  if (!adminStaffCanEditThuChiKhacPhieu(editorRow?.vai_tro as string | null)) {
    return { ok: false, error: THU_CHI_KHAC_EDIT_FORBIDDEN_MSG };
  }
  return { ok: true };
}

export async function createThuChiKhacPhieu(input: {
  tieu_de: string;
  chu_thich: string | null;
  loai: "thu" | "chi";
  so_tien: number;
  hinh_thuc: string;
  danh_muc_thu_chi_id: number | null;
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
    danh_muc_thu_chi_id: input.danh_muc_thu_chi_id,
    loai_thu_chi_id: null,
    nguoi_tao_id: input.nguoi_tao_id,
  });

  if (error) return { ok: false, error: error.message || "Không thêm được phiếu." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã thêm phiếu." };
}

export async function updateThuChiKhacPhieu(input: {
  id: number;
  tieu_de: string;
  chu_thich: string | null;
  loai: "thu" | "chi";
  so_tien: number;
  hinh_thuc: string;
  danh_muc_thu_chi_id: number | null;
  nguoi_tao_id: number;
}): Promise<ThuChiActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.id) || input.id <= 0) return { ok: false, error: "Phiếu không hợp lệ." };

  const tieu_de = input.tieu_de.trim();
  if (!tieu_de) return { ok: false, error: "Nhập tiêu đề." };
  if (!Number.isFinite(input.so_tien) || input.so_tien <= 0) return { ok: false, error: "Số tiền không hợp lệ." };
  if (!Number.isFinite(input.nguoi_tao_id) || input.nguoi_tao_id <= 0) {
    return { ok: false, error: "Chọn người tạo phiếu." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const gate = await gateThuChiKhacMutation(supabase, session.staffId);
  if (!gate.ok) return gate;

  const thu = input.loai === "thu" ? input.so_tien : 0;
  const chi = input.loai === "chi" ? input.so_tien : 0;

  const patch: Record<string, unknown> = {
    tieu_de,
    chu_thich: input.chu_thich?.trim() || null,
    thu,
    chi,
    hinh_thuc: input.hinh_thuc.trim() || "Tiền mặt",
    danh_muc_thu_chi_id: input.danh_muc_thu_chi_id,
    nguoi_tao_id: input.nguoi_tao_id,
  };
  if (input.danh_muc_thu_chi_id != null) {
    patch.loai_thu_chi_id = null;
  }

  const { error } = await supabase.from("tc_thu_chi_khac").update(patch).eq("id", input.id);

  if (error) return { ok: false, error: error.message || "Không cập nhật được phiếu." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã cập nhật phiếu." };
}

export async function deleteThuChiKhacPhieu(id: number): Promise<ThuChiActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Phiếu không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const gate = await gateThuChiKhacMutation(supabase, session.staffId);
  if (!gate.ok) return gate;

  const { error } = await supabase.from("tc_thu_chi_khac").delete().eq("id", id);

  if (error) return { ok: false, error: error.message || "Không xóa được phiếu." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã xóa phiếu." };
}

/** Thêm dòng trong `tc_danh_muc_thu_chi` (danh mục thu/chi chuẩn). */
export async function createDanhMucThuChi(input: {
  ma: string;
  ten: string;
  nhom: string;
  loai: "Thu" | "Chi";
  thu_tu?: number;
}): Promise<ThuChiActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ma = input.ma.trim();
  const ten = input.ten.trim();
  const nhom = input.nhom.trim();
  if (!ma) return { ok: false, error: "Nhập mã danh mục." };
  if (!ten) return { ok: false, error: "Nhập tên danh mục." };
  if (!nhom) return { ok: false, error: "Nhập nhóm danh mục." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("tc_danh_muc_thu_chi").insert({
    ma,
    ten,
    nhom,
    loai: input.loai,
    thu_tu: input.thu_tu ?? 0,
    active: true,
  });

  if (error) return { ok: false, error: error.message || "Không thêm được danh mục." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã thêm danh mục." };
}
