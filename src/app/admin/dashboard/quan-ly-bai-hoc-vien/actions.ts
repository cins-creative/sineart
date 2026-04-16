"use server";

import { revalidatePath } from "next/cache";

import { isWrongLopFkColumnError } from "@/app/api/phong-hoc/hv-chatbox/lop-column";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/quan-ly-bai-hoc-vien";

const STATUS_VALUES = new Set(["Chờ xác nhận", "Hoàn thiện", "Không đủ chất lượng"]);

export type UpdateBaiHocVienPayload = {
  status?: string;
  score?: number | null;
  thuoc_bai_tap?: number | null;
  bai_mau?: boolean;
  photo?: string | null;
  ghi_chu?: string | null;
  /** FK `hv_bai_hoc_vien.ten_hoc_vien` → `ql_thong_tin_hoc_vien.id` */
  hoc_vien_id?: number | null;
  /** FK lớp — cột `lop_hoc` hoặc `class` tùy schema */
  lop_id?: number | null;
};

export type AdminBhvMutationResult = { ok: true } | { ok: false; error: string };

export async function updateBaiHocVien(id: number, patch: UpdateBaiHocVienPayload): Promise<AdminBhvMutationResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Id không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!STATUS_VALUES.has(patch.status)) return { ok: false, error: "Trạng thái không hợp lệ." };
    body.status = patch.status;
  }
  if (patch.score !== undefined) {
    if (patch.score != null && (!Number.isFinite(patch.score) || patch.score < 0)) {
      return { ok: false, error: "Điểm không hợp lệ." };
    }
    body.score = patch.score;
  }
  if (patch.thuoc_bai_tap !== undefined) {
    if (patch.thuoc_bai_tap != null && (!Number.isFinite(patch.thuoc_bai_tap) || patch.thuoc_bai_tap <= 0)) {
      return { ok: false, error: "Bài tập không hợp lệ." };
    }
    body.thuoc_bai_tap = patch.thuoc_bai_tap;
  }
  if (patch.bai_mau !== undefined) body.bai_mau = patch.bai_mau;
  if (patch.photo !== undefined) body.photo = patch.photo;
  if (patch.ghi_chu !== undefined) body.ghi_chu = patch.ghi_chu;
  if (patch.hoc_vien_id !== undefined) {
    const v = patch.hoc_vien_id;
    if (v != null && (!Number.isFinite(v) || v <= 0)) return { ok: false, error: "Học viên không hợp lệ." };
    body.ten_hoc_vien = v;
  }
  if (patch.lop_id !== undefined) {
    const v = patch.lop_id;
    if (v != null && (!Number.isFinite(v) || v <= 0)) return { ok: false, error: "Lớp không hợp lệ." };
    body.lop_hoc = v;
  }

  if (Object.keys(body).length === 0) return { ok: false, error: "Không có trường cập nhật." };

  let { error } = await supabase.from("hv_bai_hoc_vien").update(body).eq("id", id);
  if (error && isWrongLopFkColumnError(error) && patch.lop_id !== undefined && "lop_hoc" in body) {
    delete body.lop_hoc;
    body.class = patch.lop_id;
    ({ error } = await supabase.from("hv_bai_hoc_vien").update(body).eq("id", id));
  }
  if (error) return { ok: false, error: error.message || "Không cập nhật được." };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function deleteBaiHocVien(id: number): Promise<AdminBhvMutationResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Id không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("hv_bai_hoc_vien").delete().eq("id", id);
  if (error) return { ok: false, error: error.message || "Không xóa được." };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
