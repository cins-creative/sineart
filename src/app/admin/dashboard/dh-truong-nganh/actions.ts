"use server";

import { revalidatePath } from "next/cache";

import {
  DH_MON_THI_ARRAY_MAX_COUNT,
  DH_MON_THI_ITEM_MAX_LEN,
} from "@/lib/agent/dh-exam-profiles";
import { clampDhMocText, DH_MOC_TEXT_MAX } from "@/lib/data/admin-dh-truong-nganh";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REV = "/admin/dashboard/dh-truong-nganh";

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
}): Promise<DhTnUpdateState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const rowId = Math.trunc(payload.rowId);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return { ok: false, error: "Dòng nguyện vọng không hợp lệ." };
  }

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

  const { error } = await supabase
    .from("ql_hv_truong_nganh")
    .update({ score: scoreToSave })
    .eq("id", rowId);

  if (error) return { ok: false, error: error.message };

  revalidateDhSlugRoutes();
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
