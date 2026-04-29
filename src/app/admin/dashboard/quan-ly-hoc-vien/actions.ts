"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { staffBelongsToTuVanPhong } from "@/lib/admin/dashboard-nav-visibility";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { isValidStudentEmail, STUDENT_EMAIL_REQUIREMENT_VI } from "@/lib/donghocphi/profile-step1";
import { firstApplicableComboDiscountDong } from "@/lib/donghocphi/combo-discount";
import { fetchKyByKhoaHocVienIds } from "@/lib/data/hp-thu-hp-chi-tiet-ky";
import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  fetchAdminStaffShellPhongTenPhongs,
  fetchAdminStaffShellProfile,
} from "@/lib/data/admin-shell-user";
import { fetchAdminQuanLyHocVienBundle } from "@/lib/data/admin-quan-ly-hoc-vien";
import { insertQlQuanLyHocVienEnrollment } from "@/lib/supabase/insert-ql-quan-ly-hoc-vien";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { QuanLyHocVienViewBundle } from "@/lib/admin/quan-ly-hoc-vien-local-cache";

export type QlhvActionState = { ok: true; message?: string } | { ok: false; error: string };

const REV = "/admin/dashboard/quan-ly-hoc-vien";
const REV_HOA_DON = "/admin/dashboard/quan-ly-hoa-don";

function revalidate(): void {
  revalidatePath(REV);
}

function sliceIsoDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Cập nhật `ngay_dau_ky` / `ngay_cuoi_ky` trên dòng `hp_thu_hp_chi_tiet` đang được dùng cho ghi danh
 * (`khoa_hoc_vien` = `ql_quan_ly_hoc_vien.id`) — cùng quy tắc chọn dòng như hiển thị (đơn đã TT mới nhất, hoặc chi tiết mới nhất).
 */
export async function updateHpChiTietKyForEnrollment(
  enrollmentId: number,
  ngay_dau_ky: string | null,
  ngay_cuoi_ky: string | null
): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) return { ok: false, error: "ID ghi danh không hợp lệ." };

  const dau = sliceIsoDate(ngay_dau_ky ?? undefined);
  const cuoi = sliceIsoDate(ngay_cuoi_ky ?? undefined);
  if (ngay_dau_ky != null && String(ngay_dau_ky).trim() !== "" && dau == null) {
    return { ok: false, error: "Ngày đầu kỳ không hợp lệ (dùng YYYY-MM-DD)." };
  }
  if (ngay_cuoi_ky != null && String(ngay_cuoi_ky).trim() !== "" && cuoi == null) {
    return { ok: false, error: "Ngày cuối kỳ không hợp lệ (dùng YYYY-MM-DD)." };
  }
  if (dau != null && cuoi != null) {
    const t0 = new Date(dau);
    const t1 = new Date(cuoi);
    t0.setHours(0, 0, 0, 0);
    t1.setHours(0, 0, 0, 0);
    if (t0.getTime() > t1.getTime()) {
      return { ok: false, error: "Ngày đầu kỳ phải trước hoặc trùng ngày cuối kỳ." };
    }
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { data: en, error: enErr } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (enErr || !en) return { ok: false, error: "Không tìm thấy ghi danh." };

  const kyMap = await fetchKyByKhoaHocVienIds(supabase, [enrollmentId]);
  const resolved = kyMap.get(enrollmentId);
  const chiId = resolved?.chi_tiet_id;
  if (chiId == null || !Number.isFinite(chiId) || chiId <= 0) {
    return {
      ok: false,
      error: "Chưa có dòng thu học phí chi tiết cho ghi danh này — tạo đơn / dòng chi tiết trước.",
    };
  }

  const { error } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .update({ ngay_dau_ky: dau, ngay_cuoi_ky: cuoi })
    .eq("id", chiId);
  if (error) return { ok: false, error: error.message || "Không lưu được kỳ trên chi tiết học phí." };
  revalidatePath(REV);
  revalidatePath(REV_HOA_DON);
  return { ok: true };
}

export async function toggleHocVienMau(studentId: number, isMau: boolean): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(studentId) || studentId <= 0) return { ok: false, error: "ID học viên không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("ql_thong_tin_hoc_vien").update({ is_hoc_vien_mau: isMau }).eq("id", studentId);
  if (error) return { ok: false, error: error.message || "Không cập nhật được." };
  revalidate();
  return { ok: true };
}

export async function updateEnrollmentGhiChu(enrollmentId: number, ghi_chu: string | null): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) return { ok: false, error: "ID ghi danh không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const v = ghi_chu != null && String(ghi_chu).trim() !== "" ? String(ghi_chu).trim() : null;
  const { error } = await supabase.from("ql_quan_ly_hoc_vien").update({ ghi_chu: v }).eq("id", enrollmentId);
  if (error) return { ok: false, error: error.message || "Không lưu được." };
  revalidate();
  return { ok: true };
}

