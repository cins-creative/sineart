"use server";

import { revalidatePath } from "next/cache";

import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REVALIDATE = "/admin/dashboard/goi-hoc-phi";

export type GoiHocPhiFormState =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function parseNumericNullableField(raw: string): number | null {
  const t = raw.replace(/\s/g, "").replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function table(): string {
  return hpGoiHocPhiTableName();
}

function revalidateGoiPages(): void {
  revalidatePath(REVALIDATE);
}

export type ComboMonFormState =
  | { ok: true; id: number; ten_combo: string; gia_giam: number }
  | { ok: false; error: string };

export type DeleteComboResult = { ok: true } | { ok: false; error: string };

function parseMoneyInt(raw: string): number {
  const t = raw.replace(/\s/g, "").replace(/,/g, "").trim();
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** Gắn gợi ý SQL khi Postgres trả permission denied (đặc biệt hp_combo_mon). */
function withHpComboMonGrantHint(message: string): string {
  const m = String(message ?? "");
  if (!/permission denied|42501/i.test(m)) return m || "Lỗi không xác định.";
  return (
    `${m} — Trên Supabase (SQL Editor), thử: GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_combo_mon TO service_role; ` +
    `Migration mẫu: supabase/migrations/20260418120000_hp_combo_mon_service_grants.sql`
  );
}

export async function createHpComboMon(
  _prev: ComboMonFormState | null,
  formData: FormData,
): Promise<ComboMonFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const ten_combo = String(formData.get("ten_combo") ?? "").trim();
  if (!ten_combo) return { ok: false, error: "Vui lòng nhập tên combo." };
  if (ten_combo.length > 500) return { ok: false, error: "Tên combo quá dài." };

  const gia_giam = parseMoneyInt(String(formData.get("gia_giam") ?? ""));

  const { data, error } = await supabase
    .from("hp_combo_mon")
    .insert({ ten_combo, gia_giam })
    .select("id, ten_combo, gia_giam")
    .single();

  if (error) {
    return {
      ok: false,
      error: withHpComboMonGrantHint(error.message || "Không thêm được combo."),
    };
  }

  const row = data as { id: number; ten_combo: string | null; gia_giam?: unknown };
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Thêm combo nhưng không đọc được id." };
  }

  const giamOut = parseMoneyInt(String(row.gia_giam ?? gia_giam));

  revalidateGoiPages();
  return {
    ok: true,
    id,
    ten_combo: String(row.ten_combo ?? ten_combo).trim() || ten_combo,
    gia_giam: giamOut,
  };
}

export async function updateHpComboMon(
  _prev: ComboMonFormState | null,
  formData: FormData,
): Promise<ComboMonFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const idRaw = String(formData.get("combo_row_id") ?? "").trim();
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "ID combo không hợp lệ." };
  }

  const ten_combo = String(formData.get("ten_combo") ?? "").trim();
  if (!ten_combo) return { ok: false, error: "Vui lòng nhập tên combo." };
  if (ten_combo.length > 500) return { ok: false, error: "Tên combo quá dài." };

  const gia_giam = parseMoneyInt(String(formData.get("gia_giam") ?? ""));

  const { data, error } = await supabase
    .from("hp_combo_mon")
    .update({ ten_combo, gia_giam })
    .eq("id", id)
    .select("id, ten_combo, gia_giam")
    .single();

  if (error) {
    return { ok: false, error: withHpComboMonGrantHint(error.message || "Không cập nhật được combo.") };
  }

  const row = data as { id: number; ten_combo: string | null; gia_giam?: unknown };
  const giamOut = parseMoneyInt(String(row.gia_giam ?? gia_giam));

  revalidateGoiPages();
  return {
    ok: true,
    id: Number(row.id),
    ten_combo: String(row.ten_combo ?? ten_combo).trim() || ten_combo,
    gia_giam: giamOut,
  };
}

export async function deleteHpComboMon(comboId: number): Promise<DeleteComboResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(comboId) || comboId <= 0) {
    return { ok: false, error: "ID combo không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("hp_combo_mon").delete().eq("id", comboId);
  if (error) {
    return {
      ok: false,
      error: withHpComboMonGrantHint(
        error.message || "Không xóa được combo (có thể còn ràng buộc FK).",
      ),
    };
  }

  revalidateGoiPages();
  return { ok: true };
}

export async function saveGoiHocPhi(
  _prev: GoiHocPhiFormState | null,
  formData: FormData,
): Promise<GoiHocPhiFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const idRaw = String(formData.get("id") ?? "").trim();
  const id = idRaw === "" ? NaN : Number(idRaw);

  const monRaw = String(formData.get("mon_hoc") ?? "").trim();
  const mon_hoc = monRaw === "" ? null : Number(monRaw);
  if (mon_hoc != null && (!Number.isFinite(mon_hoc) || mon_hoc <= 0)) {
    return { ok: false, error: "Môn học không hợp lệ." };
  }

  const goiNumber = parseNumericNullableField(String(formData.get("goi_number") ?? ""));
  const don_vi = String(formData.get("don_vi") ?? "").trim() || null;
  const gia_goc = parseNumericNullableField(String(formData.get("gia_goc") ?? ""));
  const discount = parseNumericNullableField(String(formData.get("discount") ?? ""));
  const so_buoi = parseNumericNullableField(String(formData.get("so_buoi") ?? ""));

  const comboRaw = String(formData.get("combo_id") ?? "").trim();
  const combo_id = comboRaw === "" ? null : Number(comboRaw);
  if (combo_id != null && (!Number.isFinite(combo_id) || combo_id <= 0)) {
    return { ok: false, error: "Combo không hợp lệ." };
  }

  if (don_vi != null && don_vi.length > 500) {
    return { ok: false, error: "Đơn vị quá dài (tối đa 500 ký tự)." };
  }

  const tbl = table();
  const payload: Record<string, unknown> = {
    mon_hoc,
    number: goiNumber,
    don_vi,
    gia_goc,
    discount,
    combo_id,
    so_buoi,
  };

  if (!Number.isFinite(id) || id <= 0) {
    const { error } = await supabase.from(tbl).insert(payload);
    if (error) {
      return {
        ok: false,
        error: error.message || `Không thêm được vào ${tbl}.`,
      };
    }
    revalidateGoiPages();
    return { ok: true, message: "Đã thêm gói học phí." };
  }

  const { error } = await supabase.from(tbl).update(payload).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được." };
  }
  revalidateGoiPages();
  return { ok: true, message: "Đã lưu thay đổi." };
}
