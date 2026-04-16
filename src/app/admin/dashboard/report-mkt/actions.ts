"use server";

import { revalidatePath } from "next/cache";

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
