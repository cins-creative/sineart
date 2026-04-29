"use server";

import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
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

/**
 * Xóa dòng gắn `lopId` theo từng cột FK lớp — gọi **hết** các cột (schema có thể có `lop_hoc` và/hoặc `class`).
 */
async function deleteRowsByLopFkColumn(
  sb: SupabaseClient,
  table: string,
  lopId: number,
  columns: readonly string[]
): Promise<{ ok: false; error: string } | { ok: true }> {
  let sawSuccess = false;
  let lastErr = "";
  for (const col of columns) {
    const { error } = await sb.from(table).delete().eq(col, lopId);
    if (!error) sawSuccess = true;
    else lastErr = error.message || col;
  }
  return sawSuccess ? { ok: true } : { ok: false, error: lastErr };
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

/** Đọc nhiều giáo viên từ FormData (fd.append("teacher", id) nhiều lần). */
function parseTeachersFromFd(fd: FormData): number[] {
  const vals = fd.getAll("teacher");
  const ids = vals
    .map((v) => Number(String(v).trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
  return [...new Set(ids)];
}

type LopPayload = {
  class_name: string | null;
  class_full_name: string | null;
  mon_hoc: number | null;
  /** Mảng ID giáo viên (có thể rỗng nếu chưa gán). */
  teacher: number[];
  chi_nhanh_id: number | null;
  avatar: string | null;
  lich_hoc: string | null;
  device: string | null;
  special: boolean;
  tinh_trang: boolean;
};

/** Gửi mảng GV lên DB — trả về mảng (bigint[]) hoặc null nếu rỗng. */
function teacherForDb(ids: number[]): number[] | null {
  return ids.length > 0 ? ids : null;
}

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
      teacher: parseTeachersFromFd(fd),
      chi_nhanh_id: parseFk(fd, "chi_nhanh_id"),
      avatar: optionalText(fd, "avatar"),
      lich_hoc: optionalText(fd, "lich_hoc"),
      device: optionalText(fd, "device"),
      special: String(fd.get("special") ?? "") === "1",
      tinh_trang: String(fd.get("tinh_trang") ?? "") !== "0" && String(fd.get("tinh_trang") ?? "") !== "",
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

  const payload: Record<string, unknown> = {
    ...parsed.data,
    special: parsed.data.special ? "Cấp tốc" : null,
    teacher: teacherForDb(parsed.data.teacher),
  };
  const { error } = await supabase.from("ql_lop_hoc").insert(payload);
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

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    special: parsed.data.special ? "Cấp tốc" : null,
    teacher: teacherForDb(parsed.data.teacher),
  };
  const { error } = await supabase.from("ql_lop_hoc").update(updatePayload).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được." };
  }

  revalidateLopHocPublic();
  return { ok: true, message: "Đã lưu thông tin lớp học." };
}

export async function updateTeacherPortfolio(payload: {
  teacherId: number;
  portfolio: string[];
}): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const teacherId = Number(payload.teacherId);
  if (!Number.isFinite(teacherId) || teacherId <= 0) {
    return { ok: false, error: "ID giáo viên không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const portfolio = payload.portfolio
    .map((url) => String(url).trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("hr_nhan_su")
    .update({ portfolio })
    .eq("id", teacherId);

  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được portfolio giáo viên." };
  }

  revalidateLopHocPublic();
  revalidatePath("/");
  revalidatePath("/gallery", "page");
  return { ok: true, message: "Đã cập nhật portfolio giáo viên." };
}

export async function duplicateLopHoc(id: number): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase trên server." };

  const { data, error: fetchErr } = await supabase
    .from("ql_lop_hoc")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !data) {
    return { ok: false, error: fetchErr?.message || "Không tìm được lớp cần nhân bản." };
  }

  const raw = data as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, ...rest } = raw;

  const newRow: Record<string, unknown> = {
    ...rest,
    class_name: raw.class_name ? `${raw.class_name} (copy)` : null,
    class_full_name: raw.class_full_name ? `${raw.class_full_name} (copy)` : null,
  };

  const { error: insertErr } = await supabase.from("ql_lop_hoc").insert(newRow);
  if (insertErr) return { ok: false, error: insertErr.message || "Không nhân bản được lớp học." };

  revalidateLopHocPublic();
  return { ok: true, message: "Đã nhân bản lớp học." };
}

export async function toggleLopSpecial(id: number, value: boolean): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("ql_lop_hoc").update({ special: value ? "Cấp tốc" : null }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateLopHocPublic();
  return { ok: true, message: value ? "Đã đánh dấu cấp tốc." : "Đã bỏ cấp tốc." };
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

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { data: enRows, error: enListErr } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id")
    .eq("lop_hoc", id);

  if (enListErr) {
    return { ok: false, error: enListErr.message || "Không đọc được ghi danh lớp." };
  }

  const enrollmentIds = (enRows ?? [])
    .map((r) => Number((r as { id?: unknown }).id))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (enrollmentIds.length > 0) {
    const { error: hpErr } = await supabase
      .from("hp_thu_hp_chi_tiet")
      .delete()
      .in("khoa_hoc_vien", enrollmentIds);
    if (hpErr) {
      return {
        ok: false,
        error:
          hpErr.message ||
          "Không xóa được dòng học phí (hp_thu_hp_chi_tiet) — kiểm tra ràng buộc CSDL.",
      };
    }
  }

  const chatDel = await deleteRowsByLopFkColumn(supabase, "hv_chatbox", id, ["lop_hoc", "class"]);
  if (!chatDel.ok) {
    return {
      ok: false,
      error: `hv_chatbox: ${chatDel.error}`,
    };
  }

  const { error: diemDanhErr } = await supabase.from("hv_diem_danh").delete().eq("lop_hoc_id", id);
  if (diemDanhErr) {
    return {
      ok: false,
      error: diemDanhErr.message || "Không xóa được điểm danh (hv_diem_danh).",
    };
  }

  const hvBaiDel = await deleteRowsByLopFkColumn(supabase, "hv_bai_hoc_vien", id, [
    "lop_hoc",
    "class",
  ]);
  if (!hvBaiDel.ok) {
    return {
      ok: false,
      error: `hv_bai_hoc_vien: ${hvBaiDel.error}`,
    };
  }

  const { error: qlEnErr } = await supabase.from("ql_quan_ly_hoc_vien").delete().eq("lop_hoc", id);
  if (qlEnErr) {
    return {
      ok: false,
      error: qlEnErr.message || "Không xóa được ghi danh (ql_quan_ly_hoc_vien).",
    };
  }

  const { error } = await supabase.from("ql_lop_hoc").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "Không xóa được lớp (có thể còn bảng khác tham chiếu ql_lop_hoc — xem SQL Supabase).",
    };
  }

  revalidateLopHocPublic();
  return { ok: true, message: "Đã xóa lớp học và dữ liệu liên quan (ghi danh, học phí chi tiết, phòng học…)." };
}
