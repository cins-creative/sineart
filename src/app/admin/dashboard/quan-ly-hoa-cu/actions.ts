"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/quan-ly-hoa-cu";

export type HoaCuActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function createHoaCuSanPham(input: {
  ten_hang: string;
  loai_san_pham: string | null;
  gia_nhap: number;
  gia_ban: number;
  thumbnail: string | null;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ten_hang = input.ten_hang.trim();
  if (!ten_hang) return { ok: false, error: "Nhập tên hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("hc_danh_sach_san_pham").insert({
    ten_hang,
    loai_san_pham: input.loai_san_pham?.trim() || null,
    gia_nhap: Math.max(0, input.gia_nhap),
    gia_ban: Math.max(0, input.gia_ban),
    thumbnail: input.thumbnail?.trim() || null,
  });

  if (error) return { ok: false, error: error.message || "Không thêm được mặt hàng." };

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã thêm mặt hàng." };
}

export async function createHoaCuDonNhap(input: {
  nguoi_nhap: number;
  nha_cung_cap: string | null;
  lines: { mat_hang: number; so_luong_nhap: number }[];
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.nguoi_nhap) || input.nguoi_nhap <= 0) {
    return { ok: false, error: "Chọn người nhập." };
  }
  const lines = input.lines.filter((l) => l.mat_hang > 0 && l.so_luong_nhap > 0);
  if (!lines.length) return { ok: false, error: "Thêm ít nhất một dòng hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: don, error: e1 } = await supabase
    .from("hc_nhap_hoa_cu")
    .insert({
      nguoi_nhap: input.nguoi_nhap,
      nha_cung_cap: input.nha_cung_cap?.trim() || null,
    })
    .select("id")
    .single();

  if (e1 || !don?.id) return { ok: false, error: e1?.message || "Không tạo được đơn nhập." };

  const donId = Number(don.id);
  for (const l of lines) {
    const { error: e2 } = await supabase.from("hc_nhap_hoa_cu_chi_tiet").insert({
      don_nhap: donId,
      mat_hang: l.mat_hang,
      so_luong_nhap: Math.max(1, Math.trunc(l.so_luong_nhap)),
    });
    if (e2) return { ok: false, error: e2.message || "Lỗi chi tiết đơn nhập." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã lưu đơn nhập." };
}

export async function createHoaCuDonBan(input: {
  nguoi_ban: number;
  khach_hang: number;
  hinh_thuc_thu: string;
  lines: { mat_hang: number; so_luong_ban: number }[];
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.nguoi_ban) || input.nguoi_ban <= 0) return { ok: false, error: "Chọn người bán." };
  if (!Number.isFinite(input.khach_hang) || input.khach_hang <= 0) {
    return { ok: false, error: "Chọn khách hàng (học viên)." };
  }
  const lines = input.lines.filter((l) => l.mat_hang > 0 && l.so_luong_ban > 0);
  if (!lines.length) return { ok: false, error: "Thêm ít nhất một dòng hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: tonRows } = await supabase.from("hc_danh_sach_san_pham").select("id, ton_kho").in(
    "id",
    lines.map((l) => l.mat_hang)
  );
  const tonMap = new Map((tonRows ?? []).map((r) => [Number((r as { id: unknown }).id), Number((r as { ton_kho: unknown }).ton_kho) || 0]));

  for (const l of lines) {
    const t = tonMap.get(l.mat_hang) ?? 0;
    if (t > 0 && l.so_luong_ban > t) {
      return { ok: false, error: `Mặt hàng #${l.mat_hang} chỉ còn ${t} trong kho.` };
    }
  }

  const { data: don, error: e1 } = await supabase
    .from("hc_don_ban_hoa_cu")
    .insert({
      nguoi_ban: input.nguoi_ban,
      khach_hang: input.khach_hang,
      hinh_thuc_thu: input.hinh_thuc_thu.trim() || "Tiền mặt",
    })
    .select("id")
    .single();

  if (e1 || !don?.id) return { ok: false, error: e1?.message || "Không tạo được đơn bán." };

  const donId = Number(don.id);
  for (const l of lines) {
    const { error: e2 } = await supabase.from("hc_ban_hc_chi_tiet").insert({
      don_ban: donId,
      mat_hang: l.mat_hang,
      so_luong_ban: Math.max(1, Math.trunc(l.so_luong_ban)),
    });
    if (e2) return { ok: false, error: e2.message || "Lỗi chi tiết đơn bán." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã lưu đơn bán." };
}