/** Cập nhật `ql_quan_ly_hoc_vien.tien_do_hoc` → `hv_he_thong_bai_tap.id` (hoặc null). */
export async function updateEnrollmentTienDoHoc(
  enrollmentId: number,
  tien_do_hoc: number | null
): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) return { ok: false, error: "ID ghi danh không hợp lệ." };

  if (tien_do_hoc != null && (!Number.isFinite(tien_do_hoc) || tien_do_hoc <= 0)) {
    return { ok: false, error: "Bài tập không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { data: enRow, error: enErr } = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id, lop_hoc")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (enErr || !enRow) return { ok: false, error: "Không tìm thấy ghi danh." };

  const lopId = Number((enRow as { lop_hoc?: unknown }).lop_hoc);
  let lopMon: number | null = null;
  if (Number.isFinite(lopId) && lopId > 0) {
    const { data: lopRow } = await supabase.from("ql_lop_hoc").select("mon_hoc").eq("id", lopId).maybeSingle();
    const m = (lopRow as { mon_hoc?: unknown } | null)?.mon_hoc;
    lopMon = m != null && Number.isFinite(Number(m)) ? Number(m) : null;
  }

  if (tien_do_hoc != null) {
    const { data: btRow, error: btErr } = await supabase
      .from("hv_he_thong_bai_tap")
      .select("id, mon_hoc")
      .eq("id", tien_do_hoc)
      .maybeSingle();
    if (btErr || !btRow) return { ok: false, error: "Không tìm thấy bài tập." };
    const btMon = Number((btRow as { mon_hoc?: unknown }).mon_hoc);
    if (lopMon != null && lopMon > 0 && Number.isFinite(btMon) && btMon > 0 && btMon !== lopMon) {
      return { ok: false, error: "Bài tập không thuộc môn của lớp này." };
    }
  }

  const { error } = await supabase.from("ql_quan_ly_hoc_vien").update({ tien_do_hoc }).eq("id", enrollmentId);
  if (error) return { ok: false, error: error.message || "Không lưu được tiến độ." };
  revalidate();
  return { ok: true };
}

export async function createEnrollment(hoc_vien_id: number, lop_hoc: number): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(hoc_vien_id) || hoc_vien_id <= 0) return { ok: false, error: "Học viên không hợp lệ." };
  if (!Number.isFinite(lop_hoc) || lop_hoc <= 0) return { ok: false, error: "Chọn lớp học." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const r = await insertQlQuanLyHocVienEnrollment(supabase, hoc_vien_id, lop_hoc);
  if (r.ok) {
    revalidate();
    return { ok: true, message: "Đã thêm khoá học." };
  }
  return { ok: false, error: r.error };
}

function cleanPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).replace(/^[\s"'`]+|[\s"'`]+$/g, "").trim();
  return t === "" ? null : t;
}

export type HocVienProfilePayload = {
  full_name: string;
  email: string | null;
  sdt: string | null;
  facebook: string | null;
  sex: string | null;
  loai_khoa_hoc: string | null;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  nam_thi: number | null;
};

function hocVienProfileRow(payload: HocVienProfilePayload): Record<string, string | number | null> {
  const full_name = String(payload.full_name ?? "").trim();
  const nam_thi = payload.nam_thi != null && Number.isFinite(payload.nam_thi) ? Math.trunc(payload.nam_thi) : null;
  return {
    full_name,
    email: payload.email != null && String(payload.email).trim() !== "" ? String(payload.email).trim() : null,
    sdt: cleanPhone(payload.sdt),
    facebook: payload.facebook != null && String(payload.facebook).trim() !== "" ? String(payload.facebook).trim() : null,
    sex: payload.sex != null && String(payload.sex).trim() !== "" ? String(payload.sex).trim() : null,
    loai_khoa_hoc:
      payload.loai_khoa_hoc != null && String(payload.loai_khoa_hoc).trim() !== ""
        ? String(payload.loai_khoa_hoc).trim()
        : null,
    ngay_bat_dau: payload.ngay_bat_dau != null && String(payload.ngay_bat_dau).trim() !== "" ? String(payload.ngay_bat_dau).trim().slice(0, 10) : null,
    ngay_ket_thuc: payload.ngay_ket_thuc != null && String(payload.ngay_ket_thuc).trim() !== "" ? String(payload.ngay_ket_thuc).trim().slice(0, 10) : null,
    nam_thi,
  };
}

export async function createHocVien(payload: HocVienProfilePayload): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const full_name = String(payload.full_name ?? "").trim();
  if (!full_name) return { ok: false, error: "Nhập họ tên." };

  const emCreate = String(payload.email ?? "").trim();
  if (emCreate !== "" && !isValidStudentEmail(emCreate)) {
    return { ok: false, error: STUDENT_EMAIL_REQUIREMENT_VI };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const body = hocVienProfileRow(payload);

  const ins = await supabase.from("ql_thong_tin_hoc_vien").insert(body).select("id").single();
  if (ins.error) return { ok: false, error: ins.error.message || "Không tạo được học viên." };
  const rawId = ins.data?.id;
  const id = typeof rawId === "bigint" ? Number(rawId) : Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Không đọc được ID học viên mới." };
  revalidate();
  return { ok: true, id };
}

export async function updateHocVienProfile(studentId: number, payload: HocVienProfilePayload): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(studentId) || studentId <= 0) return { ok: false, error: "ID học viên không hợp lệ." };

  const full_name = String(payload.full_name ?? "").trim();
  if (!full_name) return { ok: false, error: "Nhập họ tên." };

  const emUp = String(payload.email ?? "").trim();
  if (emUp !== "" && !isValidStudentEmail(emUp)) {
    return { ok: false, error: STUDENT_EMAIL_REQUIREMENT_VI };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const body = hocVienProfileRow(payload);

  const { error } = await supabase.from("ql_thong_tin_hoc_vien").update(body).eq("id", studentId);
  if (error) return { ok: false, error: error.message || "Không lưu được hồ sơ." };
  revalidate();
  return { ok: true, message: "Đã lưu." };
}

