"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { TC_TAI_SAN_TABLE } from "@/lib/data/admin-gia-tri-tai-san";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PATH = "/admin/dashboard/gia-tri-tai-san";
const OVERVIEW_PATH = "/admin/dashboard/overview";

export type AddTaiSanResult = { ok: true } | { ok: false; error: string };

function parseMoneyVND(raw: string): { value: number; ok: true } | { ok: false } {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
  if (cleaned === "") return { value: 0, ok: true };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { value: n, ok: true };
}

export async function addTaiSanAsset(formData: FormData): Promise<AddTaiSanResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ten_tai_san = String(formData.get("ten_tai_san") ?? "").trim();
  if (!ten_tai_san) return { ok: false, error: "Vui lòng nhập tên tài sản." };
  if (ten_tai_san.length > 500) return { ok: false, error: "Tên tài sản quá dài." };

  const loaiRaw = String(formData.get("loai_tai_san") ?? "").trim();
  const loai_tai_san = loaiRaw || null;

  const ngayRaw = String(formData.get("ngay_mua") ?? "").trim();
  const ngay_mua = ngayRaw || null;

  const giaParsed = parseMoneyVND(String(formData.get("gia_tri_moi_mua") ?? ""));
  if (!giaParsed.ok) return { ok: false, error: "Nguyên giá không hợp lệ." };
  const gia_tri_moi_mua = giaParsed.value;

  const thRaw = String(formData.get("thoi_gian_khau_hao") ?? "").trim();
  let thoi_gian_khau_hao: number | null = null;
  if (thRaw !== "") {
    const n = Number(thRaw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return { ok: false, error: "Thời gian khấu hao phải là số tháng nguyên (≥ 0)." };
    }
    thoi_gian_khau_hao = n;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { error } = await supabase.from(TC_TAI_SAN_TABLE).insert({
    ten_tai_san,
    loai_tai_san,
    ngay_mua,
    gia_tri_moi_mua,
    thoi_gian_khau_hao,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || `Không thêm được vào ${TC_TAI_SAN_TABLE}. Kiểm tra quyền và dữ liệu.`,
    };
  }

  revalidatePath(PATH);
  revalidatePath(OVERVIEW_PATH);
  return { ok: true };
}
