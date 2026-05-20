"use server";

import { revalidatePath } from "next/cache";

import { deleteHpDonThu } from "@/app/admin/dashboard/quan-ly-hoa-don/actions";
import { parseGoiIsActive } from "@/lib/data/hp-goi-is-active";
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
  revalidatePath("/admin/dashboard/quan-ly-hoa-don");
  revalidatePath("/donghocphi");
  revalidatePath("/khoa-hoc", "layout");
}

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseComboIdsCsv(raw: unknown): number[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  const out: number[] = [];
  for (const part of text.split(",")) {
    const n = Number(part.trim());
    if (!Number.isFinite(n) || n <= 0) continue;
    if (!out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

export type ComboMonFormState =
  | { ok: true; id: number; ten_combo: string; gia_giam: number; goi_ids: number[]; dang_hoat_dong: boolean }
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
  const goi_ids = parseComboIdsCsv(formData.get("goi_ids"));
  const dang_hoat_dong = formData.get("dang_hoat_dong") !== "false";

  const { data, error } = await supabase
    .from("hp_combo_mon")
    .insert({ ten_combo, gia_giam, goi_ids, dang_hoat_dong })
    .select("id, ten_combo, gia_giam, goi_ids, dang_hoat_dong")
    .single();

  if (error) {
    return {
      ok: false,
      error: withHpComboMonGrantHint(error.message || "Không thêm được combo."),
    };
  }

  const row = data as { id: number; ten_combo: string | null; gia_giam?: unknown; goi_ids?: unknown; dang_hoat_dong?: unknown };
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Thêm combo nhưng không đọc được id." };
  }

  const giamOut = parseMoneyInt(String(row.gia_giam ?? gia_giam));
  const goi_ids_out = Array.isArray(row.goi_ids)
    ? (row.goi_ids as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : goi_ids;

  revalidateGoiPages();
  return {
    ok: true,
    id,
    ten_combo: String(row.ten_combo ?? ten_combo).trim() || ten_combo,
    gia_giam: giamOut,
    goi_ids: goi_ids_out,
    dang_hoat_dong: row.dang_hoat_dong !== false,
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
  const goi_ids = parseComboIdsCsv(formData.get("goi_ids"));
  const dang_hoat_dong = formData.get("dang_hoat_dong") !== "false";

  const { data, error } = await supabase
    .from("hp_combo_mon")
    .update({ ten_combo, gia_giam, goi_ids, dang_hoat_dong })
    .eq("id", id)
    .select("id, ten_combo, gia_giam, goi_ids, dang_hoat_dong")
    .single();

  if (error) {
    return { ok: false, error: withHpComboMonGrantHint(error.message || "Không cập nhật được combo.") };
  }

  const row = data as { id: number; ten_combo: string | null; gia_giam?: unknown; goi_ids?: unknown; dang_hoat_dong?: unknown };
  const giamOut = parseMoneyInt(String(row.gia_giam ?? gia_giam));
  const goi_ids_out = Array.isArray(row.goi_ids)
    ? (row.goi_ids as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : goi_ids;

  revalidateGoiPages();
  return {
    ok: true,
    id: Number(row.id),
    ten_combo: String(row.ten_combo ?? ten_combo).trim() || ten_combo,
    gia_giam: giamOut,
    goi_ids: goi_ids_out,
    dang_hoat_dong: row.dang_hoat_dong !== false,
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

export type DeleteGoiHocPhiResult = { ok: true } | { ok: false; error: string };

function goiHocPhiInUseMessage(goiId: number, chiTietCount: number): string {
  const n = chiTietCount.toLocaleString("vi-VN");
  return (
    `Không xóa được gói #${goiId}: đang có ${n} dòng chi tiết học phí trên hóa đơn ` +
    `(hp_thu_hp_chi_tiet). Nhấn vào dòng gói trên bảng để xem danh sách đơn, gỡ dòng hoặc xóa đơn.`
  );
}

function humanizeGoiDeleteDbError(goiId: number, message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("hp_thu_hp_chi_tiet") || lower.includes("goi_hoc_phi_fkey")) {
    return (
      `Không xóa được gói #${goiId}: gói đang được dùng trên hóa đơn học phí. ` +
      `Đổi hoặc gỡ gói trên các đơn trước — xem Quản lý hóa đơn / đóng học phí.`
    );
  }
  return message;
}

/** Xóa một dòng trong bảng gói học phí (`hp_goi_hoc_phi_new` hoặc legacy). */
export async function deleteGoiHocPhi(goiId: number): Promise<DeleteGoiHocPhiResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(goiId) || goiId <= 0) {
    return { ok: false, error: "ID gói không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { count: chiTietCount, error: usageErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("id", { count: "exact", head: true })
    .eq("goi_hoc_phi", goiId);

  if (usageErr) {
    return { ok: false, error: usageErr.message || "Không kiểm tra được dữ liệu tham chiếu gói." };
  }

  if ((chiTietCount ?? 0) > 0) {
    return { ok: false, error: goiHocPhiInUseMessage(goiId, chiTietCount ?? 0) };
  }

  const tbl = table();
  const { error } = await supabase.from(tbl).delete().eq("id", goiId);

  if (error) {
    const raw = error.message || `Không xóa được gói #${goiId}.`;
    return {
      ok: false,
      error: humanizeGoiDeleteDbError(goiId, raw),
    };
  }

  revalidateGoiPages();
  return { ok: true };
}

const MAX_GOI_HP_USAGE_ROWS = 500;

export type GoiHpDonUsageRow = {
  chiId: number;
  donId: number;
  ma_don: string | null;
  ma_don_so: string | null;
  donStatus: string | null;
  donCreatedAt: string | null;
  chiStatus: string | null;
  ngay_dau_ky: string | null;
  ngay_cuoi_ky: string | null;
  studentId: number | null;
  studentName: string;
  tenLop: string;
};

export type FetchGoiHpDonUsageResult =
  | { ok: true; rows: GoiHpDonUsageRow[]; truncated: boolean }
  | { ok: false; error: string };

/** Các đơn / dòng chi tiết đang gán `goi_hoc_phi` = goiId (để gỡ trước khi xóa gói). */
export async function fetchGoiHpDonUsage(goiId: number): Promise<FetchGoiHpDonUsageResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(goiId) || goiId <= 0) return { ok: false, error: "ID gói không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { data: chiRaw, error: chiErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("id, don_thu, khoa_hoc_vien, status, ngay_dau_ky, ngay_cuoi_ky, created_at")
    .eq("goi_hoc_phi", goiId)
    .order("created_at", { ascending: false })
    .limit(MAX_GOI_HP_USAGE_ROWS + 1);

  if (chiErr) {
    return { ok: false, error: chiErr.message || "Không đọc được chi tiết học phí." };
  }

  const chiList = (chiRaw ?? []) as Record<string, unknown>[];
  const truncated = chiList.length > MAX_GOI_HP_USAGE_ROWS;
  const chiSlice = truncated ? chiList.slice(0, MAX_GOI_HP_USAGE_ROWS) : chiList;

  if (chiSlice.length === 0) {
    return { ok: true, rows: [], truncated: false };
  }

  const donIds = [...new Set(chiSlice.map((c) => nId(c.don_thu)).filter((x): x is number => x != null))];
  const qlIds = [...new Set(chiSlice.map((c) => nId(c.khoa_hoc_vien)).filter((x): x is number => x != null))];

  const [donRes, qlRes] = await Promise.all([
    donIds.length
      ? supabase
          .from("hp_don_thu_hoc_phi")
          .select("id, ma_don, ma_don_so, status, created_at, student")
          .in("id", donIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    qlIds.length
      ? supabase.from("ql_quan_ly_hoc_vien").select("id, lop_hoc").in("id", qlIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (donRes.error || qlRes.error) {
    return {
      ok: false,
      error: donRes.error?.message || qlRes.error?.message || "Không tải tham chiếu đơn.",
    };
  }

  const donById = new Map<
    number,
    { ma_don: string | null; ma_don_so: string | null; status: string | null; created_at: string | null; student: number | null }
  >();
  const hvIds = new Set<number>();
  for (const r of donRes.data ?? []) {
    const row = r as {
      id?: unknown;
      ma_don?: unknown;
      ma_don_so?: unknown;
      status?: unknown;
      created_at?: unknown;
      student?: unknown;
    };
    const id = nId(row.id);
    if (!id) continue;
    const student = nId(row.student);
    if (student) hvIds.add(student);
    donById.set(id, {
      ma_don: row.ma_don != null ? String(row.ma_don) : null,
      ma_don_so: row.ma_don_so != null ? String(row.ma_don_so) : null,
      status: row.status != null ? String(row.status) : null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      student,
    });
  }

  const qlLopById = new Map<number, number>();
  for (const r of qlRes.data ?? []) {
    const row = r as { id?: unknown; lop_hoc?: unknown };
    const qid = nId(row.id);
    const lid = nId(row.lop_hoc);
    if (qid && lid) qlLopById.set(qid, lid);
  }

  const lopIds = [...new Set(qlLopById.values())];
  const lopNameById = new Map<number, string>();
  if (lopIds.length > 0) {
    const { data: lopRows, error: lopErr } = await supabase
      .from("ql_lop_hoc")
      .select("id, class_full_name, class_name")
      .in("id", lopIds);
    if (lopErr) {
      return { ok: false, error: lopErr.message || "Không đọc được lớp học." };
    }
    for (const r of lopRows ?? []) {
      const row = r as { id?: unknown; class_full_name?: unknown; class_name?: unknown };
      const id = nId(row.id);
      if (!id) continue;
      const name =
        String(row.class_full_name ?? "").trim() || String(row.class_name ?? "").trim() || `Lớp #${id}`;
      lopNameById.set(id, name);
    }
  }

  const hvNameById = new Map<number, string>();
  if (hvIds.size > 0) {
    const { data: hvRows, error: hvErr } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .select("id, full_name")
      .in("id", [...hvIds]);
    if (hvErr) {
      return { ok: false, error: hvErr.message || "Không đọc được học viên." };
    }
    for (const r of hvRows ?? []) {
      const row = r as { id?: unknown; full_name?: unknown };
      const id = nId(row.id);
      if (!id) continue;
      hvNameById.set(id, String(row.full_name ?? "").trim() || `HV #${id}`);
    }
  }

  const rows: GoiHpDonUsageRow[] = [];
  for (const c of chiSlice) {
    const chiId = nId(c.id);
    const donId = nId(c.don_thu);
    if (!chiId || !donId) continue;
    const don = donById.get(donId);
    const kcv = nId(c.khoa_hoc_vien);
    const lopId = kcv != null ? qlLopById.get(kcv) ?? null : null;
    const studentId = don?.student ?? null;
    rows.push({
      chiId,
      donId,
      ma_don: don?.ma_don ?? null,
      ma_don_so: don?.ma_don_so ?? null,
      donStatus: don?.status ?? null,
      donCreatedAt: don?.created_at ?? null,
      chiStatus: c.status != null ? String(c.status) : null,
      ngay_dau_ky: c.ngay_dau_ky != null ? String(c.ngay_dau_ky).slice(0, 10) : null,
      ngay_cuoi_ky: c.ngay_cuoi_ky != null ? String(c.ngay_cuoi_ky).slice(0, 10) : null,
      studentId,
      studentName:
        studentId != null ? hvNameById.get(studentId) ?? `HV #${studentId}` : "—",
      tenLop: lopId != null ? lopNameById.get(lopId) ?? `Lớp #${lopId}` : "—",
    });
  }

  return { ok: true, rows, truncated };
}

/** Gỡ một dòng chi tiết học phí (để có thể xóa gói sau). */
export async function deleteGoiHpChiTietLine(chiId: number): Promise<DeleteGoiHocPhiResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(chiId) || chiId <= 0) return { ok: false, error: "ID dòng chi tiết không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { error } = await supabase.from("hp_thu_hp_chi_tiet").delete().eq("id", chiId);
  if (error) {
    return { ok: false, error: error.message || "Không xóa được dòng chi tiết." };
  }

  revalidateGoiPages();
  return { ok: true };
}

/** Xóa cả đơn thu học phí (chi tiết + đơn) từ popup gói học phí. */
export async function deleteGoiHpDonFromUsage(donId: number): Promise<DeleteGoiHocPhiResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const res = await deleteHpDonThu(donId);
  if (!res.ok) return { ok: false, error: res.error };
  revalidateGoiPages();
  return { ok: true };
}

export type DuplicateGoiHocPhiResult =
  | { ok: true; newId: number }
  | { ok: false; error: string };

/** Nhân bản một dòng gói học phí (insert mới, cùng dữ liệu, ID mới). */
export async function duplicateGoiHocPhi(goiId: number): Promise<DuplicateGoiHocPhiResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  if (!Number.isFinite(goiId) || goiId <= 0) {
    return { ok: false, error: "ID gói không hợp lệ." };
  }

  const tbl = table();
  const isLegacyGoiTable = tbl === "hp_goi_hoc_phi";

  const selectCols =
    'mon_hoc, "number", don_vi, gia_goc, discount, combo_id, so_buoi' +
    (isLegacyGoiTable ? "" : ", special, note, post_title, is_active");

  const { data: raw, error: fetchErr } = await supabase.from(tbl).select(selectCols).eq("id", goiId).maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message || "Không đọc được gói gốc." };
  if (!raw) return { ok: false, error: `Không tìm thấy gói #${goiId}.` };

  const row = raw as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {
    mon_hoc: row.mon_hoc ?? null,
    number: row.number ?? row["number"] ?? null,
    don_vi: row.don_vi ?? null,
    gia_goc: row.gia_goc ?? null,
    discount: row.discount ?? null,
    combo_id: row.combo_id ?? null,
    so_buoi: row.so_buoi ?? null,
  };
  if (!isLegacyGoiTable) {
    payload.special = row.special ?? null;
    payload.note = row.note ?? null;
    payload.post_title = row.post_title ?? null;
    payload.is_active = parseGoiIsActive(row.is_active);
  }

  const { data: inserted, error: insertErr } = await supabase.from(tbl).insert(payload).select("id").single();

  if (insertErr) {
    return { ok: false, error: insertErr.message || "Không nhân bản được gói." };
  }

  const ins = inserted as { id?: unknown };
  const newId = Number(ins.id);
  if (!Number.isFinite(newId) || newId <= 0) {
    return { ok: false, error: "Đã chèn nhưng không đọc được ID mới." };
  }

  revalidateGoiPages();
  return { ok: true, newId };
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
  const combo_ids = parseComboIdsCsv(formData.get("combo_ids"));
  if (combo_ids.some((id) => !Number.isFinite(id) || id <= 0)) {
    return { ok: false, error: "Danh sách combo không hợp lệ." };
  }
  if (combo_ids.length === 0 && combo_id != null) combo_ids.push(combo_id);
  const primaryComboId = combo_ids[0] ?? combo_id ?? null;

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

  const postTitleRaw = String(formData.get("post_title") ?? "").trim();
  const post_title = postTitleRaw === "" ? null : postTitleRaw;
  if (!isLegacyGoiTable && post_title != null && post_title.length > 500) {
    return { ok: false, error: "Hậu tố (post_title) quá dài (tối đa 500 ký tự)." };
  }

  const payload: Record<string, unknown> = {
    mon_hoc,
    number: goiNumber,
    don_vi,
    gia_goc,
    discount,
    combo_id: isLegacyGoiTable ? primaryComboId : combo_ids,
    so_buoi,
  };
  const is_active = formData.get("is_active") !== "false";

  if (!isLegacyGoiTable) {
    payload.special = special;
    payload.note = note;
    payload.post_title = post_title;
    payload.is_active = is_active;
  }

  if (!Number.isFinite(id) || id <= 0) {
    const { data: inserted, error } = await supabase.from(tbl).insert(payload).select("id").single();
    if (error || !inserted) {
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

/** Bật/tắt nhanh `is_active` từ bảng Gói học phí (không mở form). */
export async function toggleGoiHocPhiIsActive(
  goiId: number,
  is_active: boolean,
): Promise<GoiHocPhiFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(goiId) || goiId <= 0) return { ok: false, error: "ID gói không hợp lệ." };

  const tbl = table();
  if (tbl === "hp_goi_hoc_phi") {
    return { ok: false, error: "Bảng legacy không hỗ trợ is_active." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from(tbl).update({ is_active }).eq("id", goiId);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được trạng thái gói." };
  }

  revalidateGoiPages();
  return {
    ok: true,
    message: is_active ? "Đã bật gói trên đóng học phí." : "Đã ẩn gói khỏi đóng học phí.",
  };
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
  combo_ids?: number[];
  so_buoi: number | null;
  special?: string | null;
  note?: string | null;
  post_title?: string | null;
  is_active?: boolean;
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
    const combo_ids = [
      ...new Set((row.combo_ids ?? []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)),
    ].sort((a, b) => a - b);
    if (combo_ids.length === 0 && combo_id != null) combo_ids.push(combo_id);
    const primaryComboId = combo_ids[0] ?? combo_id ?? null;

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

    const postTitleTrim = String(row.post_title ?? "").trim();
    const post_title = postTitleTrim === "" ? null : postTitleTrim;
    if (!isLegacyGoiTable && post_title != null && post_title.length > 500) {
      return { ok: false, error: `Gói #${id}: Hậu tố (post_title) quá dài (tối đa 500 ký tự).` };
    }

    const payload: Record<string, unknown> = {
      mon_hoc,
      number: goiNumber,
      don_vi,
      gia_goc,
      discount,
      combo_id: isLegacyGoiTable ? primaryComboId : combo_ids,
      so_buoi,
    };
    if (!isLegacyGoiTable) {
      payload.special = special;
      payload.note = note;
      payload.post_title = post_title;
      if (row.is_active !== undefined) {
        payload.is_active = row.is_active !== false;
      }
    }

    const { error } = await supabase.from(tbl).update(payload).eq("id", id);
    if (error) {
      return { ok: false, error: `Gói #${id}: ${error.message || "Không cập nhật được."}` };
    }
    updated++;
  }

  revalidateGoiPages();
  revalidatePath("/donghocphi");
  return {
    ok: true,
    message: updated === 1 ? "Đã lưu 1 dòng." : `Đã lưu ${updated} dòng.`,
    updated,
  };
}
