"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import type { QuanLyNhanSuViewBundle } from "@/lib/admin/quan-ly-nhan-su-local-cache";
import {
  fetchAdminQuanLyNhanSuBundle,
  HR_NHAN_SU_SELECT_MIN,
  mapHrNhanSuRow,
  type AdminNhanSuRow,
} from "@/lib/data/admin-quan-ly-nhan-su";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/quan-ly-nhan-su";

const VAI_TRO_ALLOWED = new Set(["admin", "quan_ly", "nhan_vien", "tu_van"]);

export type UpdateNhanSuAvatarResult = { ok: true } | { ok: false; error: string };

/**
 * Cập nhật `hr_nhan_su.avatar` (URL Cloudflare Images từ `/admin/api/upload-cf-image`).
 */
export async function updateNhanSuAvatar(
  nhanSuId: number,
  avatar: string | null
): Promise<UpdateNhanSuAvatarResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  if (!Number.isFinite(nhanSuId) || nhanSuId <= 0) {
    return { ok: false, error: "ID nhân sự không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const next = avatar != null && avatar.trim() !== "" ? avatar.trim() : null;

  const { error } = await supabase.from("hr_nhan_su").update({ avatar: next }).eq("id", nhanSuId);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được ảnh đại diện." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type UpdateNhanSuThongTinResult = { ok: true } | { ok: false; error: string };

export type NhanSuThongTinPayload = {
  id: number;
  full_name: string;
  chi_nhanh_id: number | null;
  vai_tro: string | null;
  status: string | null;
  ngay_sinh: string | null;
  sa_startdate: string | null;
  thong_tin_khac: string | null;
  hinh_thuc_tinh_luong: string | null;
};

/**
 * Cập nhật các trường hồ sơ nhân sự trên tab «Thông tin» (`hr_nhan_su`).
 * `ban` và phòng (`hr_nhan_su_phong`) không cập nhật từ payload này — phòng đồng bộ qua `syncHrNhanSuPhong`.
 */
export async function updateNhanSuThongTin(payload: NhanSuThongTinPayload): Promise<UpdateNhanSuThongTinResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "ID nhân sự không hợp lệ." };
  }

  const full_name = payload.full_name.trim();
  if (!full_name) {
    return { ok: false, error: "Họ tên không được để trống." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const toDateOrNull = (s: string | null): string | null => {
    if (s == null || String(s).trim() === "") return null;
    const t = String(s).trim().slice(0, 10);
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t) ? t : null;
  };

  const trimmedVt = payload.vai_tro != null ? String(payload.vai_tro).trim() : "";
  let vai_tro: string | null = null;
  if (trimmedVt) {
    const k = trimmedVt.toLowerCase();
    vai_tro = VAI_TRO_ALLOWED.has(k) ? k : "nhan_vien";
  }

  const body = {
    full_name,
    chi_nhanh_id: payload.chi_nhanh_id,
    vai_tro,
    status: payload.status != null && payload.status.trim() !== "" ? payload.status.trim() : null,
    ngay_sinh: toDateOrNull(payload.ngay_sinh),
    sa_startdate: toDateOrNull(payload.sa_startdate),
    thong_tin_khac: payload.thong_tin_khac != null && payload.thong_tin_khac.trim() !== "" ? payload.thong_tin_khac.trim() : null,
    hinh_thuc_tinh_luong:
      payload.hinh_thuc_tinh_luong != null && payload.hinh_thuc_tinh_luong.trim() !== ""
        ? payload.hinh_thuc_tinh_luong.trim()
        : null,
  };

  const { error } = await supabase.from("hr_nhan_su").update(body).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được nhân sự." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type CreateNhanSuPayload = {
  full_name: string;
  chi_nhanh_id: number | null;
  vai_tro: string | null;
  status: string | null;
  hinh_thuc_tinh_luong: string | null;
  phong_ids: number[];
  ngay_sinh?: string | null;
  sa_startdate?: string | null;
  email?: string | null;
  sdt?: string | null;
};

