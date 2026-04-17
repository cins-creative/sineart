"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { MK_DATA_TABLE, MK_INPUT_COLS, type MkDataAnalysisRow } from "@/lib/data/admin-report-mkt";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/report-mkt";

export type ReportMktActionResult =
  | { ok: true; message?: string; row?: MkDataAnalysisRow }
  | { ok: false; error: string };

function rowIdFromNgay(ngay: string): string {
  return ngay.replace(/-/g, "_");
}

function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

export async function saveMkDataRow(row: MkDataAnalysisRow): Promise<ReportMktActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const body: Record<string, unknown> = { ngay_thang_nhap: row.ngay_thang_nhap };
  for (const { key } of MK_INPUT_COLS) {
    const v = row[key];
    if (v === null) body[key] = null;
    else if (v !== undefined && Number.isFinite(v)) body[key] = v;
  }

  const { data, error } = await supabase.from(MK_DATA_TABLE).update(body).eq("id", row.id).select("*").maybeSingle();

  if (error) return { ok: false, error: error.message || "Không lưu được." };
  if (!data) return { ok: false, error: "Không tìm thấy bản ghi sau khi lưu." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã lưu.", row: data as MkDataAnalysisRow };
}

export async function createMkDataWeek(ngay_thang_nhap: string): Promise<ReportMktActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ngay = ngay_thang_nhap.trim();
  if (!ngay) return { ok: false, error: "Chọn ngày." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: dup } = await supabase.from(MK_DATA_TABLE).select("id").eq("ngay_thang_nhap", ngay).maybeSingle();
  if (dup) return { ok: false, error: "Ngày này đã tồn tại." };

  const id = rowIdFromNgay(ngay);
  const { data, error } = await supabase
    .from(MK_DATA_TABLE)
    .insert({ id, ngay_thang_nhap: ngay })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message || "Không thêm được tuần." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã thêm tuần.", row: data as MkDataAnalysisRow };
}

/** Đổi ngày đại diện của kỳ (cập nhật `id` + `ngay_thang_nhap` cho khớp quy ước app). */
export async function updateMkDataWeekDate(
  oldId: string,
  newNgayThangNhap: string,
): Promise<ReportMktActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ngay = newNgayThangNhap.trim();
  if (!isoDateOk(ngay)) return { ok: false, error: "Ngày không hợp lệ (YYYY-MM-DD)." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: current, error: curErr } = await supabase
    .from(MK_DATA_TABLE)
    .select("id,ngay_thang_nhap")
    .eq("id", oldId)
    .maybeSingle();

  if (curErr) return { ok: false, error: curErr.message };
  if (!current) return { ok: false, error: "Không tìm thấy kỳ." };

  if (current.ngay_thang_nhap === ngay) {
    const { data: full } = await supabase.from(MK_DATA_TABLE).select("*").eq("id", oldId).maybeSingle();
    return { ok: true, message: "Không đổi.", row: (full ?? current) as MkDataAnalysisRow };
  }

  const { data: dupNgay } = await supabase.from(MK_DATA_TABLE).select("id").eq("ngay_thang_nhap", ngay).maybeSingle();
  if (dupNgay && dupNgay.id !== oldId) {
    return { ok: false, error: "Ngày này đã được dùng cho kỳ khác." };
  }

  const newId = rowIdFromNgay(ngay);
  const { data: dupId } = await supabase.from(MK_DATA_TABLE).select("id").eq("id", newId).maybeSingle();
  if (dupId && dupId.id !== oldId) {
    return { ok: false, error: "Đã tồn tại bản ghi trùng id. Xóa hoặc đổi kỳ kia trước." };
  }

  const { data, error } = await supabase
    .from(MK_DATA_TABLE)
    .update({ id: newId, ngay_thang_nhap: ngay })
    .eq("id", oldId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message || "Không cập nhật được." };
  if (!data) return { ok: false, error: "Không tìm thấy bản ghi sau khi cập nhật." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã cập nhật ngày kỳ.", row: data as MkDataAnalysisRow };
}

export async function deleteMkDataWeek(id: string): Promise<ReportMktActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const sid = id.trim();
  if (!sid) return { ok: false, error: "Thiếu id kỳ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { data: deleted, error } = await supabase.from(MK_DATA_TABLE).delete().eq("id", sid).select("id").maybeSingle();

  if (error) return { ok: false, error: error.message || "Không xóa được." };
  if (!deleted) return { ok: false, error: "Không tìm thấy kỳ để xóa." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã xóa kỳ." };
}