/** Cập nhật `nam_thi` / `ghi_chu` trên một dòng `ql_hv_truong_nganh` (trường–ngành đã gắn). */
export async function updateQlHvTruongNganhRow(
  rowId: number,
  payload: { nam_thi: number | null; ghi_chu: string | null }
): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(rowId) || rowId <= 0) return { ok: false, error: "ID dòng không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const namRaw = payload.nam_thi;
  const nam_thi =
    namRaw != null && Number.isFinite(Number(namRaw)) ? Math.trunc(Number(namRaw)) : null;
  const ghi_chu =
    payload.ghi_chu != null && String(payload.ghi_chu).trim() !== "" ? String(payload.ghi_chu).trim() : null;

  const { error } = await supabase.from("ql_hv_truong_nganh").update({ nam_thi, ghi_chu }).eq("id", rowId);
  if (error) return { ok: false, error: error.message || "Không lưu được trường/ngành." };
  revalidate();
  return { ok: true, message: "Đã lưu." };
}

export type AdminQlhvNvRowInput = {
  truong_dai_hoc: number;
  nganh_dao_tao: number;
  nam_thi: number | null;
  ghi_chu: string | null;
};

/**
 * Thay toàn bộ `ql_hv_truong_nganh` của học viên — cùng quy tắc cặp hợp lệ `dh_truong_nganh` như trang đóng học phí.
 * Rỗng = xóa hết dòng nguyện vọng.
 */
export async function adminReplaceQlHvTruongNganhRows(
  studentId: number,
  rows: AdminQlhvNvRowInput[]
): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(studentId) || studentId <= 0) return { ok: false, error: "ID học viên không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const seen = new Set<string>();
  const unique: AdminQlhvNvRowInput[] = [];
  for (const raw of rows) {
    const t = Math.trunc(Number(raw.truong_dai_hoc));
    const n = Math.trunc(Number(raw.nganh_dao_tao));
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(n) || n <= 0) continue;
    const k = `${t},${n}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const namRaw = raw.nam_thi;
    const nam_thi =
      namRaw != null && Number.isFinite(Number(namRaw)) ? Math.trunc(Number(namRaw)) : null;
    const ghi_chu =
      raw.ghi_chu != null && String(raw.ghi_chu).trim() !== "" ? String(raw.ghi_chu).trim() : null;
    unique.push({ truong_dai_hoc: t, nganh_dao_tao: n, nam_thi, ghi_chu });
  }

  for (const p of unique) {
    const { data, error } = await supabase
      .from("dh_truong_nganh")
      .select("truong_dai_hoc")
      .eq("truong_dai_hoc", p.truong_dai_hoc)
      .eq("nganh_dao_tao", p.nganh_dao_tao)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (data == null) {
      return {
        ok: false,
        error: "Cặp trường / ngành không hợp lệ — chọn lại theo danh mục hệ thống.",
      };
    }
  }

  const { error: delErr } = await supabase.from("ql_hv_truong_nganh").delete().eq("hoc_vien", studentId);
  if (delErr) return { ok: false, error: delErr.message || "Không xóa được dòng cũ." };

  if (!unique.length) {
    revalidate();
    return { ok: true, message: "Đã cập nhật." };
  }

  const { error: insErr } = await supabase.from("ql_hv_truong_nganh").insert(
    unique.map((p) => ({
      hoc_vien: studentId,
      truong_dai_hoc: p.truong_dai_hoc,
      nganh_dao_tao: p.nganh_dao_tao,
      nam_thi: p.nam_thi,
      ghi_chu: p.ghi_chu,
    }))
  );
  if (insErr) return { ok: false, error: insErr.message || "Không ghi được trường/ngành." };
  revalidate();
  return { ok: true, message: "Đã lưu trường & ngành." };
}

export async function deleteHocVien(studentId: number): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(studentId) || studentId <= 0) return { ok: false, error: "ID học viên không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const ql = await supabase
    .from("ql_quan_ly_hoc_vien")
    .select("id", { count: "exact", head: true })
    .eq("hoc_vien_id", studentId);
  if (!ql.error && (ql.count ?? 0) > 0) {
    return { ok: false, error: "Còn khoá học ghi danh — không xóa được học viên." };
  }

  await supabase.from("ql_hv_truong_nganh").delete().eq("hoc_vien", studentId);
  const { error } = await supabase.from("ql_thong_tin_hoc_vien").delete().eq("id", studentId);
  if (error) return { ok: false, error: error.message || "Không xóa được học viên." };
  revalidate();
  return { ok: true, message: "Đã xóa học viên." };
}

export async function deleteEnrollment(enrollmentId: number): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) return { ok: false, error: "ID ghi danh không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delEnOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delEnOk.ok) return { ok: false, error: delEnOk.error };

  const hp = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("id", { count: "exact", head: true })
    .eq("khoa_hoc_vien", enrollmentId);
  if (!hp.error && (hp.count ?? 0) > 0) {
    return { ok: false, error: "Không xóa được — đã có dòng học phí gắn khoá học này." };
  }

  const { error } = await supabase.from("ql_quan_ly_hoc_vien").delete().eq("id", enrollmentId);
  if (error) return { ok: false, error: error.message || "Không xóa được." };
  revalidate();
  return { ok: true, message: "Đã xóa ghi danh." };
}

// ── Thu học phí nhanh (modal admin — tương tự QLHV_Dong_hoc_phi Framer) ──

export type AdminDhpGoiOption = {
  id: number;
  ten_goi_hoc_phi: string;
  mon_hoc: number | null;
  /** Giá gốc trước chiết khấu gói. */
  gia_goc: number;
  /** Học phí thực đóng = gia_goc sau khi trừ discount%. */
  hoc_phi_dong: number;
  /** `hp_goi_hoc_phi_new.so_buoi` — buổi cộng vào ngày cuối kỳ (null bảng cũ). */
  so_buoi: number | null;
  /** `hp_goi_hoc_phi_new.post_title` — nhóm/tên hiển thị public. */
  post_title: string | null;
  /** true nếu post_title chứa "cấp tốc". */
  special: boolean;
};

export type AdminDhpComboOption = {
  id: number;
  ten_combo: string;
  gia_giam: number;
  goi_ids: number[];
  dang_hoat_dong: boolean;
};

export type AdminCreateHpDonLine = {
  qlhvId: number;
  goiId: number;
  ngayDauKy: string;
  ngayCuoiKy: string;
};

function dhpParseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dhpDiscountToPayable(giaGoc: number, discountPct: number): number {
  const g = Math.max(0, giaGoc);
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((g * (100 - d)) / 100);
}

function dhpLegacyGoiPayable(row: Record<string, unknown>): number {
  const hocPhi = dhpParseMoney(row.hoc_phi);
  const giaGiam = dhpParseMoney(row.gia_giam);
  if (giaGiam > 0) return Math.round(giaGiam);
  return hocPhi > 0 ? Math.round(hocPhi) : 0;
}

function dhpFormatNewGoiLabel(
  monTen: string | null,
  row: { number?: unknown; don_vi?: unknown; so_buoi?: unknown; special?: unknown; post_title?: unknown; id: number }
): string {
  const parts: string[] = [];
  const mon = (monTen ?? "").trim();
  if (mon) parts.push(mon);
  const pt = String(row.post_title ?? "").trim();
  if (pt) parts.push(pt);
  const sp = String(row.special ?? "").trim();
  if (sp) parts.push(sp);
  const numRaw = row.number;
  const num =
    numRaw == null || numRaw === ""
      ? null
      : Number.isFinite(Number(numRaw))
        ? Number(numRaw)
        : null;
  if (num != null) parts.push(Number.isInteger(num) ? String(Math.round(num)) : String(num));
  const dv = String(row.don_vi ?? "").trim() || "tháng";
  if (dv && num != null) parts.push(dv);
  return parts.length ? parts.join(" ") : `Gói #${row.id}`;
}

function dhpSliceIsoDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function dhpNormalizeHinhThucThu(raw: string): string {
  const t = String(raw ?? "").trim();
  if (t === "Tiền mặt") return "Tiền mặt";
  if (t === "Thẻ") return "Thẻ";
  return "Chuyen khoan";
}

async function dhpSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function dhpWaitForDonCodes(supabase: SupabaseClient, donId: number): Promise<{ ma_don: string; ma_don_so: string }> {
  const MAX_TRIES = 8;
  const INTERVAL_MS = 1500;
  for (let i = 0; i < MAX_TRIES; i += 1) {
    const { data, error } = await supabase
      .from("hp_don_thu_hoc_phi")
      .select("ma_don, ma_don_so")
      .eq("id", donId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = data as { ma_don?: string | null; ma_don_so?: string | null } | null;
    const so = row?.ma_don_so?.trim();
    if (so) {
      return {
        ma_don: String(row?.ma_don ?? "").trim(),
        ma_don_so: so,
      };
    }
    await dhpSleep(INTERVAL_MS);
  }
  throw new Error("Trigger chưa sinh ma_don_so — thử lại sau.");
}

/** Gộp dòng trùng nhãn/giá/buổi (DB có thể có 2 id khác nội dung hiển thị giống hệt). */
function dhpDedupeGoiOptionsForPicker(rows: AdminDhpGoiOption[]): {
  deduped: AdminDhpGoiOption[];
  /** raw_id → canonical (smallest) id trong cùng nhóm (mon_hoc + name + price + so_buoi). */
  canonicalMap: Record<number, number>;
} {
  // Pass 1: tìm canonical id (nhỏ nhất) cho mỗi signature
  const sigToCanonical = new Map<string, number>();
  for (const r of rows) {
    const sig = `${r.mon_hoc ?? 0}\t${r.ten_goi_hoc_phi}\t${r.hoc_phi_dong}\t${r.so_buoi ?? "null"}`;
    const cur = sigToCanonical.get(sig);
    if (cur == null || r.id < cur) sigToCanonical.set(sig, r.id);
  }
  // Pass 2: build canonicalMap và collect canonical rows
  const canonicalMap: Record<number, number> = {};
  const canonicalById = new Map<number, AdminDhpGoiOption>();
  for (const r of rows) {
    const sig = `${r.mon_hoc ?? 0}\t${r.ten_goi_hoc_phi}\t${r.hoc_phi_dong}\t${r.so_buoi ?? "null"}`;
    const canonical = sigToCanonical.get(sig)!;
    canonicalMap[r.id] = canonical;
    if (r.id === canonical) canonicalById.set(canonical, r);
  }
  const deduped = [...canonicalById.values()].sort((a, b) =>
    a.ten_goi_hoc_phi.localeCompare(b.ten_goi_hoc_phi, "vi")
  );
  return { deduped, canonicalMap };
}

function dhpUnwrapOne<T extends Record<string, unknown>>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : v;
}