export type CreateNhanSuResult = { ok: true; row: AdminNhanSuRow } | { ok: false; error: string };

/**
 * Tạo bản ghi `hr_nhan_su` mới + gán phòng (`hr_nhan_su_phong`), giống flow Framer `createNhanSu` + `setPhongForNhanSu`.
 */
export async function createNhanSu(payload: CreateNhanSuPayload): Promise<CreateNhanSuResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const full_name = payload.full_name.trim();
  if (!full_name) {
    return { ok: false, error: "Nhập họ tên nhân viên." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const toDateOrNull = (s: string | null | undefined): string | null => {
    if (s == null || String(s).trim() === "") return null;
    const t = String(s).trim().slice(0, 10);
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t) ? t : null;
  };

  const trimOrNull = (s: string | null | undefined): string | null =>
    s != null && String(s).trim() !== "" ? String(s).trim() : null;

  const vaiRaw = (payload.vai_tro ?? "").trim().toLowerCase();
  const vai_tro = VAI_TRO_ALLOWED.has(vaiRaw) ? vaiRaw : "nhan_vien";

  const status =
    payload.status != null && String(payload.status).trim() !== ""
      ? String(payload.status).trim()
      : "Đang làm";

  const hinh_thuc_tinh_luong =
    payload.hinh_thuc_tinh_luong != null && String(payload.hinh_thuc_tinh_luong).trim() !== ""
      ? String(payload.hinh_thuc_tinh_luong).trim()
      : "Fulltime";

  const chi =
    payload.chi_nhanh_id != null && Number.isFinite(Number(payload.chi_nhanh_id)) && Number(payload.chi_nhanh_id) > 0
      ? Number(payload.chi_nhanh_id)
      : null;

  const phongIds = [...new Set(payload.phong_ids.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0))];

  let ban: number | null = null;
  if (phongIds.length > 0) {
    const { data: phRow, error: phErr } = await supabase.from("hr_phong").select("ban").eq("id", phongIds[0]).maybeSingle();
    if (!phErr && phRow && phRow.ban != null && Number.isFinite(Number(phRow.ban))) {
      ban = Number(phRow.ban);
    }
  }

  const insertBody: Record<string, unknown> = {
    full_name,
    chi_nhanh_id: chi,
    vai_tro,
    status,
    hinh_thuc_tinh_luong,
    ban,
    ngay_sinh: toDateOrNull(payload.ngay_sinh ?? null),
    sa_startdate: toDateOrNull(payload.sa_startdate ?? null),
    email: trimOrNull(payload.email ?? null),
    sdt: trimOrNull(payload.sdt ?? null),
  };

  const trySelects = [
    "id, created_at, full_name, sdt, email, avatar, bank_name, bank_stk, chi_nhanh_id, status, ghi_chu, rate_thuong_co_ban, rate_thuong_hoc_vien, hinh_thuc_tinh_luong, luong_co_ban, tro_cap, \"BHXH\", so_buoi_nghi_toi_da, ngay_sinh, sa_startdate, facebook, stk_nhan_luong, hop_dong_lao_dong, thong_tin_khac, vai_tro, ban, portfolio, bio, nam_kinh_nghiem",
    "id, created_at, full_name, sdt, email, avatar, bank_name, bank_stk, chi_nhanh_id, status, ghi_chu, rate_thuong_co_ban, rate_thuong_hoc_vien, hinh_thuc_tinh_luong, luong_co_ban, tro_cap, so_buoi_nghi_toi_da, ngay_sinh, sa_startdate, facebook, stk_nhan_luong, hop_dong_lao_dong, thong_tin_khac, vai_tro, ban, portfolio, bio, nam_kinh_nghiem",
    HR_NHAN_SU_SELECT_MIN,
  ];

  let createdRaw: Record<string, unknown> | null = null;
  let lastErr: string | null = null;
  for (const sel of trySelects) {
    const { data, error } = await supabase.from("hr_nhan_su").insert(insertBody).select(sel).maybeSingle();
    if (!error && data && typeof data === "object") {
      createdRaw = data as Record<string, unknown>;
      break;
    }
    lastErr = error?.message ?? "insert failed";
  }

  if (!createdRaw) {
    return { ok: false, error: lastErr ?? "Không tạo được nhân sự." };
  }

  const newId = Number(createdRaw.id);
  if (!Number.isFinite(newId) || newId <= 0) {
    return { ok: false, error: "Không nhận được ID nhân sự sau khi tạo." };
  }

  if (phongIds.length > 0) {
    const rows = phongIds.map((phong_id) => ({ nhan_su_id: newId, phong_id }));
    const { error: insPh } = await supabase.from("hr_nhan_su_phong").insert(rows);
    if (insPh) {
      await supabase.from("hr_nhan_su").delete().eq("id", newId);
      return { ok: false, error: insPh.message || "Không gán được phòng — đã hủy tạo nhân sự." };
    }
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true, row: mapHrNhanSuRow(createdRaw) };
}

