"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type BranchFormState =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const REVALIDATE = "/admin/dashboard/chi-nhanh";
const TABLE = "ql_chi_nhanh";

function revalidateBranches(): void {
  revalidatePath(REVALIDATE);
}

async function insertChiNhanh(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  payload: Record<string, unknown>
): Promise<{ error: { message: string } | null }> {
  let res = await supabase.from(TABLE).insert(payload);
  if (res.error && Object.keys(payload).length > 1) {
    res = await supabase.from(TABLE).insert({ ten: payload.ten });
  }
  return { error: res.error };
}

async function updateChiNhanhRow(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  id: number,
  payload: Record<string, unknown>
): Promise<{ error: { message: string } | null }> {
  let res = await supabase.from(TABLE).update(payload).eq("id", id);
  if (res.error && Object.keys(payload).length > 1) {
    res = await supabase.from(TABLE).update({ ten: payload.ten }).eq("id", id);
  }
  return { error: res.error };
}

export async function saveChiNhanh(
  _prev: BranchFormState | null,
  formData: FormData
): Promise<BranchFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const idRaw = String(formData.get("id") ?? "").trim();
  const id = idRaw === "" ? NaN : Number(idRaw);
  const ten = String(formData.get("ten") ?? "").trim();
  if (!ten) return { ok: false, error: "Vui lòng nhập tên chi nhánh." };
  if (ten.length > 500) return { ok: false, error: "Tên quá dài." };

  const dia_chi = String(formData.get("dia_chi") ?? "").trim() || null;
  const sdt = String(formData.get("sdt") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "true";

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const payload = { ten, dia_chi, sdt, is_active };

  if (!Number.isFinite(id) || id <= 0) {
    const { error } = await insertChiNhanh(supabase, payload);
    if (error) {
      return {
        ok: false,
        error:
          error.message ||
          `Không thêm được vào ${TABLE}. Kiểm tra bảng và quyền service role.`,
      };
    }
    revalidateBranches();
    return { ok: true, message: `Đã thêm «${ten}».` };
  }

  const { error } = await updateChiNhanhRow(supabase, id, payload);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được." };
  }
  revalidateBranches();
  return { ok: true, message: "Đã lưu." };
}

export async function toggleChiNhanhActive(id: number, is_active: boolean): Promise<BranchFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "ID không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from(TABLE).update({ is_active }).eq("id", id);
  if (error) {
    if (String(error.message).toLowerCase().includes("column")) {
      return {
        ok: false,
        error: `Cột is_active chưa có trên ${TABLE}.`,
      };
    }
    return { ok: false, error: error.message };
  }
  revalidateBranches();
  return { ok: true };
}

export async function deleteChiNhanh(id: number): Promise<BranchFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "ID không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const lop = await supabase
    .from("ql_lop_hoc")
    .select("id", { count: "exact", head: true })
    .eq("chi_nhanh_id", id);
  if (!lop.error && (lop.count ?? 0) > 0) {
    return { ok: false, error: `Còn ${lop.count} lớp gắn chi nhánh — không xóa được.` };
  }

  const ns = await supabase
    .from("hr_nhan_su")
    .select("id", { count: "exact", head: true })
    .eq("chi_nhanh_id", id);
  if (!ns.error && (ns.count ?? 0) > 0) {
    return { ok: false, error: `Còn ${ns.count} nhân sự gắn chi nhánh — không xóa được.` };
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, error: error.message || "Không xóa được." };

  revalidateBranches();
  return { ok: true, message: "Đã xóa chi nhánh." };
}
