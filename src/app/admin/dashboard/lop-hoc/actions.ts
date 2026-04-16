"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type LopHocFormState =
  | { ok: true; message: string }
  | { ok: false; error: string };

const ADMIN_LOP = "/admin/dashboard/lop-hoc";

function revalidateLopHocPublic(): void {
  revalidatePath(ADMIN_LOP);
  revalidatePath("/khoa-hoc", "page");
  revalidatePath("/khoa-hoc", "layout");
}

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function parseFk(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type LopPayload = {
  class_name: string | null;
  class_full_name: string | null;
  mon_hoc: number | null;
  teacher: number | null;
  chi_nhanh_id: number | null;
  avatar: string | null;
  lich_hoc: string | null;
  url_class: string | null;
  url_google_meet: string | null;
  device: string | null;
};

function readLopPayload(fd: FormData): { ok: true; data: LopPayload } | { ok: false; error: string } {
  const class_name = optionalText(fd, "class_name");
  const class_full_name = optionalText(fd, "class_full_name");
  if (!class_name && !class_full_name) {
    return { ok: false, error: "Nhập tên lớp (rút gọn hoặc đầy đủ)." };
  }

  return {
    ok: true,
    data: {
      class_name,
      class_full_name,
      mon_hoc: parseFk(fd, "mon_hoc"),
      teacher: parseFk(fd, "teacher"),
      chi_nhanh_id: parseFk(fd, "chi_nhanh_id"),
      avatar: optionalText(fd, "avatar"),
      lich_hoc: optionalText(fd, "lich_hoc"),
      url_class: optionalText(fd, "url_class"),
      url_google_meet: optionalText(fd, "url_google_meet"),
      device: optionalText(fd, "device"),
    },
  };
}

export async function createLopHoc(
  _prev: LopHocFormState | null,
  formData: FormData
): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const parsed = readLopPayload(formData);
  if (!parsed.ok) return parsed;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  let payload: Record<string, unknown> = { ...parsed.data };
  let { error } = await supabase.from("ql_lop_hoc").insert(payload);
  if (error && String(error.message).toLowerCase().includes("url_google_meet")) {
    payload = { ...parsed.data };
    delete payload.url_google_meet;
    ({ error } = await supabase.from("ql_lop_hoc").insert(payload));
  }
  if (error && String(error.message).toLowerCase().includes("column")) {
    const minimal = {
      class_name: parsed.data.class_name,
      class_full_name: parsed.data.class_full_name,
      mon_hoc: parsed.data.mon_hoc,
      teacher: parsed.data.teacher,
      chi_nhanh_id: parsed.data.chi_nhanh_id,
    };
    ({ error } = await supabase.from("ql_lop_hoc").insert(minimal));
  }
  if (error) {
    return { ok: false, error: error.message || "Không thêm được lớp học." };
  }

  revalidateLopHocPublic();
  return { ok: true, message: "Đã tạo lớp học." };
}

export async function updateLopHoc(
  _prev: LopHocFormState | null,
  formData: FormData
): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Mã lớp không hợp lệ." };
  }

  const parsed = readLopPayload(formData);
  if (!parsed.ok) return parsed;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  let updatePayload: Record<string, unknown> = { ...parsed.data };
  let { error } = await supabase.from("ql_lop_hoc").update(updatePayload).eq("id", id);
  if (error && String(error.message).toLowerCase().includes("url_google_meet")) {
    updatePayload = { ...parsed.data };
    delete updatePayload.url_google_meet;
    ({ error } = await supabase.from("ql_lop_hoc").update(updatePayload).eq("id", id));
  }
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được." };
  }

  revalidateLopHocPublic();
  return { ok: true, message: "Đã lưu thông tin lớp học." };
}

export async function deleteLopHoc(id: number): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Mã lớp không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const { error } = await supabase.from("ql_lop_hoc").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error: error.message || "Không xóa được (có thể còn ghi danh hoặc dữ liệu liên quan).",
    };
  }

  revalidateLopHocPublic();
  return { ok: true, message: "Đã xóa lớp học." };
}