export type SyncHrNhanSuPhongResult = { ok: true } | { ok: false; error: string };

/** Ghi đè toàn bộ phòng gán cho nhân sự (`hr_nhan_su_phong`). */
export async function syncHrNhanSuPhong(payload: {
  nhan_su_id: number;
  phong_ids: number[];
}): Promise<SyncHrNhanSuPhongResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const sid = Number(payload.nhan_su_id);
  if (!Number.isFinite(sid) || sid <= 0) {
    return { ok: false, error: "ID nhân sự không hợp lệ." };
  }

  const ids = [...new Set(payload.phong_ids.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0))];

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const { error: delErr } = await supabase.from("hr_nhan_su_phong").delete().eq("nhan_su_id", sid);
  if (delErr) {
    return { ok: false, error: delErr.message || "Không xóa được phòng cũ." };
  }

  if (ids.length > 0) {
    const rows = ids.map((phong_id) => ({ nhan_su_id: sid, phong_id }));
    const { error: insErr } = await supabase.from("hr_nhan_su_phong").insert(rows);
    if (insErr) {
      return { ok: false, error: insErr.message || "Không ghi được phòng mới." };
    }
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type UpdateNhanSuLuongLienHeResult = { ok: true } | { ok: false; error: string };

/** Cập nhật lương / hệ số / nghỉ phép + liên hệ & HĐ (`hr_nhan_su`). Cột BHXH trong DB là `BHXH`. */
export type NhanSuLuongLienHePayload = {
  id: number;
  luong_co_ban: number | null;
  tro_cap: number | null;
  bhxh: number | null;
  rate_thuong_co_ban: number | null;
  rate_thuong_hoc_vien: number | null;
  so_buoi_nghi_toi_da: number | null;
  sdt: string | null;
  email: string | null;
  facebook: string | null;
  bank_name: string | null;
  bank_stk: string | null;
  stk_nhan_luong: string | null;
  hop_dong_lao_dong: string | null;
};

export async function updateNhanSuLuongVaLienHe(
  payload: NhanSuLuongLienHePayload
): Promise<UpdateNhanSuLuongLienHeResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "ID nhân sự không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const trimOrNull = (s: string | null): string | null =>
    s != null && s.trim() !== "" ? s.trim() : null;

  const body: Record<string, unknown> = {
    luong_co_ban: payload.luong_co_ban,
    tro_cap: payload.tro_cap,
    rate_thuong_co_ban: payload.rate_thuong_co_ban,
    rate_thuong_hoc_vien: payload.rate_thuong_hoc_vien,
    so_buoi_nghi_toi_da: payload.so_buoi_nghi_toi_da,
    sdt: trimOrNull(payload.sdt),
    email: trimOrNull(payload.email),
    facebook: trimOrNull(payload.facebook),
    bank_name: trimOrNull(payload.bank_name),
    bank_stk: trimOrNull(payload.bank_stk),
    stk_nhan_luong: trimOrNull(payload.stk_nhan_luong),
    hop_dong_lao_dong: trimOrNull(payload.hop_dong_lao_dong),
  };
  body.BHXH = payload.bhxh;

  const { error } = await supabase.from("hr_nhan_su").update(body).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được lương / liên hệ." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type UpdateNhanSuGiaoVienMetaResult = { ok: true } | { ok: false; error: string };

/** Portfolio / bio — ban Đào tạo (`hr_nhan_su`). */
export async function updateNhanSuGiaoVienMeta(payload: {
  id: number;
  portfolio: string[];
  bio: string | null;
  nam_kinh_nghiem: number | null;
}): Promise<UpdateNhanSuGiaoVienMetaResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "ID nhân sự không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const portfolio = payload.portfolio.map((u) => String(u).trim()).filter(Boolean);

  const body: Record<string, unknown> = {
    portfolio,
    bio: payload.bio != null && String(payload.bio).trim() !== "" ? String(payload.bio).trim() : null,
    nam_kinh_nghiem: payload.nam_kinh_nghiem,
  };

  const { error } = await supabase.from("hr_nhan_su").update(body).eq("id", id);
  if (error) {
    return { ok: false, error: error.message || "Không cập nhật được hồ sơ giáo viên." };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
  return { ok: true };
}

export type CreateBangTinhLuongResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

/** Bước 1 Framer `VH_Bang_tinh_luong`: tạo `hr_bang_tinh_luong` (nhan_vien + tạm ứng + thưởng). */
export async function createHrBangTinhLuong(payload: {
  nhan_vien_id: number;
  tam_ung?: number | null;
  thuong?: number | null;
}): Promise<CreateBangTinhLuongResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const nv = Number(payload.nhan_vien_id);
  if (!Number.isFinite(nv) || nv <= 0) {
    return { ok: false, error: "ID nhân viên không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const body: Record<string, unknown> = { nhan_vien: nv };
  if (payload.tam_ung != null) {
    const tu = Number(payload.tam_ung);
    if (Number.isFinite(tu) && tu >= 0) body.tam_ung = tu;
  }
  if (payload.thuong != null) {
    const th = Number(payload.thuong);
    if (Number.isFinite(th) && th >= 0) body.thuong = th;
  }

  const { data, error } = await supabase.from("hr_bang_tinh_luong").insert(body).select("id").maybeSingle();
  if (error) {
    return { ok: false, error: error.message || "Không tạo được bảng lương." };
  }
  const id = data != null && typeof data === "object" && "id" in data ? Number((data as { id: unknown }).id) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "Không nhận được ID bảng lương sau khi tạo." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true, id };
}

export type CreateLichDiemDanhResult =
  | { ok: true; tong_so_buoi_nghi_trong_nam: number }
  | { ok: false; error: string };

/** Bước 2 Framer: tạo `hr_lich_diem_danh` gắn `bang_tinh_luong`. */
export async function createHrLichDiemDanhChoBang(payload: {
  bang_tinh_luong_id: number;
  nhan_vien_id: number;
  thang: string;
  nam: string;
  so_buoi_lam_viec: number;
  tong_buoi_lam_viec_trong_thang?: number | null;
  so_buoi_nghi_trong_thang?: number | null;
}): Promise<CreateLichDiemDanhResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const bangId = Number(payload.bang_tinh_luong_id);
  const nv = Number(payload.nhan_vien_id);
  if (!Number.isFinite(bangId) || bangId <= 0 || !Number.isFinite(nv) || nv <= 0) {
    return { ok: false, error: "Tham số bảng lương / nhân viên không hợp lệ." };
  }

  const thang = payload.thang?.trim() ?? "";
  const nam = payload.nam?.trim() ?? "";
  if (!thang || !nam) {
    return { ok: false, error: "Chọn tháng và năm." };
  }

  const soLam = Number(payload.so_buoi_lam_viec);
  if (!Number.isFinite(soLam) || soLam < 0) {
    return { ok: false, error: "Số buổi làm việc không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const body: Record<string, unknown> = {
    bang_tinh_luong: bangId,
    nhan_vien: nv,
    thang,
    nam,
    so_buoi_lam_viec: soLam,
  };

  const tq = payload.tong_buoi_lam_viec_trong_thang;
  if (tq != null && String(tq).trim() !== "" && Number.isFinite(Number(tq)) && Number(tq) >= 0) {
    body.tong_buoi_lam_viec_trong_thang = Math.round(Number(tq));
  }
  const sn = payload.so_buoi_nghi_trong_thang;
  if (sn != null && String(sn).trim() !== "" && Number.isFinite(Number(sn)) && Number(sn) >= 0) {
    body.so_buoi_nghi_trong_thang = Math.round(Number(sn));
  }

  const { error } = await supabase.from("hr_lich_diem_danh").insert(body);
  if (error) {
    return { ok: false, error: error.message || "Không tạo được lịch điểm danh." };
  }

  let tongNam = 0;
  const { data: yearRows, error: yearErr } = await supabase
    .from("hr_lich_diem_danh")
    .select("so_buoi_nghi_trong_thang")
    .eq("nhan_vien", nv)
    .eq("nam", nam);
  if (yearErr) {
    return { ok: false, error: yearErr.message || "Không đọc được tổng nghỉ trong năm." };
  }
  for (const yr of yearRows ?? []) {
    const v =
      yr != null && typeof yr === "object" && "so_buoi_nghi_trong_thang" in yr
        ? (yr as { so_buoi_nghi_trong_thang: unknown }).so_buoi_nghi_trong_thang
        : null;
    if (v == null || !Number.isFinite(Number(v))) continue;
    const n = Math.trunc(Number(v));
    if (n > 0) tongNam += n;
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true, tong_so_buoi_nghi_trong_nam: tongNam };
}

export type DeleteBangTinhLuongResult = { ok: true } | { ok: false; error: string };

/**
 * Giống Framer `deleteBangLuongFull`: xóa mọi `hr_lich_diem_danh` gắn `bang_tinh_luong`, rồi xóa `hr_bang_tinh_luong`.
 */
export async function deleteHrBangTinhLuongFull(bang_tinh_luong_id: number): Promise<DeleteBangTinhLuongResult> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };
  }

  const id = Number(bang_tinh_luong_id);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "ID bảng lương không hợp lệ." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Thiếu cấu hình Supabase trên server." };
  }

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { error: delDdErr } = await supabase.from("hr_lich_diem_danh").delete().eq("bang_tinh_luong", id);
  if (delDdErr) {
    return { ok: false, error: delDdErr.message || "Không xóa được lịch điểm danh." };
  }

  const { error: delBlErr } = await supabase.from("hr_bang_tinh_luong").delete().eq("id", id);
  if (delBlErr) {
    return { ok: false, error: delBlErr.message || "Không xóa được bảng lương." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function fetchQuanLyNhanSuBundleAction(): Promise<
  | { ok: true; bundle: QuanLyNhanSuViewBundle }
  | { ok: false; error: string }
> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ. Đăng nhập lại." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase trên server." };

  const raw = await fetchAdminQuanLyNhanSuBundle(supabase);
  if (raw.error) return { ok: false, error: raw.error };

  const bundle: QuanLyNhanSuViewBundle = {
    staff: raw.staff,
    chiNhanhById: raw.chiNhanhById,
    banById: raw.banById,
    phongBanByStaffId: raw.phongBanByStaffId,
    phongIdsByStaffId: raw.phongIdsByStaffId,
    allPhongOptions: raw.allPhongOptions,
    phongToBanId: raw.phongToBanId,
    banIdsByStaffId: raw.banIdsByStaffId,
    bangTinhLuongByStaffId: raw.bangTinhLuongByStaffId,
    lopGiangByTeacherId: raw.lopGiangByTeacherId,
    usedMinimalSelect: raw.usedMinimalSelect,
  };

  return { ok: true, bundle };
}
