"use server";

import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { joinLevels, parseLevelHinhHoaFromForm, splitLevels } from "@/lib/ql-lop-hoc/level-hinh-hoa";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Phát hiện lỗi PostgREST khi bảng chưa tồn tại / chưa nằm trong schema cache.
 * Dùng chung cho mọi action liên quan bảng `ql_loai_hinh_hoa_options`.
 */
function isMissingLoaiHinhHoaOptionsTable(rawCode: unknown, rawMsg: unknown): boolean {
  const msg = `${rawCode ?? ""} ${rawMsg ?? ""}`.toLowerCase();
  return (
    msg.includes("42p01") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

const MISSING_LOAI_HINH_HOA_OPTIONS_ERROR =
  "Bảng ql_loai_hinh_hoa_options chưa tồn tại — chạy file sql/ql_loai_hinh_hoa_options.sql trên Supabase SQL Editor trước khi thêm/sửa loại mới.";

export type LopHocFormState =
  | { ok: true; message: string }
  | { ok: false; error: string };

const ADMIN_LOP = "/admin/dashboard/lop-hoc";

function revalidateLopHocPublic(): void {
  revalidatePath(ADMIN_LOP, "layout");
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
  is_active: boolean;
  /** `ql_lop_hoc.level_hinh_hoa` — chỉ dùng khi môn Hình họa. */
  level_hinh_hoa: string | null;
  /** URL nhóm Messenger — `ql_lop_hoc.group_chat_messenger`. */
  group_chat_messenger: string | null;
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

  const level_hinh_hoa = parseLevelHinhHoaFromForm(
    fd.getAll("level_hinh_hoa").map((v) => String(v)),
  );

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
      is_active: String(fd.get("is_active") ?? "1") !== "0",
      level_hinh_hoa,
      group_chat_messenger: optionalText(fd, "group_chat_messenger"),
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

export async function toggleLopTinhTrang(id: number, value: boolean): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mã lớp không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("ql_lop_hoc").update({ tinh_trang: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateLopHocPublic();
  return { ok: true, message: value ? "Đã bật trạng thái hoạt động." : "Đã tắt trạng thái hoạt động." };
}

export async function toggleLopIsActive(id: number, value: boolean): Promise<LopHocFormState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mã lớp không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("ql_lop_hoc").update({ is_active: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateLopHocPublic();
  return { ok: true, message: value ? "Đã bật khai giảng." : "Đã tạm dừng khai giảng." };
}

/**
 * Thêm một giá trị "Loại Hình họa" mới vào bảng `ql_loai_hinh_hoa_options`.
 * Idempotent — nếu đã tồn tại thì trả về luôn (không duplicate).
 */
export async function addLoaiHinhHoaOption(
  rawName: string,
): Promise<{ ok: true; ten: string } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const ten = String(rawName ?? "").trim();
  if (!ten) {
    return { ok: false, error: "Tên loại không được để trống." };
  }
  if (ten.length > 80) {
    return { ok: false, error: "Tên loại quá dài (tối đa 80 ký tự)." };
  }
  if (ten.includes(",")) {
    return {
      ok: false,
      error: 'Tên loại không được chứa dấu phẩy "," (đang dùng làm dấu phân cách CSV).',
    };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const { data: existing, error: selErr } = await supabase
    .from("ql_loai_hinh_hoa_options")
    .select("ten")
    .ilike("ten", ten)
    .limit(1);

  if (selErr) {
    if (isMissingLoaiHinhHoaOptionsTable(selErr.code, selErr.message)) {
      return { ok: false, error: MISSING_LOAI_HINH_HOA_OPTIONS_ERROR };
    }
    return { ok: false, error: selErr.message };
  }

  if (existing && existing.length > 0) {
    const found = String((existing[0] as { ten?: unknown }).ten ?? "").trim() || ten;
    revalidateLopHocPublic();
    return { ok: true, ten: found };
  }

  const { error: insErr } = await supabase
    .from("ql_loai_hinh_hoa_options")
    .insert({ ten });

  if (insErr) {
    if (isMissingLoaiHinhHoaOptionsTable(insErr.code, insErr.message)) {
      return { ok: false, error: MISSING_LOAI_HINH_HOA_OPTIONS_ERROR };
    }
    const msg = `${insErr.code ?? ""} ${insErr.message ?? ""}`.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      revalidateLopHocPublic();
      return { ok: true, ten };
    }
    return { ok: false, error: insErr.message || "Không thêm được loại lớp." };
  }

  revalidateLopHocPublic();
  return { ok: true, ten };
}

/**
 * Đổi tên một option "Loại lớp" trong bảng `ql_loai_hinh_hoa_options` và đồng bộ
 * giá trị CSV trên `ql_lop_hoc.level_hinh_hoa` của tất cả lớp đang dùng tên cũ.
 *
 * Quy tắc:
 *   - `oldName` / `newName` đều trim. Nếu giống hệt nhau → no-op, trả ok ngay.
 *   - `newName` tuân thủ ràng buộc: không rỗng, ≤ 80 ký tự, không chứa dấu phẩy.
 *   - Chặn trùng với option khác (case-insensitive, trừ chính nó).
 *   - Sau khi update bảng options, scan các lớp có CSV `level_hinh_hoa` chứa
 *     `oldName` (so khớp `ilike '%oldName%'`), tách CSV bằng `splitLevels`, thay
 *     đúng giá trị, rejoin bằng `joinLevels` rồi update.
 *   - Idempotent về phía DB (đã update rồi chạy lại không thay đổi gì).
 */
export async function renameLoaiHinhHoaOption(payload: {
  oldName: string;
  newName: string;
}): Promise<{ ok: true; oldName: string; newName: string } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const oldName = String(payload.oldName ?? "").trim();
  const newName = String(payload.newName ?? "").trim();
  if (!oldName) return { ok: false, error: "Thiếu tên cũ cần đổi." };
  if (!newName) return { ok: false, error: "Tên mới không được để trống." };
  if (newName.length > 80) {
    return { ok: false, error: "Tên mới quá dài (tối đa 80 ký tự)." };
  }
  if (newName.includes(",")) {
    return {
      ok: false,
      error: 'Tên không được chứa dấu phẩy "," (đang dùng làm dấu phân cách CSV).',
    };
  }

  if (oldName === newName) {
    return { ok: true, oldName, newName };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const { data: dup, error: dupErr } = await supabase
    .from("ql_loai_hinh_hoa_options")
    .select("ten")
    .ilike("ten", newName)
    .neq("ten", oldName)
    .limit(1);
  if (dupErr) {
    if (isMissingLoaiHinhHoaOptionsTable(dupErr.code, dupErr.message)) {
      return { ok: false, error: MISSING_LOAI_HINH_HOA_OPTIONS_ERROR };
    }
    return { ok: false, error: dupErr.message };
  }
  if (dup && dup.length > 0) {
    return { ok: false, error: `Loại "${newName}" đã tồn tại — chọn tên khác.` };
  }

  const { error: updErr } = await supabase
    .from("ql_loai_hinh_hoa_options")
    .update({ ten: newName })
    .eq("ten", oldName);
  if (updErr) {
    if (isMissingLoaiHinhHoaOptionsTable(updErr.code, updErr.message)) {
      return { ok: false, error: MISSING_LOAI_HINH_HOA_OPTIONS_ERROR };
    }
    return { ok: false, error: updErr.message || "Không cập nhật được tên loại." };
  }

  const { data: affected, error: scanErr } = await supabase
    .from("ql_lop_hoc")
    .select("id, level_hinh_hoa")
    .ilike("level_hinh_hoa", `%${oldName}%`);
  if (scanErr) {
    revalidateLopHocPublic();
    return {
      ok: false,
      error: `Đã đổi tên trong bảng options, nhưng không scan được lớp dùng tên cũ: ${scanErr.message}. Hãy thử lại để đồng bộ.`,
    };
  }

  let syncFailCount = 0;
  let syncedCount = 0;
  for (const raw of (affected ?? []) as { id?: unknown; level_hinh_hoa?: unknown }[]) {
    const id = Number(raw.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const csv = String(raw.level_hinh_hoa ?? "");
    const items = splitLevels(csv);
    let changed = false;
    const next = items.map((it) => {
      if (it === oldName) {
        changed = true;
        return newName;
      }
      return it;
    });
    if (!changed) continue;
    const nextCsv = joinLevels(next);
    const { error: rowErr } = await supabase
      .from("ql_lop_hoc")
      .update({ level_hinh_hoa: nextCsv || null })
      .eq("id", id);
    if (rowErr) syncFailCount += 1;
    else syncedCount += 1;
  }

  revalidateLopHocPublic();

  if (syncFailCount > 0) {
    return {
      ok: false,
      error: `Đã đổi tên options + đồng bộ ${syncedCount} lớp, nhưng ${syncFailCount} lớp lỗi. Mở Supabase Logs để kiểm tra.`,
    };
  }

  return { ok: true, oldName, newName };
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