/**
 * Nhân sự thuộc ban «Vận hành» / «Marketing» (cùng quy tắc Quản lý họa cụ — `hr_nhan_su_phong` → `hr_ban`).
 * Rỗng nếu không đọc được join → caller giữ toàn bộ danh sách.
 */
async function dhpFetchVanHanhMarketingNhanSuIds(supabase: SupabaseClient): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("hr_nhan_su_phong")
    .select("nhan_su_id, hr_phong!inner(ban, hr_ban!inner(ten_ban))");

  if (error || !data?.length) return new Set();

  const allowed = new Set(["Vận hành", "Marketing", "Ban Vận hành"]);
  const ids = new Set<number>();
  for (const row of data as { nhan_su_id?: unknown; hr_phong?: unknown }[]) {
    const ph = dhpUnwrapOne(row.hr_phong as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!ph) continue;
    const banRaw = (ph as { hr_ban?: unknown }).hr_ban;
    const ban = dhpUnwrapOne(banRaw as Record<string, unknown> | Record<string, unknown>[] | null);
    const tenBan =
      ban && typeof (ban as { ten_ban?: unknown }).ten_ban === "string"
        ? String((ban as { ten_ban: string }).ten_ban).trim()
        : "";
    if (!tenBan || !allowed.has(tenBan)) continue;
    const nid = Number(row.nhan_su_id);
    if (Number.isFinite(nid) && nid > 0) ids.add(nid);
  }
  return ids;
}

/** Admin hoặc phòng «Tư vấn» — được ghi `giam_gia_vnd` trên đơn. */
async function dhpSessionMaySetGiamGiaVnd(supabase: SupabaseClient, staffId: number): Promise<boolean> {
  const profile = await fetchAdminStaffShellProfile(supabase, staffId);
  if ((profile.vai_tro ?? "").trim().toLowerCase() === "admin") return true;
  const phongs = await fetchAdminStaffShellPhongTenPhongs(supabase, staffId);
  return staffBelongsToTuVanPhong(phongs);
}

/** Người tạo đơn thu học phí — chỉ ban Vận hành & Marketing khi lọc được từ `hr_nhan_su_phong`. */
export async function listHrNhanSuOptions(): Promise<
  { ok: true; rows: { id: number; full_name: string }[] } | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const banFilterIds = await dhpFetchVanHanhMarketingNhanSuIds(supabase);

  const { data, error } = await supabase.from("hr_nhan_su").select("id, full_name").order("full_name");
  if (error) return { ok: false, error: error.message };
  let rows = (data ?? [])
    .map((r) => {
      const id = Number((r as { id: unknown }).id);
      const full_name = String((r as { full_name: unknown }).full_name ?? "").trim();
      return { id, full_name };
    })
    .filter((r) => Number.isFinite(r.id) && r.id > 0 && r.full_name.length > 0);

  if (banFilterIds.size > 0) {
    rows = rows.filter((r) => banFilterIds.has(r.id));
  }

  return { ok: true, rows };
}

