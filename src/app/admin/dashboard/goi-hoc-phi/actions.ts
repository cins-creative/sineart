"use server";

import { revalidatePath } from "next/cache";

import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
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

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

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
  const isLegacyGoiTable = tbl === "hp_goi_hoc_phi";

  const specialRaw = String(formData.get("special") ?? "").trim();
  const special = specialRaw === "" ? null : specialRaw;
  if (!isLegacyGoiTable && special != null && special.length > 500) {
    return { ok: false, error: "Gói đặc biệt quá dài (tối đa 500 ký tự)." };
  }

  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw === "" ? null : noteRaw;
  if (!isLegacyGoiTable && note != null && note.length > 4000) {
    return { ok: false, error: "Ghi chú quá dài (tối đa 4000 ký tự)." };
  }

  const payload: Record<string, unknown> = {
    mon_hoc,
    number: goiNumber,
    don_vi,
    gia_goc,
    discount,
    combo_id,
    so_buoi,
  };
  if (!isLegacyGoiTable) {
    payload.special = special;
    payload.note = note;
  }

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

/** Một dòng cập nhật hàng loạt — map sang payload giống `saveGoiHocPhi` (update theo id). */
export type GoiHocPhiBulkRowInput = {
  id: number;
  mon_hoc: number | null;
  goi_number: number | null;
  don_vi: string | null;
  gia_goc: number | null;
  discount: number | null;
  combo_id: number | null;
  so_buoi: number | null;
  special?: string | null;
  note?: string | null;
};

export type GoiHocPhiBulkResult =
  | { ok: true; message: string; updated: number }
  | { ok: false; error: string };

export async function saveGoiHocPhiBulk(rows: GoiHocPhiBulkRowInput[]): Promise<GoiHocPhiBulkResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const tbl = table();
  const isLegacyGoiTable = tbl === "hp_goi_hoc_phi";

  if (rows.length === 0) {
    return { ok: true, message: "Không có thay đổi cần lưu.", updated: 0 };
  }

  let updated = 0;
  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, error: `ID gói không hợp lệ: ${String(row.id)}` };
    }

    const mon_hoc = row.mon_hoc;
    if (mon_hoc != null && (!Number.isFinite(mon_hoc) || mon_hoc <= 0)) {
      return { ok: false, error: `Gói #${id}: Môn học không hợp lệ.` };
    }

    const goiNumber =
      row.goi_number == null || !Number.isFinite(Number(row.goi_number))
        ? null
        : Number(row.goi_number);
    const don_vi = row.don_vi == null ? null : String(row.don_vi).trim() || null;
    const gia_goc =
      row.gia_goc == null || !Number.isFinite(Number(row.gia_goc)) ? null : Number(row.gia_goc);
    const discount =
      row.discount == null || !Number.isFinite(Number(row.discount)) ? null : Number(row.discount);
    const so_buoi =
      row.so_buoi == null || !Number.isFinite(Number(row.so_buoi)) ? null : Number(row.so_buoi);

    const combo_id = row.combo_id;
    if (combo_id != null && (!Number.isFinite(combo_id) || combo_id <= 0)) {
      return { ok: false, error: `Gói #${id}: Combo không hợp lệ.` };
    }

    if (don_vi != null && don_vi.length > 500) {
      return { ok: false, error: `Gói #${id}: Đơn vị quá dài (tối đa 500 ký tự).` };
    }

    const specialRaw = String(row.special ?? "").trim();
    const special = specialRaw === "" ? null : specialRaw;
    if (!isLegacyGoiTable && special != null && special.length > 500) {
      return { ok: false, error: `Gói #${id}: Gói đặc biệt quá dài (tối đa 500 ký tự).` };
    }

    const noteTrim = String(row.note ?? "").trim();
    const note = noteTrim === "" ? null : noteTrim;
    if (!isLegacyGoiTable && note != null && note.length > 4000) {
      return { ok: false, error: `Gói #${id}: Ghi chú quá dài (tối đa 4000 ký tự).` };
    }

    const payload: Record<string, unknown> = {
      mon_hoc,
      number: goiNumber,
      don_vi,
      gia_goc,
      discount,
      combo_id,
      so_buoi,
    };
    if (!isLegacyGoiTable) {
      payload.special = special;
      payload.note = note;
    }

    const { error } = await supabase.from(tbl).update(payload).eq("id", id);
    if (error) {
      return { ok: false, error: `Gói #${id}: ${error.message || "Không cập nhật được."}` };
    }
    updated++;
  }

  revalidateGoiPages();
  return {
    ok: true,
    message: updated === 1 ? "Đã lưu 1 dòng." : `Đã lưu ${updated} dòng.`,
    updated,
  };
}
