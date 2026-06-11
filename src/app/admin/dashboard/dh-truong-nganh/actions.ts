"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import {
  DH_MON_THI_ARRAY_MAX_COUNT,
  DH_MON_THI_ITEM_MAX_LEN,
} from "@/lib/agent/dh-exam-profiles";
import { clampDhMocText, DH_MOC_TEXT_MAX } from "@/lib/data/admin-dh-truong-nganh";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REV = "/admin/dashboard/dh-truong-nganh";

const DH_TRUONG_TEN_MAX = 240;

function revalidate(): void {
  revalidatePath(REV);
}

function revalidateDhSlugRoutes(): void {
  revalidatePath(REV);
  revalidatePath(`${REV}/[truongSlug]`, "page");
  revalidatePath(`${REV}/[truongSlug]/nganh/[nganhSlug]`, "page");
  revalidatePath(`${REV}/[truongSlug]/tuyen-sinh/[nam]`, "page");
}

function sanitizeMonThiForSave(raw: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    let t = x.trim();
    if (!t) continue;
    if (t.length > DH_MON_THI_ITEM_MAX_LEN) t = t.slice(0, DH_MON_THI_ITEM_MAX_LEN);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= DH_MON_THI_ARRAY_MAX_COUNT) break;
  }
  return out;
}

export type DhTnUpdateState = { ok: true } | { ok: false; error: string };

