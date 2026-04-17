"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type KhoaHocFormState =
  | { ok: true; message: string }
  | { ok: false; error: string };

const ADMIN_LIST = "/admin/dashboard/khoa-hoc";

function revalidateKhoaHocPublic(): void {
  revalidatePath(ADMIN_LIST);
  revalidatePath("/khoa-hoc", "page");
  revalidatePath("/khoa-hoc", "layout");
}

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function parseThuTu(fd: FormData): number {
  const n = Number(fd.get("thu_tu_hien_thi"));
  if (!Number.isFinite(n)) return 99;
  return Math.min(9999, Math.max(0, Math.trunc(n)));
}

function parseFeatured(fd: FormData): boolean {
  return fd.get("is_featured") === "true";
}

/** `si_so` — sức chứa / chỉ tiêu; để trống → null */
function parseSiSo(fd: FormData): number | null {
  const raw = String(fd.get("si_so") ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

type MonPayload = {
  ten_mon_hoc: string;
  thumbnail: string | null;
  loai_khoa_hoc: string | null;
  thu_tu_hien_thi: number;
  is_featured: boolean;
  hinh_thuc: string | null;
  si_so: number | null;
};

function readMonPayload(fd: FormData): { ok: true; data: MonPayload } | { ok: false; error: string } {
  const ten_mon_hoc = String(fd.get("ten_mon_hoc") ?? "").trim();
  if (!ten_mon_hoc) {
    return { ok: false, error: "Nhập tên môn / khóa học." };
  }
  if (ten_mon_hoc.length > 500) {
    return { ok: false, error: "Tên môn quá dài." };
  }

  return {
    ok: true,
    data: {
      ten_mon_hoc,
      thumbnail: optionalText(fd, "thumbnail"),
      loai_khoa_hoc: optionalText(fd, "loai_khoa_hoc"),
      thu_tu_hien_thi: parseThuTu(fd),
      is_featured: parseFeatured(fd),
      hinh_thuc: optionalText(fd, "hinh_thuc"),
      si_so: parseSiSo(fd),
    },
  };
}

export async function createKhoaHoc(
  _prev: KhoaHocFormState | null,
  formData: FormData
): Promise<KhoaHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const parsed = readMonPayload(formData);
  if (!parsed.ok) return parsed;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const { error } = await supabase.from("ql_mon_hoc").insert(parsed.data);
  if (error) {
    return { ok: false, error: error.message || "Không thêm được khóa học." };
  }

  revalidateKhoaHocPublic();
  return { ok: true, message: `Đã thêm «${parsed.data.ten_mon_hoc}».` };
}

export async function updateKhoaHoc(
  _prev: KhoaHocFormState | null,
  formData: FormData
): Promise<KhoaHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Mã môn không hợp lệ." };
  }

  const parsed = readMonPayload(formData);
  if (!parsed.ok) return parsed;

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const { error } = await supabase.from("ql_mon_hoc").update(parsed.data).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được." };
  }

  revalidateKhoaHocPublic();
  revalidatePath(`${ADMIN_LIST}/${id}`);
  return { ok: true, message: "Đã lưu thông tin khóa học." };
}

export async function deleteKhoaHoc(id: number): Promise<KhoaHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Mã môn không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { error } = await supabase.from("ql_mon_hoc").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        "Không xóa được (có thể còn lớp học hoặc dữ liệu liên quan gắn môn này).",
    };
  }

  revalidateKhoaHocPublic();
  revalidatePath(`${ADMIN_LIST}/${id}`);
  return { ok: true, message: "Đã xóa khóa học." };
}