export async function listHpGoiHocPhiForDhp(): Promise<
  { ok: true; rows: AdminDhpGoiOption[]; canonicalMap: Record<number, number> } | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };
  const goiTable = hpGoiHocPhiTableName();
  const isLegacy = goiTable === "hp_goi_hoc_phi";

  if (isLegacy) {
    const { data, error } = await supabase
      .from(goiTable)
      .select("id, ten_goi_hoc_phi, mon_hoc, hoc_phi, gia_giam")
      .order("ten_goi_hoc_phi");
    if (error) return { ok: false, error: error.message };
    const rows: AdminDhpGoiOption[] = [];
    for (const r of data ?? []) {
      const row = r as Record<string, unknown>;
      const id = Number(row.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const payable = dhpLegacyGoiPayable(row);
      const giaGocLegacy = dhpParseMoney(row.hoc_phi);
      const mon = row.mon_hoc;
      const mon_hoc =
        mon == null || mon === "" ? null : Number.isFinite(Number(mon)) ? Number(mon) : null;
      rows.push({
        id,
        ten_goi_hoc_phi: String(row.ten_goi_hoc_phi ?? "").trim() || `Gói #${id}`,
        mon_hoc: mon_hoc != null && mon_hoc > 0 ? mon_hoc : null,
        gia_goc: giaGocLegacy > 0 ? giaGocLegacy : payable,
        hoc_phi_dong: payable,
        so_buoi: null,
        post_title: null,
        special: false,
      });
    }
    const { deduped, canonicalMap } = dhpDedupeGoiOptionsForPicker(rows);
    return { ok: true, rows: deduped, canonicalMap };
  }

  const { data, error } = await supabase
    .from(goiTable)
    .select('id, mon_hoc, gia_goc, discount, "number", don_vi, so_buoi, combo_id, post_title, special')
    .order("mon_hoc", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { ok: false, error: error.message };

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const monIds = [
    ...new Set(
      rawRows
        .map((row) => {
          const m = row.mon_hoc;
          if (m == null || m === "") return null;
          const n = Number(m);
          return Number.isFinite(n) && n > 0 ? n : null;
        })
        .filter((x): x is number => x != null)
    ),
  ];
  const monNameById = new Map<number, string>();
  if (monIds.length) {
    const { data: mons, error: monErr } = await supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc")
      .in("id", monIds);
    if (monErr) return { ok: false, error: monErr.message };
    for (const m of mons ?? []) {
      const o = m as { id?: unknown; ten_mon_hoc?: unknown };
      const id = Number(o.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      monNameById.set(id, String(o.ten_mon_hoc ?? "").trim());
    }
  }

  const rows: AdminDhpGoiOption[] = [];
  for (const row of rawRows) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const giaGoc = dhpParseMoney(row.gia_goc);
    const disc = dhpParseMoney(row.discount);
    const payable = giaGoc > 0 ? dhpDiscountToPayable(giaGoc, disc) : 0;
    const mon = row.mon_hoc;
    const mon_hoc =
      mon == null || mon === "" ? null : Number.isFinite(Number(mon)) ? Number(mon) : null;
    const monTen = mon_hoc != null ? monNameById.get(mon_hoc) ?? null : null;
    const soBuoiRounded =
      row.so_buoi == null || row.so_buoi === "" ? null : Math.round(dhpParseMoney(row.so_buoi));
    const postTitle = row.post_title != null ? String(row.post_title).trim() || null : null;
    const specialText = row.special != null ? String(row.special).trim() || null : null;
    rows.push({
      id,
      ten_goi_hoc_phi: dhpFormatNewGoiLabel(monTen, {
        number: row.number,
        don_vi: row.don_vi,
        so_buoi: row.so_buoi,
        special: row.special,
        post_title: row.post_title,
        id,
      }),
      mon_hoc: mon_hoc != null && mon_hoc > 0 ? mon_hoc : null,
      gia_goc: giaGoc > 0 ? giaGoc : payable,
      hoc_phi_dong: payable,
      so_buoi: soBuoiRounded,
      post_title: postTitle,
      special: specialText != null,
    });
  }
  const { deduped, canonicalMap } = dhpDedupeGoiOptionsForPicker(rows);
  return { ok: true, rows: deduped, canonicalMap };
}

export async function adminPollHpDonThu(
  donId: number
): Promise<
  | { ok: true; status: string | null; ma_don: string | null; ma_don_so: string | null; ngay_thanh_toan: string | null }
  | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };
  const { data, error } = await supabase
    .from("hp_don_thu_hoc_phi")
    .select("status, ma_don, ma_don_so, ngay_thanh_toan")
    .eq("id", donId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const row = data as Record<string, unknown> | null;
  if (!row) return { ok: false, error: "Không tìm thấy đơn." };
  return {
    ok: true,
    status: row.status != null ? String(row.status) : null,
    ma_don: row.ma_don != null ? String(row.ma_don) : null,
    ma_don_so: row.ma_don_so != null ? String(row.ma_don_so) : null,
    ngay_thanh_toan: row.ngay_thanh_toan != null ? String(row.ngay_thanh_toan).slice(0, 10) : null,
  };
}

export async function adminConfirmHpDonTienMat(donId: number): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };
  const today = new Date().toISOString().slice(0, 10);
  const { error: uDon } = await supabase
    .from("hp_don_thu_hoc_phi")
    .update({ status: "Đã thanh toán", ngay_thanh_toan: today })
    .eq("id", donId);
  if (uDon) return { ok: false, error: uDon.message || "Không cập nhật được đơn." };
  const { error: uChi } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .update({ status: "Đã thanh toán" })
    .eq("don_thu", donId);
  if (uChi) return { ok: false, error: uChi.message || "Không cập nhật được chi tiết đơn." };
  revalidate();
  return { ok: true, message: "Đã xác nhận thu tiền mặt." };
}

/** Đồng bộ dòng chi tiết khi đơn đã «Đã thanh toán» (webhook / poll). */
export async function adminSyncHpChiTietDaThanhToan(donId: number): Promise<QlhvActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };
  const { error } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .update({ status: "Đã thanh toán" })
    .eq("don_thu", donId);
  if (error) return { ok: false, error: error.message || "Không cập nhật chi tiết." };
  revalidate();
  return { ok: true };
}

