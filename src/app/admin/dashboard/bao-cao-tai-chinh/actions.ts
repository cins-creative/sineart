"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { buildSupabasePayload, type ColData } from "@/lib/data/bao-cao-tai-chinh-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/bao-cao-tai-chinh";

export type BaoCaoTaiChinhSaveResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function saveBaoCaoTaiChinhColumn(input: {
  recordId: number | null;
  nam: string;
  thang: string;
  data: ColData;
}): Promise<BaoCaoTaiChinhSaveResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const nam = input.nam.trim();
  const thang = input.thang.trim();
  if (!nam || !thang) return { ok: false, error: "Thiếu năm hoặc tháng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const body = buildSupabasePayload(nam, thang, input.data);

  if (input.recordId != null && input.recordId > 0) {
    const { error } = await supabase.from("tc_bao_cao_tai_chinh").update(body).eq("id", input.recordId);
    if (error) return { ok: false, error: error.message || "Không cập nhật được." };
    revalidatePath(ADMIN_PATH);
    return { ok: true, id: input.recordId };
  }

  const { data, error } = await supabase
    .from("tc_bao_cao_tai_chinh")
    .insert(body)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message || "Không thêm được kỳ báo cáo." };
  const id = data?.id;
  if (typeof id !== "number") return { ok: false, error: "Không nhận được id sau khi thêm." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, id };
}

/** Đổi năm/tháng báo cáo cho một dòng đã lưu (tránh trùng cặp nam+thang với dòng khác). */
export async function updateBaoCaoTaiChinhPeriod(input: {
  recordId: number;
  newNam: string;
  newThang: string;
  data: ColData;
}): Promise<BaoCaoTaiChinhSaveResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const rid = input.recordId;
  if (!Number.isFinite(rid) || rid <= 0) {
    return { ok: false, error: "Id dòng không hợp lệ." };
  }

  const nam = input.newNam.trim();
  const thang = input.newThang.trim();
  if (!nam || !thang) return { ok: false, error: "Thiếu năm hoặc tháng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: dupRows, error: dupErr } = await supabase
    .from("tc_bao_cao_tai_chinh")
    .select("id")
    .eq("nam", nam)
    .eq("thang", thang)
    .neq("id", rid)
    .limit(1);

  if (dupErr) return { ok: false, error: dupErr.message || "Không kiểm tra được trùng kỳ." };
  if (dupRows != null && dupRows.length > 0) {
    return { ok: false, error: "Đã có kỳ cùng năm và tháng — chọn kỳ khác." };
  }

  const body = buildSupabasePayload(nam, thang, input.data);
  const { error } = await supabase.from("tc_bao_cao_tai_chinh").update(body).eq("id", rid);
  if (error) return { ok: false, error: error.message || "Không cập nhật được kỳ." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, id: rid };
}

export type BaoCaoTaiChinhDeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteBaoCaoTaiChinhRow(recordId: number): Promise<BaoCaoTaiChinhDeleteResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(recordId) || recordId <= 0) {
    return { ok: false, error: "Id dòng không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { error } = await supabase.from("tc_bao_cao_tai_chinh").delete().eq("id", recordId);
  if (error) return { ok: false, error: error.message || "Không xóa được kỳ báo cáo." };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
