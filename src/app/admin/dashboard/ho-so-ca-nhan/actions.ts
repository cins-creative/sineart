"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type UpdateStaffSelfBasicInfoResult = { ok: true } | { ok: false; error: string };

/**
 * Nhân sự chỉnh sửa **chính mình**: email, SĐT, ngày sinh, STK nhận lương (`stk_nhan_luong`).
 * Không áp dụng khi xem hồ sơ người khác (chỉ đọc).
 */
export async function updateStaffSelfBasicInfo(payload: {
  email: string | null;
  sdt: string | null;
  ngay_sinh: string | null;
  stk_nhan_luong: string | null;
}): Promise<UpdateStaffSelfBasicInfoResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(session.staffId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Không xác định được tài khoản nhân sự." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const toDateOrNull = (s: string | null): string | null => {
    if (s == null || String(s).trim() === "") return null;
    const t = String(s).trim().slice(0, 10);
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t) ? t : null;
  };

  const trimOrNull = (s: string | null): string | null =>
    s != null && String(s).trim() !== "" ? String(s).trim() : null;

  const email = trimOrNull(payload.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email không hợp lệ." };
  }

  const { error } = await supabase
    .from("hr_nhan_su")
    .update({
      email,
      sdt: trimOrNull(payload.sdt),
      ngay_sinh: toDateOrNull(payload.ngay_sinh),
      stk_nhan_luong: trimOrNull(payload.stk_nhan_luong),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message || "Không lưu được thông tin." };
  }

  revalidatePath("/admin/dashboard/ho-so-ca-nhan");
  revalidatePath(`/admin/dashboard/ho-so-ca-nhan/${id}`);
  return { ok: true };
}

export type UpdateStaffSelfAvatarResult = { ok: true } | { ok: false; error: string };

/**
 * Nhân sự chỉ đổi **ảnh đại diện của chính mình** (`hr_nhan_su.avatar`).
 * URL từ upload Cloudflare qua `/admin/api/upload-cf-image`.
 */
export async function updateStaffSelfAvatar(avatar: string | null): Promise<UpdateStaffSelfAvatarResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(session.staffId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Không xác định được tài khoản nhân sự." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const next = avatar != null && String(avatar).trim() !== "" ? String(avatar).trim() : null;

  const { error } = await supabase.from("hr_nhan_su").update({ avatar: next }).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được ảnh đại diện." };
  }

  revalidatePath("/admin/dashboard/ho-so-ca-nhan");
  revalidatePath(`/admin/dashboard/ho-so-ca-nhan/${id}`);
  revalidatePath("/admin/dashboard/quan-ly-nhan-su");
  return { ok: true };
}