export async function updateDhTruongNganhRow(payload: {
  truongId: number;
  nganhId: number;
  details: string | null;
  monThi: string[];
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const truongId = Math.trunc(payload.truongId);
  const nganhId = Math.trunc(payload.nganhId);
  if (!Number.isFinite(truongId) || truongId <= 0 || !Number.isFinite(nganhId) || nganhId <= 0) {
    return { ok: false, error: "Trường hoặc ngành không hợp lệ." };
  }

  const details =
    payload.details != null && String(payload.details).trim() !== "" ? String(payload.details).trim() : null;

  const monThi = sanitizeMonThiForSave(payload.monThi ?? []);

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase
    .from("dh_truong_nganh")
    .update({
      details,
      mon_thi: monThi,
    })
    .eq("truong_dai_hoc", truongId)
    .eq("nganh_dao_tao", nganhId);

  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

/**
 * Tư vấn cập nhật điểm thi học viên cho 1 dòng nguyện vọng (`ql_hv_truong_nganh`).
 *
 * - `score = null` → xoá điểm (bỏ trống ô).
 * - Số phải hữu hạn, không âm. Chấp nhận thập phân (vd: 7.25). Cap ở 1000 đề
 *   phòng nhập sai đơn vị.
 *
 * Revalidate cả route gốc lẫn các sub-route slug để bảng cập nhật ngay.
 */
export async function updateQlHvTruongNganhScore(payload: {
  rowId: number;
  score: number | null;
  /** 0 = `score` (môn 1), 1 = `score_2` (môn 2). Mặc định 0. */
  subjectIndex?: 0 | 1;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const rowId = Math.trunc(payload.rowId);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return { ok: false, error: "Dòng nguyện vọng không hợp lệ." };
  }

  const subjectIndex = payload.subjectIndex === 1 ? 1 : 0;

  let scoreToSave: number | null = null;
  if (payload.score != null) {
    if (!Number.isFinite(payload.score)) {
      return { ok: false, error: "Điểm thi phải là số." };
    }
    if (payload.score < 0) {
      return { ok: false, error: "Điểm thi không được âm." };
    }
    if (payload.score > 1000) {
      return { ok: false, error: "Điểm thi không hợp lệ (quá lớn)." };
    }
    scoreToSave = payload.score;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const patch = subjectIndex === 1 ? { score_2: scoreToSave } : { score: scoreToSave };

  const { error } = await supabase.from("ql_hv_truong_nganh").update(patch).eq("id", rowId);

  if (error) {
    if (subjectIndex === 1 && /score_2/i.test(error.message) && /column|schema cache/i.test(error.message)) {
      return {
        ok: false,
        error:
          "Chưa có cột score_2 trong DB. Chạy scripts/sql/add-ql-hv-truong-nganh-score-2.sql trong Supabase SQL Editor.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateDhSlugRoutes();
  return { ok: true };
}

/** Cập nhật ghi chú trên một dòng nguyện vọng (`ql_hv_truong_nganh`). */
export async function updateQlHvTruongNganhGhiChu(payload: {
  rowId: number;
  ghiChu: string | null;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const rowId = Math.trunc(payload.rowId);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return { ok: false, error: "Dòng nguyện vọng không hợp lệ." };
  }

  const ghi_chu =
    payload.ghiChu != null && String(payload.ghiChu).trim() !== ""
      ? clampDhMocText(String(payload.ghiChu), DH_MOC_GHI_CHU_MAX)
      : null;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("ql_hv_truong_nganh").update({ ghi_chu }).eq("id", rowId);
  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  revalidatePath("/admin/dashboard/quan-ly-hoc-vien");
  return { ok: true };
}

const DH_MOC_TEN_MAX = 240;
const DH_MOC_GHI_CHU_MAX = 2000;
const DH_MOC_NGUON_MAX = 2000;

export async function insertDhMocLichTuyenSinh(payload: {
  truongId: number;
  namTuyenSinh: number;
  tenMoc: string | null;
  thoiGianMoTa: string;
  ghiChu: string | null;
  nguonThongBao: string | null;
  thuTu: number;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const truongId = Math.trunc(payload.truongId);
  const nam = Math.trunc(payload.namTuyenSinh);
  if (!Number.isFinite(truongId) || truongId <= 0 || !Number.isFinite(nam) || nam < 2000 || nam > 2100) {
    return { ok: false, error: "Trường hoặc năm tuyển sinh không hợp lệ." };
  }

  const thoiGianMoTa = clampDhMocText(payload.thoiGianMoTa ?? "", DH_MOC_TEXT_MAX);
  if (!thoiGianMoTa) return { ok: false, error: "Thời gian / mô tả không được để trống." };

  const tenMoc =
    payload.tenMoc != null && String(payload.tenMoc).trim() !== ""
      ? clampDhMocText(String(payload.tenMoc), DH_MOC_TEN_MAX)
      : null;
  const ghiChu =
    payload.ghiChu != null && String(payload.ghiChu).trim() !== ""
      ? clampDhMocText(String(payload.ghiChu), DH_MOC_GHI_CHU_MAX)
      : null;
  const nguon =
    payload.nguonThongBao != null && String(payload.nguonThongBao).trim() !== ""
      ? clampDhMocText(String(payload.nguonThongBao), DH_MOC_NGUON_MAX)
      : null;

  const thuTu = Number.isFinite(payload.thuTu) ? Math.trunc(payload.thuTu) : 0;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("dh_moc_lich_tuyen_sinh").insert({
    truong_dai_hoc: truongId,
    nam_tuyen_sinh: nam,
    ten_moc: tenMoc,
    thoi_gian_mo_ta: thoiGianMoTa,
    ghi_chu: ghiChu,
    nguon_thong_bao: nguon,
    thu_tu: thuTu,
  });

  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  return { ok: true };
}

export async function updateDhMocLichTuyenSinh(payload: {
  id: number;
  tenMoc: string | null;
  thoiGianMoTa: string;
  ghiChu: string | null;
  nguonThongBao: string | null;
  thuTu: number;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const id = Math.trunc(payload.id);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mốc lịch không hợp lệ." };

  const thoiGianMoTa = clampDhMocText(payload.thoiGianMoTa ?? "", DH_MOC_TEXT_MAX);
  if (!thoiGianMoTa) return { ok: false, error: "Thời gian / mô tả không được để trống." };

  const tenMoc =
    payload.tenMoc != null && String(payload.tenMoc).trim() !== ""
      ? clampDhMocText(String(payload.tenMoc), DH_MOC_TEN_MAX)
      : null;
  const ghiChu =
    payload.ghiChu != null && String(payload.ghiChu).trim() !== ""
      ? clampDhMocText(String(payload.ghiChu), DH_MOC_GHI_CHU_MAX)
      : null;
  const nguon =
    payload.nguonThongBao != null && String(payload.nguonThongBao).trim() !== ""
      ? clampDhMocText(String(payload.nguonThongBao), DH_MOC_NGUON_MAX)
      : null;

  const thuTu = Number.isFinite(payload.thuTu) ? Math.trunc(payload.thuTu) : 0;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase
    .from("dh_moc_lich_tuyen_sinh")
    .update({
      ten_moc: tenMoc,
      thoi_gian_mo_ta: thoiGianMoTa,
      ghi_chu: ghiChu,
      nguon_thong_bao: nguon,
      thu_tu: thuTu,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  return { ok: true };
}

export async function deleteDhMocLichTuyenSinh(payload: { id: number }): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const id = Math.trunc(payload.id);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mốc lịch không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("dh_moc_lich_tuyen_sinh").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  return { ok: true };
}

const MON_THI_CHON_MAX = 240;

export async function updateQlHvTruongNganhMonThiChon(payload: {
  rowId: number;
  monThiChon: string | null;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const rowId = Math.trunc(payload.rowId);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return { ok: false, error: "Dòng nguyện vọng không hợp lệ." };
  }

  let value: string | null = null;
  if (payload.monThiChon != null && String(payload.monThiChon).trim() !== "") {
    value = clampDhMocText(String(payload.monThiChon), MON_THI_CHON_MAX);
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("ql_hv_truong_nganh").update({ mon_thi_chon: value }).eq("id", rowId);

  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  return { ok: true };
}

/**
 * Thêm một trường đại học mới (`dh_truong_dai_hoc`).
 *
 * - Validate `ten_truong_dai_hoc` không rỗng (đã trim) và <= 240 ký tự.
 * - Chặn trùng tên (case-insensitive).
 * - `score` (điểm chuẩn / ưu tiên) optional — số hữu hạn, không âm.
 */
export async function addDhTruongDaiHoc(payload: {
  ten: string;
  score: number | null;
}): Promise<{ ok: true; id: number; ten: string } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ten = String(payload.ten ?? "").trim();
  if (!ten) return { ok: false, error: "Tên trường không được để trống." };
  if (ten.length > DH_TRUONG_TEN_MAX) {
    return { ok: false, error: `Tên trường quá dài (tối đa ${DH_TRUONG_TEN_MAX} ký tự).` };
  }

  let scoreToSave: number | null = null;
  if (payload.score != null) {
    if (!Number.isFinite(payload.score)) {
      return { ok: false, error: "Điểm chuẩn phải là số." };
    }
    if (payload.score < 0) {
      return { ok: false, error: "Điểm chuẩn không được âm." };
    }
    if (payload.score > 1000) {
      return { ok: false, error: "Điểm chuẩn không hợp lệ (quá lớn)." };
    }
    scoreToSave = payload.score;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { data: dup, error: dupErr } = await supabase
    .from("dh_truong_dai_hoc")
    .select("id, ten_truong_dai_hoc")
    .ilike("ten_truong_dai_hoc", ten)
    .limit(1);
  if (dupErr) return { ok: false, error: dupErr.message };
  if (dup && dup.length > 0) {
    return { ok: false, error: `Trường "${ten}" đã tồn tại.` };
  }

  const { data: inserted, error } = await supabase
    .from("dh_truong_dai_hoc")
    .insert({ ten_truong_dai_hoc: ten, score: scoreToSave })
    .select("id, ten_truong_dai_hoc")
    .single();

  if (error) return { ok: false, error: error.message };
  const row = inserted as { id?: unknown; ten_truong_dai_hoc?: unknown } | null;
  const newId = Number(row?.id);
  if (!Number.isFinite(newId) || newId <= 0) {
    return { ok: false, error: "Không lấy được ID trường vừa thêm." };
  }

  revalidateDhSlugRoutes();
  return {
    ok: true,
    id: newId,
    ten: String(row?.ten_truong_dai_hoc ?? "").trim() || ten,
  };
}

/**
 * Xóa một trường đại học.
 *
 * - Chặn nếu còn dòng `ql_hv_truong_nganh` tham chiếu (học viên đã đăng ký dự thi).
 *   Lý do: đây là dữ liệu hồ sơ học viên — không nên cascade tự động.
 * - Cascade xóa các bảng config phụ thuộc:
 *   `dh_truong_nganh_theo_nam`, `dh_moc_lich_tuyen_sinh`, `dh_truong_nganh`.
 * - Cuối cùng xóa dòng `dh_truong_dai_hoc.id`.
 *
 * Quyền: dùng `assertStaffMayDeleteRecords` — chỉ vai trò được phép xóa mới gọi được.
 */
export async function deleteDhTruongDaiHoc(payload: {
  id: number;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const id = Math.trunc(payload.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Mã trường không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const perm = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const { count: hvCount, error: hvErr } = await supabase
    .from("ql_hv_truong_nganh")
    .select("id", { count: "exact", head: true })
    .eq("truong_dai_hoc", id);
  if (hvErr) return { ok: false, error: hvErr.message };
  if ((hvCount ?? 0) > 0) {
    return {
      ok: false,
      error: `Không xóa được — còn ${hvCount} học viên đã đăng ký thi trường này. Gỡ nguyện vọng học viên (ql_hv_truong_nganh) trước.`,
    };
  }

  const { error: e1 } = await supabase
    .from("dh_truong_nganh_theo_nam")
    .delete()
    .eq("truong_dai_hoc", id);
  if (e1) return { ok: false, error: `dh_truong_nganh_theo_nam: ${e1.message}` };

  const { error: e2 } = await supabase
    .from("dh_moc_lich_tuyen_sinh")
    .delete()
    .eq("truong_dai_hoc", id);
  if (e2) return { ok: false, error: `dh_moc_lich_tuyen_sinh: ${e2.message}` };

  const { error: e3 } = await supabase
    .from("dh_truong_nganh")
    .delete()
    .eq("truong_dai_hoc", id);
  if (e3) return { ok: false, error: `dh_truong_nganh: ${e3.message}` };

  const { error } = await supabase.from("dh_truong_dai_hoc").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  return { ok: true };
}

export async function upsertDhTruongNganhTheoNam(payload: {
  truongId: number;
  nganhId: number;
  namTuyenSinh: number;
  chiTieu: number | null;
  diemChuan: number | null;
  ghiChu: string | null;
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const truongId = Math.trunc(payload.truongId);
  const nganhId = Math.trunc(payload.nganhId);
  const nam = Math.trunc(payload.namTuyenSinh);
  if (!Number.isFinite(truongId) || truongId <= 0 || !Number.isFinite(nganhId) || nganhId <= 0) {
    return { ok: false, error: "Trường hoặc ngành không hợp lệ." };
  }
  if (!Number.isFinite(nam) || nam < 2000 || nam > 2100) {
    return { ok: false, error: "Năm tuyển sinh không hợp lệ." };
  }

  let chiTieu: number | null = null;
  if (payload.chiTieu != null) {
    if (!Number.isFinite(payload.chiTieu) || payload.chiTieu < 0) {
      return { ok: false, error: "Chỉ tiêu không hợp lệ." };
    }
    chiTieu = Math.trunc(payload.chiTieu);
  }

  let diemChuan: number | null = null;
  if (payload.diemChuan != null) {
    if (!Number.isFinite(payload.diemChuan) || Number(payload.diemChuan) < 0) {
      return { ok: false, error: "Điểm chuẩn không hợp lệ." };
    }
    diemChuan = Number(payload.diemChuan);
  }

  const ghiChu =
    payload.ghiChu != null && String(payload.ghiChu).trim() !== ""
      ? clampDhMocText(String(payload.ghiChu), 2000)
      : null;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from("dh_truong_nganh_theo_nam").upsert(
    {
      truong_dai_hoc: truongId,
      nganh_dao_tao: nganhId,
      nam_tuyen_sinh: nam,
      chi_tieu: chiTieu,
      diem_chuan: diemChuan,
      ghi_chu: ghiChu,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "truong_dai_hoc,nganh_dao_tao,nam_tuyen_sinh" },
  );

  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
  return { ok: true };
}
