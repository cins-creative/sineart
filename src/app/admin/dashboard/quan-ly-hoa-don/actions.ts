"use server";

import { revalidatePath } from "next/cache";

import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REV = "/admin/dashboard/quan-ly-hoa-don";

function revalidate(): void {
  revalidatePath(REV);
}

export type HoaDonActionState = { ok: true; message?: string } | { ok: false; error: string };

function sliceIsoDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const STATUS_VALUES = ["Chờ thanh toán", "Đã thanh toán", "Đã hủy"] as const;

export async function updateHpDonThu(
  donId: number,
  payload: {
    status: string;
    hinh_thuc_thu: string | null;
    ngay_thanh_toan: string | null;
    giam_gia_dong: number | null;
  }
): Promise<HoaDonActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };

  const st = String(payload.status ?? "").trim();
  if (!STATUS_VALUES.includes(st as (typeof STATUS_VALUES)[number])) {
    return { ok: false, error: "Trạng thái không hợp lệ." };
  }

  const ngayTT = sliceIsoDate(payload.ngay_thanh_toan ?? undefined);
  if (payload.ngay_thanh_toan != null && String(payload.ngay_thanh_toan).trim() !== "" && ngayTT == null) {
    return { ok: false, error: "Ngày thanh toán không hợp lệ (YYYY-MM-DD)." };
  }

  const giam =
    payload.giam_gia_dong != null && Number.isFinite(payload.giam_gia_dong) && payload.giam_gia_dong >= 0
      ? Math.round(payload.giam_gia_dong)
      : null;

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const ht =
    payload.hinh_thuc_thu != null && String(payload.hinh_thuc_thu).trim() !== ""
      ? String(payload.hinh_thuc_thu).trim()
      : null;

  const { error } = await supabase
    .from("hp_don_thu_hoc_phi")
    .update({
      status: st,
      hinh_thuc_thu: ht,
      ngay_thanh_toan: ngayTT,
      giam_gia: giam,
    })
    .eq("id", donId);

  if (error) return { ok: false, error: error.message || "Không lưu được đơn." };
  revalidate();
  return { ok: true };
}

export async function deleteHpDonThu(donId: number): Promise<HoaDonActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const delOk = await assertStaffMayDeleteRecords(supabase, session.staffId);
  if (!delOk.ok) return { ok: false, error: delOk.error };

  const { error: cErr } = await supabase.from("hp_thu_hp_chi_tiet").delete().eq("don_thu", donId);
  if (cErr) return { ok: false, error: cErr.message || "Không xóa được chi tiết đơn." };

  const { error: dErr } = await supabase.from("hp_don_thu_hoc_phi").delete().eq("id", donId);
  if (dErr) return { ok: false, error: dErr.message || "Không xóa được đơn." };

  revalidate();
  return { ok: true };
}

export async function updateHpChiTietLine(
  chiId: number,
  payload: {
    ngay_dau_ky: string | null;
    ngay_cuoi_ky: string | null;
    status: string | null;
    hoc_phi_goi_dong: number | null;
    goi_hoc_phi_id: number | null;
  }
): Promise<HoaDonActionState> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(chiId) || chiId <= 0) return { ok: false, error: "ID dòng chi tiết không hợp lệ." };

  const dau = sliceIsoDate(payload.ngay_dau_ky ?? undefined);
  const cuoi = sliceIsoDate(payload.ngay_cuoi_ky ?? undefined);
  if (payload.ngay_dau_ky != null && String(payload.ngay_dau_ky).trim() !== "" && dau == null) {
    return { ok: false, error: "Ngày đầu kỳ không hợp lệ (YYYY-MM-DD)." };
  }
  if (payload.ngay_cuoi_ky != null && String(payload.ngay_cuoi_ky).trim() !== "" && cuoi == null) {
    return { ok: false, error: "Ngày cuối kỳ không hợp lệ (YYYY-MM-DD)." };
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

  const st = payload.status != null && String(payload.status).trim() !== "" ? String(payload.status).trim() : null;

  const { error: uChi } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .update({
      ngay_dau_ky: dau,
      ngay_cuoi_ky: cuoi,
      status: st,
    })
    .eq("id", chiId);

  if (uChi) return { ok: false, error: uChi.message || "Không lưu được dòng chi tiết." };

  const goiId = payload.goi_hoc_phi_id;
  if (
    goiId != null &&
    Number.isFinite(goiId) &&
    goiId > 0 &&
    payload.hoc_phi_goi_dong != null &&
    Number.isFinite(payload.hoc_phi_goi_dong) &&
    payload.hoc_phi_goi_dong >= 0
  ) {
    const goiTable = hpGoiHocPhiTableName();
    const dong = Math.round(payload.hoc_phi_goi_dong);
    const goiPatch =
      goiTable === "hp_goi_hoc_phi"
        ? { hoc_phi: dong }
        : { gia_goc: dong, discount: 0 };
    const { error: uGoi } = await supabase.from(goiTable).update(goiPatch).eq("id", goiId);
    if (uGoi) return { ok: false, error: uGoi.message || "Không cập nhật được gói học phí." };
  }

  revalidate();
  return { ok: true };
}
