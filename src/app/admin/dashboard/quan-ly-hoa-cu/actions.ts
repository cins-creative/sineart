"use server";

import { revalidatePath } from "next/cache";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/quan-ly-hoa-cu";

export type HoaCuActionResult = { ok: true; message?: string } | { ok: false; error: string };

function numMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function refreshNhapDonTongTien(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  donNhapId: number
): Promise<{ ok: false; error: string } | { ok: true }> {
  const { data, error } = await supabase
    .from("hc_nhap_hoa_cu_chi_tiet")
    .select("thanh_tien")
    .eq("don_nhap", donNhapId);
  if (error) return { ok: false, error: error.message };
  const sum = (data ?? []).reduce((s, row) => s + numMoney((row as { thanh_tien?: unknown }).thanh_tien), 0);
  const { error: uErr } = await supabase.from("hc_nhap_hoa_cu").update({ tong_tien: sum }).eq("id", donNhapId);
  if (uErr) return { ok: false, error: uErr.message };
  return { ok: true };
}

async function refreshBanDonTongTien(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  donBanId: number
): Promise<{ ok: false; error: string } | { ok: true }> {
  const { data, error } = await supabase
    .from("hc_ban_hc_chi_tiet")
    .select("thanh_tien")
    .eq("don_ban", donBanId);
  if (error) return { ok: false, error: error.message };
  const sum = (data ?? []).reduce((s, row) => s + numMoney((row as { thanh_tien?: unknown }).thanh_tien), 0);
  const { error: uErr } = await supabase.from("hc_don_ban_hoa_cu").update({ tong_tien: sum }).eq("id", donBanId);
  if (uErr) return { ok: false, error: uErr.message };
  return { ok: true };
}

async function rollbackNhapDon(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  donNhapId: number
): Promise<void> {
  await supabase.from("hc_nhap_hoa_cu_chi_tiet").delete().eq("don_nhap", donNhapId);
  await supabase.from("hc_nhap_hoa_cu").delete().eq("id", donNhapId);
}

async function rollbackBanDon(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  donBanId: number
): Promise<void> {
  await supabase.from("hc_ban_hc_chi_tiet").delete().eq("don_ban", donBanId);
  await supabase.from("hc_don_ban_hoa_cu").delete().eq("id", donBanId);
}

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
  const matIds = [...new Set(lines.map((l) => l.mat_hang))];
  const { data: priceRows, error: priceErr } = await supabase
    .from("hc_danh_sach_san_pham")
    .select("id, gia_nhap")
    .in("id", matIds);
  if (priceErr) {
    await rollbackNhapDon(supabase, donId);
    return { ok: false, error: priceErr.message || "Không đọc được giá nhập kho." };
  }
  const giaNhapByMat = new Map<number, number>();
  for (const r of priceRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    if (Number.isFinite(id) && id > 0) giaNhapByMat.set(id, numMoney((r as { gia_nhap?: unknown }).gia_nhap));
  }

  for (const l of lines) {
    const qty = Math.max(1, Math.trunc(l.so_luong_nhap));
    const giaSnap = giaNhapByMat.get(l.mat_hang) ?? 0;
    const thanhTien = giaSnap * qty;
    const { error: e2 } = await supabase.from("hc_nhap_hoa_cu_chi_tiet").insert({
      don_nhap: donId,
      mat_hang: l.mat_hang,
      so_luong_nhap: qty,
      gia_nhap_snapshot: giaSnap,
      thanh_tien: thanhTien,
    });
    if (e2) {
      await rollbackNhapDon(supabase, donId);
      return { ok: false, error: e2.message || "Lỗi chi tiết đơn nhập." };
    }
  }

  const refreshed = await refreshNhapDonTongTien(supabase, donId);
  if (!refreshed.ok) {
    await rollbackNhapDon(supabase, donId);
    return { ok: false, error: refreshed.error || "Không cập nhật tổng phiếu nhập." };
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

  const matIds = [...new Set(lines.map((l) => l.mat_hang))];
  const { data: tonRows } = await supabase
    .from("hc_danh_sach_san_pham")
    .select("id, ton_kho, gia_nhap, gia_ban")
    .in("id", matIds);
  const tonMap = new Map(
    (tonRows ?? []).map((r) => [Number((r as { id: unknown }).id), Number((r as { ton_kho: unknown }).ton_kho) || 0])
  );
  const priceByMat = new Map<number, { gia_nhap: number; gia_ban: number }>();
  for (const r of tonRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    priceByMat.set(id, {
      gia_nhap: numMoney((r as { gia_nhap?: unknown }).gia_nhap),
      gia_ban: numMoney((r as { gia_ban?: unknown }).gia_ban),
    });
  }

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
    const qty = Math.max(1, Math.trunc(l.so_luong_ban));
    const pr = priceByMat.get(l.mat_hang);
    const giaBanSnap = pr?.gia_ban ?? 0;
    const giaNhapSnap = pr?.gia_nhap ?? 0;
    const thanhTien = giaBanSnap * qty;
    const { error: e2 } = await supabase.from("hc_ban_hc_chi_tiet").insert({
      don_ban: donId,
      mat_hang: l.mat_hang,
      so_luong_ban: qty,
      gia_ban_snapshot: giaBanSnap,
      gia_nhap_snapshot: giaNhapSnap,
      thanh_tien: thanhTien,
    });
    if (e2) {
      await rollbackBanDon(supabase, donId);
      return { ok: false, error: e2.message || "Lỗi chi tiết đơn bán." };
    }
  }

  const refreshed = await refreshBanDonTongTien(supabase, donId);
  if (!refreshed.ok) {
    await rollbackBanDon(supabase, donId);
    return { ok: false, error: refreshed.error || "Không cập nhật tổng đơn bán." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true, message: "Đã lưu đơn bán." };
}