export async function adminCreateHpDonThu(payload: {
  hocVienId: number;
  nguoiTaoId: number;
  hinhThucThu: string;
  khuyenMaiPercent: number;
  /** Chỉ admin / phòng Tư vấn — trừ VND sau KM % và combo (server chặn nếu không đủ quyền). */
  giamGiaVnd?: number;
  lines: AdminCreateHpDonLine[];
}): Promise<
  | { ok: true; donId: number; maDon: string; maDonSo: string; invoiceTotalDong: number }
  | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const hocVienId = Math.trunc(payload.hocVienId);
  const nguoiTaoId = Math.trunc(payload.nguoiTaoId);
  if (!Number.isFinite(hocVienId) || hocVienId <= 0) return { ok: false, error: "Học viên không hợp lệ." };
  if (!Number.isFinite(nguoiTaoId) || nguoiTaoId <= 0) return { ok: false, error: "Người tạo đơn không hợp lệ." };
  const lines = payload.lines ?? [];
  if (!lines.length) return { ok: false, error: "Thêm ít nhất một dòng gói học phí." };

  const pct = Math.min(100, Math.max(0, Math.round(Number(payload.khuyenMaiPercent) || 0)));
  const hinhDb = dhpNormalizeHinhThucThu(payload.hinhThucThu);

  const maySetExtraVnd = await dhpSessionMaySetGiamGiaVnd(supabase, session.staffId);
  const rawExtraVnd = maySetExtraVnd
    ? Math.max(0, Math.round(Number(payload.giamGiaVnd ?? 0) || 0))
    : 0;

  const { data: hvRow, error: hvErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id")
    .eq("id", hocVienId)
    .maybeSingle();
  if (hvErr || !hvRow) return { ok: false, error: hvErr?.message ?? "Không tìm thấy học viên." };

  const { data: nsRow, error: nsErr } = await supabase.from("hr_nhan_su").select("id").eq("id", nguoiTaoId).maybeSingle();
  if (nsErr || !nsRow) return { ok: false, error: "Người tạo không tồn tại trong hr_nhan_su." };

  const seenQl = new Set<number>();
  const goiTable = hpGoiHocPhiTableName();
  let subtotal = 0;

  for (const ln of lines) {
    const qlhvId = Math.trunc(ln.qlhvId);
    const goiId = Math.trunc(ln.goiId);
    if (!Number.isFinite(qlhvId) || qlhvId <= 0 || !Number.isFinite(goiId) || goiId <= 0) {
      return { ok: false, error: "Dòng không hợp lệ (lớp / gói)." };
    }
    if (seenQl.has(qlhvId)) return { ok: false, error: "Trùng khoá học trong cùng đơn." };
    seenQl.add(qlhvId);

    const dau = dhpSliceIsoDate(ln.ngayDauKy);
    const cuoi = dhpSliceIsoDate(ln.ngayCuoiKy);
    if (!dau || !cuoi) return { ok: false, error: "Mỗi dòng cần ngày đầu kỳ và ngày cuối kỳ (YYYY-MM-DD)." };
    const t0 = new Date(dau);
    const t1 = new Date(cuoi);
    t0.setHours(0, 0, 0, 0);
    t1.setHours(0, 0, 0, 0);
    if (t0.getTime() > t1.getTime()) return { ok: false, error: "Ngày đầu kỳ phải trước hoặc trùng ngày cuối kỳ." };

    const { data: ql, error: qlErr } = await supabase
      .from("ql_quan_ly_hoc_vien")
      .select("id, hoc_vien_id, lop_hoc")
      .eq("id", qlhvId)
      .maybeSingle();
    if (qlErr || !ql) return { ok: false, error: qlErr?.message ?? "Không đọc được ghi danh." };
    if (Number((ql as { hoc_vien_id: unknown }).hoc_vien_id) !== hocVienId) {
      return { ok: false, error: "Khoá học không thuộc học viên đang chọn." };
    }
    const lopId = Number((ql as { lop_hoc: unknown }).lop_hoc);
    if (!Number.isFinite(lopId) || lopId <= 0) return { ok: false, error: "Ghi danh thiếu lớp học." };

    const { data: lopRow, error: lopErr } = await supabase
      .from("ql_lop_hoc")
      .select("id, mon_hoc")
      .eq("id", lopId)
      .maybeSingle();
    if (lopErr || !lopRow) return { ok: false, error: "Không đọc được lớp học." };
    const monHocId = Number((lopRow as { mon_hoc: unknown }).mon_hoc);
    if (!Number.isFinite(monHocId) || monHocId <= 0) return { ok: false, error: `Lớp ${lopId} chưa gán môn học.` };

    const goiSelect =
      goiTable === "hp_goi_hoc_phi" ? "id, mon_hoc, hoc_phi, gia_giam" : "id, mon_hoc, gia_goc, discount";
    const { data: goiRow, error: goiErr } = await supabase.from(goiTable).select(goiSelect).eq("id", goiId).maybeSingle();
    if (goiErr || !goiRow) return { ok: false, error: goiErr?.message ?? "Không đọc được gói học phí." };
    const goiMon = Number((goiRow as { mon_hoc: unknown }).mon_hoc);
    if (goiMon !== monHocId) return { ok: false, error: `Gói ${goiId} không khớp môn của lớp.` };
    const gr = goiRow as Record<string, unknown>;
    const payable =
      goiTable === "hp_goi_hoc_phi"
        ? dhpLegacyGoiPayable(gr)
        : (() => {
            const giaGoc = dhpParseMoney(gr.gia_goc);
            const disc = dhpParseMoney(gr.discount);
            return giaGoc > 0 ? dhpDiscountToPayable(giaGoc, disc) : 0;
          })();
    if (payable <= 0) return { ok: false, error: `Gói ${goiId} có học phí = 0.` };
    subtotal += payable;
  }

  const discountDong = Math.round(subtotal * (pct / 100));

  // Kiểm tra combo discount dựa trên goi_ids trong hp_combo_mon
  let comboDiscountDong = 0;
  const selectedGoiIds = lines.map((ln) => Math.trunc(ln.goiId));
  if (selectedGoiIds.length > 0) {
    const { data: allGoisRaw } = await supabase
      .from(goiTable)
      .select("id, mon_hoc, gia_goc, discount, so_buoi, post_title, special")
      .order("id", { ascending: true });
    // Build canonical map: raw_id → smallest id với cùng (mon_hoc, gia_goc, discount, so_buoi)
    const sigMap = new Map<string, number>();
    for (const r of (allGoisRaw ?? []) as Record<string, unknown>[]) {
      const id = Number(r.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const sig = `${r.mon_hoc ?? 0}\t${r.gia_goc ?? 0}\t${r.discount ?? 0}\t${r.so_buoi ?? "null"}`;
      const cur = sigMap.get(sig);
      if (cur == null || id < cur) sigMap.set(sig, id);
    }
    const canonMap: Record<number, number> = {};
    for (const r of (allGoisRaw ?? []) as Record<string, unknown>[]) {
      const id = Number(r.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const sig = `${r.mon_hoc ?? 0}\t${r.gia_goc ?? 0}\t${r.discount ?? 0}\t${r.so_buoi ?? "null"}`;
      const canonical = sigMap.get(sig);
      if (canonical != null) canonMap[id] = canonical;
    }
    const { data: comboRows } = await supabase
      .from("hp_combo_mon")
      .select("id, ten_combo, gia_giam, goi_ids, dang_hoat_dong")
      .order("gia_giam", { ascending: false });
    if (comboRows?.length) {
      const payingLines = selectedGoiIds.map((gid) => ({ goiId: canonMap[gid] ?? gid }));
      const normalizedCombos = (comboRows as Record<string, unknown>[]).map((c) => {
        const rawIds = Array.isArray(c.goi_ids)
          ? (c.goi_ids as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
          : [];
        return {
          id: Number(c.id),
          ten_combo: String(c.ten_combo ?? ""),
          gia_giam: Number(c.gia_giam ?? 0),
          goi_ids: rawIds.map((id) => canonMap[id] ?? id),
          dang_hoat_dong: c.dang_hoat_dong !== false,
        };
      });
      const comboDiscountCalc = firstApplicableComboDiscountDong(payingLines, normalizedCombos);
      comboDiscountDong = comboDiscountCalc;
    }
  }

  const totalDiscount = discountDong + comboDiscountDong;
  const afterKmCombo = Math.max(0, Math.round(subtotal - totalDiscount));
  const giamGiaVndApplied = Math.min(rawExtraVnd, afterKmCombo);
  const invoiceTotalDong = Math.max(0, afterKmCombo - giamGiaVndApplied);
  if (invoiceTotalDong <= 0) return { ok: false, error: "Tổng sau khuyến mãi phải > 0." };

  const { data: donRow, error: donErr } = await supabase
    .from("hp_don_thu_hoc_phi")
    .insert({
      student: hocVienId,
      nguoi_tao: nguoiTaoId,
      hinh_thuc_thu: hinhDb,
      status: "Chờ thanh toán",
      giam_gia: totalDiscount > 0 ? totalDiscount : null,
      giam_gia_vnd: giamGiaVndApplied > 0 ? giamGiaVndApplied : null,
    })
    .select("id")
    .single();
  if (donErr || !donRow) return { ok: false, error: donErr?.message ?? "Không tạo được đơn." };
  const donId = Number((donRow as { id: unknown }).id);

  try {
    for (const ln of lines) {
      const dau = dhpSliceIsoDate(ln.ngayDauKy)!;
      const cuoi = dhpSliceIsoDate(ln.ngayCuoiKy)!;
      const { error: ctErr } = await supabase.from("hp_thu_hp_chi_tiet").insert({
        don_thu: donId,
        nguoi_tao: nguoiTaoId,
        khoa_hoc_vien: Math.trunc(ln.qlhvId),
        goi_hoc_phi: Math.trunc(ln.goiId),
        ngay_dau_ky: dau,
        ngay_cuoi_ky: cuoi,
        status: "Chờ thanh toán",
      });
      if (ctErr) throw new Error(ctErr.message);
    }
  } catch (e) {
    await supabase.from("hp_thu_hp_chi_tiet").delete().eq("don_thu", donId);
    await supabase.from("hp_don_thu_hoc_phi").delete().eq("id", donId);
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo chi tiết đơn." };
  }

  let codes: { ma_don: string; ma_don_so: string };
  try {
    codes = await dhpWaitForDonCodes(supabase, donId);
  } catch (e) {
    await supabase.from("hp_thu_hp_chi_tiet").delete().eq("don_thu", donId);
    await supabase.from("hp_don_thu_hoc_phi").delete().eq("id", donId);
    return { ok: false, error: e instanceof Error ? e.message : "Không lấy được mã đơn." };
  }

  revalidate();
  return {
    ok: true,
    donId,
    maDon: codes.ma_don,
    maDonSo: codes.ma_don_so,
    invoiceTotalDong,
  };
}

export async function listHpComboMonForDhp(): Promise<
  { ok: true; rows: AdminDhpComboOption[] } | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { data, error } = await supabase
    .from("hp_combo_mon")
    .select("id, ten_combo, gia_giam, goi_ids, dang_hoat_dong")
    .order("id", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const rows: AdminDhpComboOption[] = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const raw = row.goi_ids;
    const goi_ids = Array.isArray(raw)
      ? (raw as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    return {
      id: Number(row.id),
      ten_combo: String(row.ten_combo ?? "").trim() || `Combo #${Number(row.id)}`,
      gia_giam: Number(row.gia_giam ?? 0),
      goi_ids,
      dang_hoat_dong: row.dang_hoat_dong !== false,
    };
  });

  return { ok: true, rows };
}

export async function fetchQuanLyHocVienBundleAction(): Promise<
  | { ok: true; bundle: QuanLyHocVienViewBundle }
  | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const raw = await fetchAdminQuanLyHocVienBundle(supabase);
  if (raw.error) return { ok: false, error: raw.error };

  const bundle: QuanLyHocVienViewBundle = {
    students: raw.students,
    enrollments: raw.enrollments,
    lopById: raw.lopById,
    baiTapById: raw.baiTapById,
    truongNganhByHvId: raw.truongNganhByHvId,
  };

  return { ok: true, bundle };
}
