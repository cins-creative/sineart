"use server";

import { revalidatePath } from "next/cache";

import { assertStaffMayDeleteRecords } from "@/lib/admin/admin-delete-permission";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchAllHoaCuSanPham, fetchKhoInventoryStats, fetchKhoSanPhamPage, fetchTonKhoTheoPhieuForIds, type AdminHoaCuSanPham } from "@/lib/data/admin-hoa-cu";
import { fetchAdminChiNhanhOptions } from "@/lib/data/admin-chi-nhanh";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ADMIN_PATH = "/admin/dashboard/quan-ly-hoa-cu";

export type HoaCuActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type HoaCuCreateDonBanResult =
  | {
      ok: true;
      donId: number;
      maDon: string;
      maDonSo: string;
      tongTien: number;
      status: string;
      message?: string;
    }
  | { ok: false; error: string };

async function gateHoaCuDonMutate(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  staffId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return assertStaffMayDeleteRecords(supabase, staffId);
}

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

function mergeNhapLines(lines: { mat_hang: number; so_luong_nhap: number }[]) {
  const m = new Map<number, number>();
  for (const l of lines) {
    const id = l.mat_hang;
    if (!Number.isFinite(id) || id <= 0) continue;
    const q = Math.max(1, Math.trunc(l.so_luong_nhap));
    if (!Number.isFinite(q) || q <= 0) continue;
    m.set(id, (m.get(id) ?? 0) + q);
  }
  return [...m.entries()].map(([mat_hang, so_luong_nhap]) => ({ mat_hang, so_luong_nhap }));
}

function mergeBanLines(lines: { mat_hang: number; so_luong_ban: number }[]) {
  const m = new Map<number, number>();
  for (const l of lines) {
    const id = l.mat_hang;
    if (!Number.isFinite(id) || id <= 0) continue;
    const q = Math.max(1, Math.trunc(l.so_luong_ban));
    if (!Number.isFinite(q) || q <= 0) continue;
    m.set(id, (m.get(id) ?? 0) + q);
  }
  return [...m.entries()].map(([mat_hang, so_luong_ban]) => ({ mat_hang, so_luong_ban }));
}

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err != null && (err as { code?: string }).code === "23505";
}

async function assertMatHangThuocChiNhanh(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  matIds: number[],
  chi_nhanh_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("hc_danh_sach_san_pham").select("id, ten_hang, chi_nhanh_id").in("id", matIds);
  if (error) return { ok: false, error: error.message || "Không đọc được danh mục mặt hàng." };
  const byId = new Map<number, { ten_hang: string; chi_nhanh_id: number | null }>();
  for (const r of data ?? []) {
    const id = Number((r as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    byId.set(id, {
      ten_hang: String((r as { ten_hang?: unknown }).ten_hang ?? "").trim() || `#${id}`,
      chi_nhanh_id:
        (r as { chi_nhanh_id?: unknown }).chi_nhanh_id != null && Number.isFinite(Number((r as { chi_nhanh_id?: unknown }).chi_nhanh_id))
          ? Number((r as { chi_nhanh_id?: unknown }).chi_nhanh_id)
          : null,
    });
  }
  for (const id of matIds) {
    const sp = byId.get(id);
    if (!sp) return { ok: false, error: `Mặt hàng #${id} không tồn tại.` };
    if (sp.chi_nhanh_id != null && sp.chi_nhanh_id !== chi_nhanh_id) {
      return { ok: false, error: `«${sp.ten_hang}» không thuộc chi nhánh đã chọn.` };
    }
  }
  return { ok: true };
}

function chiNhanhColumnHint(msg: string): string | null {
  const m = msg.toLowerCase();
  if (m.includes("chi_nhanh_id") || (m.includes("column") && m.includes("chi_nhanh"))) {
    return "Chưa có cột chi_nhanh_id trên phiếu. Chạy scripts/sql/hc-don-nhap-ban-chi-nhanh-id.sql trong Supabase SQL Editor.";
  }
  return null;
}

function isHcThanhToanColumnError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("ma_don") || m.includes("status") || (m.includes("column") && m.includes("ngay_thanh_toan"));
}

function supabaseProjectRefFromEnv(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.CINS_NEXT_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

function hcThanhToanColumnHint(msg: string): string | null {
  if (!isHcThanhToanColumnError(msg)) return null;
  const ref = supabaseProjectRefFromEnv();
  const editor = ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : "Supabase SQL Editor";
  return `Chưa có cột thanh toán trên đơn bán (ma_don, ma_don_so, status, ngay_thanh_toan). Mở ${editor}, dán nội dung file scripts/sql/hc-don-ban-thanh-toan.sql và bấm Run.`;
}

function isHcChuyenKhoan(hinhThuc: string): boolean {
  return hinhThuc.trim() === "Chuyển khoản";
}

function hcDonCodesFromId(donId: number): { ma_don: string; ma_don_so: string } {
  const ma_don_so = `SC${String(donId).padStart(6, "0").slice(-6)}`;
  const ma_don = `HC-${String(donId).padStart(8, "0")}`;
  return { ma_don, ma_don_so };
}

function extractMaDonSoFromTxContent(content: string): string | null {
  const m = content.match(/(?:SA|SC)\d{6}/i);
  return m ? m[0].toUpperCase() : null;
}

/** Đối soát SePay đã log nhưng webhook chưa cập nhật đơn (vd. worker chưa deploy bản SC). */
async function trySyncHcDonBanFromSepay(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  donId: number,
  maDonSo: string | null,
  tongTien: number,
): Promise<boolean> {
  const code = maDonSo?.trim().toUpperCase();
  if (!code || !/^SC\d{6}$/.test(code)) return false;

  const { data: txs, error } = await supabase
    .from("hp_giao_dich_thanh_toan")
    .select("id, transfer_amount, content, ma_don_trich_xuat, transfer_type")
    .or(`ma_don_trich_xuat.eq.${code},content.ilike.%${code}%`)
    .order("transaction_date", { ascending: false })
    .limit(10);

  if (error || !txs?.length) return false;

  const expected = Math.max(0, Math.round(tongTien));
  const hit = txs.find((raw) => {
    const t = raw as Record<string, unknown>;
    const transferType = t.transfer_type != null ? String(t.transfer_type) : "in";
    if (transferType !== "in") return false;
    const amt = Math.round(Number(t.transfer_amount) || 0);
    if (expected > 0 && amt !== expected) return false;
    const extracted =
      (t.ma_don_trich_xuat != null ? String(t.ma_don_trich_xuat).trim().toUpperCase() : "") ||
      extractMaDonSoFromTxContent(String(t.content ?? "")) ||
      "";
    return extracted === code || String(t.content ?? "").toUpperCase().includes(code);
  });

  if (!hit) return false;

  const today = new Date().toISOString().slice(0, 10);
  const { error: uErr } = await supabase
    .from("hc_don_ban_hoa_cu")
    .update({ status: "Đã thanh toán", ngay_thanh_toan: today })
    .eq("id", donId);

  if (uErr) return false;

  const txId = Number((hit as { id?: unknown }).id);
  const txMa = (hit as { ma_don_trich_xuat?: unknown }).ma_don_trich_xuat;
  if (Number.isFinite(txId) && txId > 0 && !String(txMa ?? "").trim()) {
    await supabase.from("hp_giao_dich_thanh_toan").update({ ma_don_trich_xuat: code }).eq("id", txId);
  }

  return true;
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

async function rollbackChuyenDon(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  donChuyenId: number,
): Promise<void> {
  await supabase.from("hc_chuyen_kho_chi_tiet").delete().eq("don_chuyen", donChuyenId);
  await supabase.from("hc_chuyen_kho").delete().eq("id", donChuyenId);
}

function mergeChuyenLines(lines: { mat_hang_nguon: number; so_luong: number }[]) {
  const m = new Map<number, number>();
  for (const l of lines) {
    const id = l.mat_hang_nguon;
    if (!Number.isFinite(id) || id <= 0) continue;
    const q = Math.max(1, Math.trunc(l.so_luong));
    m.set(id, (m.get(id) ?? 0) + q);
  }
  return [...m.entries()].map(([mat_hang_nguon, so_luong]) => ({ mat_hang_nguon, so_luong }));
}

async function findOrCreateDestSanPham(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  src: {
    id: number;
    ten_hang: string;
    loai_san_pham: string | null;
    gia_nhap: number;
    gia_ban: number;
    thumbnail: string | null;
    chi_nhanh_id: number | null;
  },
  destChiNhanhId: number,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const ten = src.ten_hang.trim();
  const { data: existing } = await supabase
    .from("hc_danh_sach_san_pham")
    .select("id")
    .eq("chi_nhanh_id", destChiNhanhId)
    .ilike("ten_hang", ten)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true, id: Number(existing.id) };

  const { data: created, error } = await supabase
    .from("hc_danh_sach_san_pham")
    .insert({
      ten_hang: ten,
      loai_san_pham: src.loai_san_pham?.trim() || null,
      gia_nhap: Math.max(0, src.gia_nhap),
      gia_ban: Math.max(0, src.gia_ban),
      thumbnail: src.thumbnail?.trim() || null,
      chi_nhanh_id: destChiNhanhId,
    })
    .select("id")
    .single();
  if (error || !created?.id) {
    return { ok: false, error: error?.message || "Không tạo được mặt hàng ở chi nhánh đích." };
  }
  return { ok: true, id: Number(created.id) };
}

export async function createHoaCuSanPham(input: {
  ten_hang: string;
  loai_san_pham: string | null;
  gia_nhap: number;
  gia_ban: number;
  thumbnail: string | null;
  chi_nhanh_id: number;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const ten_hang = input.ten_hang.trim();
  if (!ten_hang) return { ok: false, error: "Nhập tên hàng." };
  if (!Number.isFinite(input.chi_nhanh_id) || input.chi_nhanh_id <= 0) {
    return { ok: false, error: "Chọn chi nhánh kho." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase.from("hc_danh_sach_san_pham").insert({
    ten_hang,
    loai_san_pham: input.loai_san_pham?.trim() || null,
    gia_nhap: Math.max(0, input.gia_nhap),
    gia_ban: Math.max(0, input.gia_ban),
    thumbnail: input.thumbnail?.trim() || null,
    chi_nhanh_id: input.chi_nhanh_id,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("chi_nhanh_id") || msg.includes("column")) {
      return {
        ok: false,
        error: "Chưa có cột chi_nhanh_id. Chạy scripts/sql/hc-danh-sach-chi-nhanh-id.sql trong Supabase SQL Editor.",
      };
    }
    return { ok: false, error: error.message || "Không thêm được mặt hàng." };
  }

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã thêm mặt hàng." };
}

/** Toàn bộ danh mục cho modal nhập/bán khi trang kho không tải trước full list. */
export async function loadHoaCuSanPhamCatalogAction(
  chi_nhanh_id?: number | null,
): Promise<{ ok: true; data: AdminHoaCuSanPham[] } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };
  const branchRes = await fetchAdminChiNhanhOptions(supabase);
  const branchNames = new Map(branchRes.options.map((b) => [b.id, b.ten]));
  const { data, error } = await fetchAllHoaCuSanPham(supabase, {
    chi_nhanh_id: chi_nhanh_id ?? undefined,
    branchNames,
  });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export type LoadKhoPageActionResult =
  | {
      ok: true;
      rows: AdminHoaCuSanPham[];
      page: number;
      pageSize: number;
      total: number;
      inventoryTotal: number;
      inventoryHetHang: number;
      inventoryTonSum: number;
    }
  | { ok: false; error: string };

/** Tải lại kho theo chi nhánh — chỉ query kho, không load lại staff/học viên (dùng khi đổi filter). */
export async function loadKhoPageAction(input: {
  chi_nhanh_id: number;
  page?: number;
  q?: string;
}): Promise<LoadKhoPageActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  const branchId = input.chi_nhanh_id;
  if (!Number.isFinite(branchId) || branchId <= 0) {
    return { ok: false, error: "Chọn chi nhánh kho." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const branchRes = await fetchAdminChiNhanhOptions(supabase);
  const branchNames = new Map(branchRes.options.map((b) => [b.id, b.ten]));
  const page = Math.max(1, Math.floor(Number(input.page)) || 1);
  const q = (input.q ?? "").trim() || undefined;

  const [kho, inv] = await Promise.all([
    fetchKhoSanPhamPage(supabase, { page, q, chi_nhanh_id: branchId, branchNames }),
    fetchKhoInventoryStats(supabase, { chi_nhanh_id: branchId }),
  ]);

  if (!kho.ok) return { ok: false, error: kho.error };

  return {
    ok: true,
    rows: kho.rows,
    page: kho.page,
    pageSize: kho.pageSize,
    total: kho.total,
    inventoryTotal: inv.total,
    inventoryHetHang: inv.hetHang,
    inventoryTonSum: inv.tonSum,
  };
}

export type AdminHoaCuNhapChiTietLine = {
  mat_hang: number;
  ten_hang: string;
  thumbnail: string | null;
  so_luong_nhap: number;
  gia_nhap_snapshot: number;
  thanh_tien: number;
};

function unwrapJoinedSanPham(v: unknown): { ten_hang: string; thumbnail: string | null } {
  if (v == null) return { ten_hang: "—", thumbnail: null };
  const row = Array.isArray(v) ? v[0] : v;
  if (!row || typeof row !== "object") return { ten_hang: "—", thumbnail: null };
  const t = String((row as { ten_hang?: unknown }).ten_hang ?? "").trim();
  const thRaw = (row as { thumbnail?: unknown }).thumbnail;
  const thumbnail =
    typeof thRaw === "string" && thRaw.trim().length > 0 ? thRaw.trim() : null;
  return { ten_hang: t || "—", thumbnail };
}

/** Chi tiết dòng `hc_nhap_hoa_cu_chi_tiet` + tên mặt hàng (đọc khi mở modal xem phiếu). */
export async function loadHoaCuDonNhapChiTietAction(
  donId: number,
): Promise<{ ok: true; lines: AdminHoaCuNhapChiTietLine[] } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "Đơn nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data, error } = await supabase
    .from("hc_nhap_hoa_cu_chi_tiet")
    .select("mat_hang, so_luong_nhap, gia_nhap_snapshot, thanh_tien, hc_danh_sach_san_pham(ten_hang, thumbnail)")
    .eq("don_nhap", donId)
    .order("mat_hang", { ascending: true });

  if (error) return { ok: false, error: error.message || "Không đọc được chi tiết đơn nhập." };

  const lines: AdminHoaCuNhapChiTietLine[] = (data ?? []).map((raw) => {
    const r = raw as {
      mat_hang?: unknown;
      so_luong_nhap?: unknown;
      gia_nhap_snapshot?: unknown;
      thanh_tien?: unknown;
      hc_danh_sach_san_pham?: unknown;
    };
    const mh = Number(r.mat_hang);
    const sp = unwrapJoinedSanPham(r.hc_danh_sach_san_pham);
    return {
      mat_hang: Number.isFinite(mh) && mh > 0 ? mh : 0,
      ten_hang: Number.isFinite(mh) && mh > 0 ? sp.ten_hang : "—",
      thumbnail: Number.isFinite(mh) && mh > 0 ? sp.thumbnail : null,
      so_luong_nhap: Math.max(0, Math.trunc(Number(r.so_luong_nhap) || 0)),
      gia_nhap_snapshot: numMoney(r.gia_nhap_snapshot),
      thanh_tien: numMoney(r.thanh_tien),
    };
  });

  return { ok: true, lines };
}

export type AdminHoaCuBanChiTietLine = {
  mat_hang: number;
  ten_hang: string;
  thumbnail: string | null;
  so_luong_ban: number;
  gia_ban_snapshot: number;
  thanh_tien: number;
};

/** Chi tiết dòng `hc_ban_hc_chi_tiet` + tên mặt hàng. */
export async function loadHoaCuDonBanChiTietAction(
  donBanId: number,
): Promise<{ ok: true; lines: AdminHoaCuBanChiTietLine[] } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donBanId) || donBanId <= 0) return { ok: false, error: "Đơn bán không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data, error } = await supabase
    .from("hc_ban_hc_chi_tiet")
    .select("mat_hang, so_luong_ban, gia_ban_snapshot, thanh_tien, hc_danh_sach_san_pham(ten_hang, thumbnail)")
    .eq("don_ban", donBanId)
    .order("mat_hang", { ascending: true });

  if (error) return { ok: false, error: error.message || "Không đọc được chi tiết đơn bán." };

  const lines: AdminHoaCuBanChiTietLine[] = (data ?? []).map((raw) => {
    const r = raw as {
      mat_hang?: unknown;
      so_luong_ban?: unknown;
      gia_ban_snapshot?: unknown;
      thanh_tien?: unknown;
      hc_danh_sach_san_pham?: unknown;
    };
    const mh = Number(r.mat_hang);
    const sp = unwrapJoinedSanPham(r.hc_danh_sach_san_pham);
    return {
      mat_hang: Number.isFinite(mh) && mh > 0 ? mh : 0,
      ten_hang: Number.isFinite(mh) && mh > 0 ? sp.ten_hang : "—",
      thumbnail: Number.isFinite(mh) && mh > 0 ? sp.thumbnail : null,
      so_luong_ban: Math.max(0, Math.trunc(Number(r.so_luong_ban) || 0)),
      gia_ban_snapshot: numMoney(r.gia_ban_snapshot),
      thanh_tien: numMoney(r.thanh_tien),
    };
  });

  return { ok: true, lines };
}

export async function updateHoaCuSanPham(input: {
  id: number;
  ten_hang: string;
  loai_san_pham: string | null;
  gia_nhap: number;
  gia_ban: number;
  thumbnail: string | null;
  chi_nhanh_id: number;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.id) || input.id <= 0) return { ok: false, error: "Mặt hàng không hợp lệ." };
  if (!Number.isFinite(input.chi_nhanh_id) || input.chi_nhanh_id <= 0) {
    return { ok: false, error: "Chọn chi nhánh kho." };
  }

  const ten_hang = input.ten_hang.trim();
  if (!ten_hang) return { ok: false, error: "Nhập tên hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { error } = await supabase
    .from("hc_danh_sach_san_pham")
    .update({
      ten_hang,
      loai_san_pham: input.loai_san_pham?.trim() || null,
      gia_nhap: Math.max(0, input.gia_nhap),
      gia_ban: Math.max(0, input.gia_ban),
      thumbnail: input.thumbnail?.trim() || null,
      chi_nhanh_id: input.chi_nhanh_id,
    })
    .eq("id", input.id);

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("chi_nhanh_id") || msg.includes("column")) {
      return {
        ok: false,
        error: "Chưa có cột chi_nhanh_id. Chạy scripts/sql/hc-danh-sach-chi-nhanh-id.sql trong Supabase SQL Editor.",
      };
    }
    return { ok: false, error: error.message || "Không cập nhật được mặt hàng." };
  }

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã cập nhật mặt hàng." };
}

export async function deleteHoaCuSanPham(id: number): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(id) || id <= 0) return { ok: false, error: "Mặt hàng không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: nhapRefs } = await supabase.from("hc_nhap_hoa_cu_chi_tiet").select("id").eq("mat_hang", id).limit(1);
  if (nhapRefs?.length) {
    return { ok: false, error: "Không xoá được: mặt hàng đã có trong đơn nhập." };
  }
  const { data: banRefs } = await supabase.from("hc_ban_hc_chi_tiet").select("id").eq("mat_hang", id).limit(1);
  if (banRefs?.length) {
    return { ok: false, error: "Không xoá được: mặt hàng đã có trong đơn bán." };
  }

  const chuyenOr = `mat_hang_nguon.eq.${id},mat_hang_dich.eq.${id}`;
  const { data: chuyenRefs, error: chuyenErr } = await supabase
    .from("hc_chuyen_kho_chi_tiet")
    .select("id")
    .or(chuyenOr)
    .limit(1);
  if (chuyenErr) {
    const msg = chuyenErr.message?.toLowerCase() ?? "";
    if (!msg.includes("does not exist") && !msg.includes("relation")) {
      return { ok: false, error: chuyenErr.message || "Không kiểm tra được phiếu chuyển kho." };
    }
  } else if (chuyenRefs?.length) {
    return {
      ok: false,
      error:
        "Không xoá được: mặt hàng đã có trong phiếu chuyển kho. Vào tab «Chuyển kho», xoá phiếu liên quan trước.",
    };
  }

  const { error } = await supabase.from("hc_danh_sach_san_pham").delete().eq("id", id);
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("foreign key") || msg.includes("violates")) {
      return {
        ok: false,
        error:
          "Không xoá được: mặt hàng đang được tham chiếu ở hệ thống (nhập, bán, chuyển kho…).",
      };
    }
    return { ok: false, error: error.message || "Không xoá được mặt hàng." };
  }

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã xoá mặt hàng." };
}

export async function createHoaCuDonNhap(input: {
  nguoi_nhap: number;
  chi_nhanh_id: number;
  nha_cung_cap: string | null;
  /** Tiền mặt / Chuyển khoản — cột `hinh_thuc_chi` trên `hc_nhap_hoa_cu` (chạy SQL `scripts/sql/hc-nhap-hinh-thuc-chi.sql` nếu chưa có). */
  hinh_thuc_chi: string;
  lines: { mat_hang: number; so_luong_nhap: number }[];
  /** Gửi `crypto.randomUUID()` từ client mỗi lần bấm lưu — cần cột + index unique (xem scripts/sql/hc-hoa-cu-idempotency.sql). */
  idempotency_key?: string | null;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.nguoi_nhap) || input.nguoi_nhap <= 0) {
    return { ok: false, error: "Chọn người nhập." };
  }
  if (!Number.isFinite(input.chi_nhanh_id) || input.chi_nhanh_id <= 0) {
    return { ok: false, error: "Chọn chi nhánh kho." };
  }
  const rawLines = input.lines.filter((l) => l.mat_hang > 0 && l.so_luong_nhap > 0);
  const lines = mergeNhapLines(rawLines);
  if (!lines.length) return { ok: false, error: "Thêm ít nhất một dòng hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const matIds = [...new Set(lines.map((l) => l.mat_hang))];
  const branchCheck = await assertMatHangThuocChiNhanh(supabase, matIds, input.chi_nhanh_id);
  if (!branchCheck.ok) return branchCheck;

  const idem = input.idempotency_key?.trim() || null;
  const hinhChi = input.hinh_thuc_chi?.trim() || "Tiền mặt";
  const headerInsert: Record<string, unknown> = {
    nguoi_nhap: input.nguoi_nhap,
    chi_nhanh_id: input.chi_nhanh_id,
    nha_cung_cap: input.nha_cung_cap?.trim() || null,
    hinh_thuc_chi: hinhChi,
  };
  if (idem) headerInsert.idempotency_key = idem;

  const { data: don, error: e1 } = await supabase.from("hc_nhap_hoa_cu").insert(headerInsert).select("id").single();

  if (e1) {
    if (idem && isPgUniqueViolation(e1)) {
      revalidatePath(ADMIN_PATH, "layout");
      return { ok: true, message: "Đã lưu đơn nhập." };
    }
    const hint = chiNhanhColumnHint(e1.message ?? "");
    return { ok: false, error: hint ?? e1.message ?? "Không tạo được đơn nhập." };
  }
  if (!don?.id) return { ok: false, error: "Không tạo được đơn nhập." };

  const donId = Number(don.id);
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

  // ton_kho: DB trigger trên INSERT hc_nhap_hoa_cu_chi_tiet — không cộng thêm ở app (tránh nhân đôi).
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã lưu đơn nhập." };
}

export async function updateHoaCuDonNhapMeta(input: {
  id: number;
  nha_cung_cap: string | null;
  hinh_thuc_chi?: string | null;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(input.id) || input.id <= 0) return { ok: false, error: "Đơn nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const patch: Record<string, unknown> = {
    nha_cung_cap: input.nha_cung_cap?.trim() || null,
  };
  if (input.hinh_thuc_chi !== undefined) {
    patch.hinh_thuc_chi = input.hinh_thuc_chi?.trim() || null;
  }

  const { error } = await supabase.from("hc_nhap_hoa_cu").update(patch).eq("id", input.id);

  if (error) return { ok: false, error: error.message || "Không cập nhật được đơn nhập." };

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã cập nhật đơn nhập." };
}

/**
 * Xoá đơn nhập: xoá `hc_nhap_hoa_cu_chi_tiet` rồi `hc_nhap_hoa_cu`.
 * `ton_kho` do trigger DB khi DELETE chi tiết (đối xứng INSERT) — không trừ thêm trong app (tránh cộng lại tồn như khi trừ app + trigger hoàn tác).
 */
export async function deleteHoaCuDonNhap(donId: number): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "Đơn nhập không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data: exists, error: fe } = await supabase.from("hc_nhap_hoa_cu").select("id").eq("id", donId).maybeSingle();
  if (fe) return { ok: false, error: fe.message };
  if (!exists) return { ok: false, error: "Không tìm thấy đơn nhập." };

  await rollbackNhapDon(supabase, donId);

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã xoá đơn nhập." };
}

export async function createHoaCuDonBan(input: {
  nguoi_ban: number;
  khach_hang: number;
  chi_nhanh_id: number;
  hinh_thuc_thu: string;
  lines: { mat_hang: number; so_luong_ban: number }[];
  idempotency_key?: string | null;
}): Promise<HoaCuCreateDonBanResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.nguoi_ban) || input.nguoi_ban <= 0) return { ok: false, error: "Chọn người bán." };
  if (!Number.isFinite(input.khach_hang) || input.khach_hang <= 0) {
    return { ok: false, error: "Chọn khách hàng (học viên)." };
  }
  if (!Number.isFinite(input.chi_nhanh_id) || input.chi_nhanh_id <= 0) {
    return { ok: false, error: "Chọn chi nhánh kho." };
  }
  const rawLines = input.lines.filter((l) => l.mat_hang > 0 && l.so_luong_ban > 0);
  const lines = mergeBanLines(rawLines);
  if (!lines.length) return { ok: false, error: "Thêm ít nhất một dòng hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const matIds = [...new Set(lines.map((l) => l.mat_hang))];
  const branchCheck = await assertMatHangThuocChiNhanh(supabase, matIds, input.chi_nhanh_id);
  if (!branchCheck.ok) return branchCheck;

  const { data: priceRows, error: priceErr } = await supabase
    .from("hc_danh_sach_san_pham")
    .select("id, gia_nhap, gia_ban")
    .in("id", matIds);
  if (priceErr) {
    return { ok: false, error: priceErr.message || "Không đọc được giá mặt hàng." };
  }

  let tonMap: Map<number, number>;
  try {
    tonMap = await fetchTonKhoTheoPhieuForIds(supabase, matIds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không đọc được tồn theo phiếu." };
  }
  const priceByMat = new Map<number, { gia_nhap: number; gia_ban: number }>();
  for (const r of priceRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    priceByMat.set(id, {
      gia_nhap: numMoney((r as { gia_nhap?: unknown }).gia_nhap),
      gia_ban: numMoney((r as { gia_ban?: unknown }).gia_ban),
    });
  }

  for (const l of lines) {
    const t = tonMap.get(l.mat_hang) ?? 0;
    if (l.so_luong_ban > t) {
      return { ok: false, error: `Mặt hàng #${l.mat_hang} chỉ còn ${t} trong kho.` };
    }
  }

  const idem = input.idempotency_key?.trim() || null;
  const isTransfer = isHcChuyenKhoan(input.hinh_thuc_thu);
  const today = new Date().toISOString().slice(0, 10);
  const baseHeader: Record<string, unknown> = {
    nguoi_ban: input.nguoi_ban,
    khach_hang: input.khach_hang,
    chi_nhanh_id: input.chi_nhanh_id,
    hinh_thuc_thu: input.hinh_thuc_thu.trim() || "Tiền mặt",
  };
  const paymentHeader: Record<string, unknown> = {
    status: isTransfer ? "Chờ thanh toán" : "Đã thanh toán",
    ngay_thanh_toan: isTransfer ? null : today,
  };
  const banHeader: Record<string, unknown> = { ...baseHeader, ...paymentHeader };
  if (idem) banHeader.idempotency_key = idem;

  let don: { id?: unknown } | null = null;
  let e1: { message?: string } | null = null;
  let paymentColumnsOk = true;

  ({ data: don, error: e1 } = await supabase.from("hc_don_ban_hoa_cu").insert(banHeader).select("id").single());

  if (e1 && isHcThanhToanColumnError(e1.message ?? "")) {
    if (isTransfer) {
      const hint = hcThanhToanColumnHint(e1.message ?? "");
      return { ok: false, error: hint ?? e1.message ?? "Không tạo được đơn bán." };
    }
    paymentColumnsOk = false;
    const legacyHeader: Record<string, unknown> = { ...baseHeader };
    if (idem) legacyHeader.idempotency_key = idem;
    ({ data: don, error: e1 } = await supabase.from("hc_don_ban_hoa_cu").insert(legacyHeader).select("id").single());
  }

  if (e1) {
    if (idem && isPgUniqueViolation(e1)) {
      revalidatePath(ADMIN_PATH, "layout");
      return { ok: true, donId: 0, maDon: "", maDonSo: "", tongTien: 0, status: "Đã thanh toán", message: "Đã lưu đơn bán." };
    }
    const hint = hcThanhToanColumnHint(e1.message ?? "") ?? chiNhanhColumnHint(e1.message ?? "");
    return { ok: false, error: hint ?? e1.message ?? "Không tạo được đơn bán." };
  }
  if (!don?.id) return { ok: false, error: "Không tạo được đơn bán." };

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

  const { data: sumRow, error: sumErr } = await supabase
    .from("hc_don_ban_hoa_cu")
    .select("tong_tien")
    .eq("id", donId)
    .maybeSingle();
  if (sumErr) {
    await rollbackBanDon(supabase, donId);
    return { ok: false, error: sumErr.message || "Không đọc được tổng đơn." };
  }
  const tongTien = numMoney((sumRow as { tong_tien?: unknown } | null)?.tong_tien);

  const codes = hcDonCodesFromId(donId);
  if (paymentColumnsOk) {
    const { error: codeErr } = await supabase
      .from("hc_don_ban_hoa_cu")
      .update({ ma_don: codes.ma_don, ma_don_so: codes.ma_don_so })
      .eq("id", donId);
    if (codeErr) {
      const hint = hcThanhToanColumnHint(codeErr.message ?? "");
      if (isTransfer) {
        await rollbackBanDon(supabase, donId);
        return { ok: false, error: hint ?? codeErr.message ?? "Không gán được mã đơn." };
      }
    }
  } else if (isTransfer) {
    await rollbackBanDon(supabase, donId);
    return { ok: false, error: hcThanhToanColumnHint("status") ?? "Thiếu cột thanh toán trên đơn bán." };
  }

  // ton_kho: DB trigger trên INSERT hc_ban_hc_chi_tiet — không trừ thêm ở app.
  revalidatePath(ADMIN_PATH, "layout");
  return {
    ok: true,
    donId,
    maDon: codes.ma_don,
    maDonSo: codes.ma_don_so,
    tongTien,
    status: isTransfer ? "Chờ thanh toán" : "Đã thanh toán",
    message: isTransfer ? "Đã tạo đơn — chờ chuyển khoản." : "Đã lưu đơn bán.",
  };
}

export async function pollHoaCuDonBanAction(
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

  const readDon = async () => {
    const { data, error } = await supabase
      .from("hc_don_ban_hoa_cu")
      .select("status, ma_don, ma_don_so, ngay_thanh_toan, tong_tien, hinh_thuc_thu")
      .eq("id", donId)
      .maybeSingle();
    return { data: data as Record<string, unknown> | null, error };
  };

  let { data, error } = await readDon();
  if (error) {
    const hint = hcThanhToanColumnHint(error.message);
    return { ok: false, error: hint ?? error.message };
  }
  if (!data) return { ok: false, error: "Không tìm thấy đơn." };

  const status = data.status != null ? String(data.status) : null;
  const hinhThuc = data.hinh_thuc_thu != null ? String(data.hinh_thuc_thu) : "";
  const maDonSo = data.ma_don_so != null ? String(data.ma_don_so) : null;
  const tongTien = numMoney(data.tong_tien);

  if (isHcChuyenKhoan(hinhThuc) && status !== "Đã thanh toán") {
    const synced = await trySyncHcDonBanFromSepay(supabase, donId, maDonSo, tongTien);
    if (synced) {
      const again = await readDon();
      if (!again.error && again.data) data = again.data;
    }
  }

  const row = data;
  return {
    ok: true,
    status: row.status != null ? String(row.status) : null,
    ma_don: row.ma_don != null ? String(row.ma_don) : null,
    ma_don_so: row.ma_don_so != null ? String(row.ma_don_so) : null,
    ngay_thanh_toan: row.ngay_thanh_toan != null ? String(row.ngay_thanh_toan).slice(0, 10) : null,
  };
}

export async function confirmHoaCuDonBanDaThuAction(donId: number): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "ID đơn không hợp lệ." };
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase." };

  const { data, error } = await supabase
    .from("hc_don_ban_hoa_cu")
    .select("status, hinh_thuc_thu")
    .eq("id", donId)
    .maybeSingle();
  if (error) {
    const hint = hcThanhToanColumnHint(error.message);
    return { ok: false, error: hint ?? error.message };
  }
  if (!data) return { ok: false, error: "Không tìm thấy đơn." };
  if (String((data as { status?: unknown }).status ?? "") === "Đã thanh toán") {
    return { ok: true, message: "Đơn đã được đánh dấu thanh toán." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: uErr } = await supabase
    .from("hc_don_ban_hoa_cu")
    .update({ status: "Đã thanh toán", ngay_thanh_toan: today })
    .eq("id", donId);
  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã xác nhận thu đơn bán." };
}

export async function updateHoaCuDonBanMeta(input: {
  id: number;
  khach_hang: number;
  hinh_thuc_thu?: string | null;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(input.id) || input.id <= 0) return { ok: false, error: "Đơn bán không hợp lệ." };
  if (!Number.isFinite(input.khach_hang) || input.khach_hang <= 0) {
    return { ok: false, error: "Chọn khách hàng (học viên)." };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const perm = await gateHoaCuDonMutate(supabase, session.staffId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const { error } = await supabase
    .from("hc_don_ban_hoa_cu")
    .update({
      khach_hang: input.khach_hang,
      hinh_thuc_thu: input.hinh_thuc_thu?.trim() || "Tiền mặt",
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message || "Không cập nhật được đơn bán." };

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã cập nhật đơn bán." };
}

/**
 * Xoá đơn bán: xoá `hc_ban_hc_chi_tiet` rồi `hc_don_ban_hoa_cu`.
 * `ton_kho` do trigger DB khi DELETE chi tiết — không cộng thêm ở app.
 */
export async function deleteHoaCuDonBan(donId: number): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "Đơn bán không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const perm = await gateHoaCuDonMutate(supabase, session.staffId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const { data: exists, error: fe } = await supabase.from("hc_don_ban_hoa_cu").select("id").eq("id", donId).maybeSingle();
  if (fe) return { ok: false, error: fe.message };
  if (!exists) return { ok: false, error: "Không tìm thấy đơn bán." };

  await rollbackBanDon(supabase, donId);

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã xoá đơn bán." };
}

export type AdminHoaCuChuyenChiTietLine = {
  mat_hang_nguon: number;
  mat_hang_dich: number;
  ten_hang: string;
  thumbnail: string | null;
  so_luong: number;
  gia_nhap_snapshot: number;
};

export async function loadHoaCuChuyenChiTietAction(
  donId: number,
): Promise<{ ok: true; lines: AdminHoaCuChuyenChiTietLine[] } | { ok: false; error: string }> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "Phiếu chuyển không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const { data, error } = await supabase
    .from("hc_chuyen_kho_chi_tiet")
    .select(
      "mat_hang_nguon, mat_hang_dich, so_luong, gia_nhap_snapshot, hc_danh_sach_san_pham!hc_chuyen_kho_chi_tiet_mat_hang_nguon_fkey(ten_hang, thumbnail)",
    )
    .eq("don_chuyen", donId)
    .order("mat_hang_nguon", { ascending: true });

  if (error) {
    const { data: fallback, error: fbErr } = await supabase
      .from("hc_chuyen_kho_chi_tiet")
      .select("mat_hang_nguon, mat_hang_dich, so_luong, gia_nhap_snapshot")
      .eq("don_chuyen", donId)
      .order("mat_hang_nguon", { ascending: true });
    if (fbErr) return { ok: false, error: fbErr.message || "Không đọc được chi tiết phiếu chuyển." };
    const matIds = [...new Set((fallback ?? []).map((r) => Number((r as { mat_hang_nguon?: unknown }).mat_hang_nguon)).filter((id) => id > 0))];
    const nameMap = new Map<number, { ten_hang: string; thumbnail: string | null }>();
    if (matIds.length) {
      const { data: spRows } = await supabase.from("hc_danh_sach_san_pham").select("id, ten_hang, thumbnail").in("id", matIds);
      for (const sp of spRows ?? []) {
        const id = Number((sp as { id?: unknown }).id);
        if (!Number.isFinite(id) || id <= 0) continue;
        nameMap.set(id, {
          ten_hang: String((sp as { ten_hang?: unknown }).ten_hang ?? "").trim() || "—",
          thumbnail:
            (sp as { thumbnail?: unknown }).thumbnail != null && String((sp as { thumbnail?: unknown }).thumbnail).trim()
              ? String((sp as { thumbnail?: unknown }).thumbnail).trim()
              : null,
        });
      }
    }
    const lines: AdminHoaCuChuyenChiTietLine[] = (fallback ?? []).map((raw) => {
      const r = raw as {
        mat_hang_nguon?: unknown;
        mat_hang_dich?: unknown;
        so_luong?: unknown;
        gia_nhap_snapshot?: unknown;
      };
      const srcId = Number(r.mat_hang_nguon);
      const sp = nameMap.get(srcId);
      return {
        mat_hang_nguon: srcId,
        mat_hang_dich: Number(r.mat_hang_dich),
        ten_hang: sp?.ten_hang ?? "—",
        thumbnail: sp?.thumbnail ?? null,
        so_luong: Math.trunc(Number(r.so_luong) || 0),
        gia_nhap_snapshot: numMoney(r.gia_nhap_snapshot),
      };
    });
    return { ok: true, lines };
  }

  const lines: AdminHoaCuChuyenChiTietLine[] = (data ?? []).map((raw) => {
    const r = raw as {
      mat_hang_nguon?: unknown;
      mat_hang_dich?: unknown;
      so_luong?: unknown;
      gia_nhap_snapshot?: unknown;
      hc_danh_sach_san_pham?: unknown;
    };
    const sp = unwrapJoinedSanPham(r.hc_danh_sach_san_pham);
    return {
      mat_hang_nguon: Number(r.mat_hang_nguon),
      mat_hang_dich: Number(r.mat_hang_dich),
      ten_hang: sp.ten_hang,
      thumbnail: sp.thumbnail,
      so_luong: Math.trunc(Number(r.so_luong) || 0),
      gia_nhap_snapshot: numMoney(r.gia_nhap_snapshot),
    };
  });
  return { ok: true, lines };
}

export async function createHoaCuChuyenKho(input: {
  nguoi_chuyen: number;
  chi_nhanh_nguon: number;
  chi_nhanh_dich: number;
  ghi_chu: string | null;
  lines: { mat_hang_nguon: number; so_luong: number }[];
  idempotency_key?: string | null;
}): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };

  if (!Number.isFinite(input.nguoi_chuyen) || input.nguoi_chuyen <= 0) {
    return { ok: false, error: "Không xác định được nhân sự đăng nhập." };
  }
  if (!Number.isFinite(input.chi_nhanh_nguon) || input.chi_nhanh_nguon <= 0) {
    return { ok: false, error: "Chọn chi nhánh nguồn." };
  }
  if (!Number.isFinite(input.chi_nhanh_dich) || input.chi_nhanh_dich <= 0) {
    return { ok: false, error: "Chọn chi nhánh đích." };
  }
  if (input.chi_nhanh_nguon === input.chi_nhanh_dich) {
    return { ok: false, error: "Chi nhánh nguồn và đích phải khác nhau." };
  }

  const lines = mergeChuyenLines(input.lines);
  if (!lines.length) return { ok: false, error: "Thêm ít nhất một dòng hàng." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const matIds = [...new Set(lines.map((l) => l.mat_hang_nguon))];
  const { data: spRows, error: spErr } = await supabase
    .from("hc_danh_sach_san_pham")
    .select("id, ten_hang, loai_san_pham, gia_nhap, gia_ban, thumbnail, chi_nhanh_id")
    .in("id", matIds);
  if (spErr) return { ok: false, error: spErr.message || "Không đọc được danh mục nguồn." };

  const spById = new Map<number, {
    id: number;
    ten_hang: string;
    loai_san_pham: string | null;
    gia_nhap: number;
    gia_ban: number;
    thumbnail: string | null;
    chi_nhanh_id: number | null;
  }>();
  for (const r of spRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    spById.set(id, {
      id,
      ten_hang: String((r as { ten_hang?: unknown }).ten_hang ?? "").trim() || "—",
      loai_san_pham:
        (r as { loai_san_pham?: unknown }).loai_san_pham != null
          ? String((r as { loai_san_pham?: unknown }).loai_san_pham).trim() || null
          : null,
      gia_nhap: numMoney((r as { gia_nhap?: unknown }).gia_nhap),
      gia_ban: numMoney((r as { gia_ban?: unknown }).gia_ban),
      thumbnail:
        (r as { thumbnail?: unknown }).thumbnail != null && String((r as { thumbnail?: unknown }).thumbnail).trim()
          ? String((r as { thumbnail?: unknown }).thumbnail).trim()
          : null,
      chi_nhanh_id:
        (r as { chi_nhanh_id?: unknown }).chi_nhanh_id != null && Number.isFinite(Number((r as { chi_nhanh_id?: unknown }).chi_nhanh_id))
          ? Number((r as { chi_nhanh_id?: unknown }).chi_nhanh_id)
          : null,
    });
  }

  for (const l of lines) {
    const sp = spById.get(l.mat_hang_nguon);
    if (!sp) return { ok: false, error: `Mặt hàng #${l.mat_hang_nguon} không tồn tại.` };
    if (sp.chi_nhanh_id != null && sp.chi_nhanh_id !== input.chi_nhanh_nguon) {
      return { ok: false, error: `«${sp.ten_hang}» không thuộc chi nhánh nguồn.` };
    }
  }

  let tonMap: Map<number, number>;
  try {
    tonMap = await fetchTonKhoTheoPhieuForIds(supabase, matIds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không đọc được tồn kho." };
  }
  for (const l of lines) {
    const sp = spById.get(l.mat_hang_nguon)!;
    const t = tonMap.get(l.mat_hang_nguon) ?? 0;
    if (l.so_luong > t) {
      return { ok: false, error: `«${sp.ten_hang}» chỉ còn ${t} ở chi nhánh nguồn.` };
    }
  }

  const idem = input.idempotency_key?.trim() || null;
  const headerInsert: Record<string, unknown> = {
    nguoi_chuyen: input.nguoi_chuyen,
    chi_nhanh_nguon: input.chi_nhanh_nguon,
    chi_nhanh_dich: input.chi_nhanh_dich,
    ghi_chu: input.ghi_chu?.trim() || null,
  };
  if (idem) headerInsert.idempotency_key = idem;

  const { data: don, error: e1 } = await supabase.from("hc_chuyen_kho").insert(headerInsert).select("id").single();
  if (e1) {
    if (idem && isPgUniqueViolation(e1)) {
      revalidatePath(ADMIN_PATH, "layout");
      return { ok: true, message: "Đã lưu phiếu chuyển." };
    }
    const msg = e1.message?.toLowerCase() ?? "";
    if (msg.includes("does not exist") || msg.includes("relation")) {
      return {
        ok: false,
        error: "Chưa có bảng chuyển kho. Chạy scripts/sql/hc-chuyen-kho.sql trong Supabase SQL Editor.",
      };
    }
    return { ok: false, error: e1.message || "Không tạo được phiếu chuyển." };
  }
  if (!don?.id) return { ok: false, error: "Không tạo được phiếu chuyển." };

  const donId = Number(don.id);
  for (const l of lines) {
    const src = spById.get(l.mat_hang_nguon)!;
    const dest = await findOrCreateDestSanPham(supabase, src, input.chi_nhanh_dich);
    if (!dest.ok) {
      await rollbackChuyenDon(supabase, donId);
      return { ok: false, error: dest.error };
    }
    const qty = Math.max(1, Math.trunc(l.so_luong));
    const { error: e2 } = await supabase.from("hc_chuyen_kho_chi_tiet").insert({
      don_chuyen: donId,
      mat_hang_nguon: l.mat_hang_nguon,
      mat_hang_dich: dest.id,
      so_luong: qty,
      gia_nhap_snapshot: src.gia_nhap,
    });
    if (e2) {
      await rollbackChuyenDon(supabase, donId);
      return { ok: false, error: e2.message || "Lỗi chi tiết phiếu chuyển." };
    }
  }

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã lưu phiếu chuyển kho." };
}

export async function deleteHoaCuChuyenKho(donId: number): Promise<HoaCuActionResult> {
  const session = await getAdminSessionOrNull();
  if (!session) return { ok: false, error: "Phiên đăng nhập không hợp lệ." };
  if (!Number.isFinite(donId) || donId <= 0) return { ok: false, error: "Phiếu chuyển không hợp lệ." };

  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "Thiếu cấu hình Supabase server." };

  const perm = await gateHoaCuDonMutate(supabase, session.staffId);
  if (!perm.ok) return { ok: false, error: perm.error };

  const { data: exists, error: fe } = await supabase.from("hc_chuyen_kho").select("id").eq("id", donId).maybeSingle();
  if (fe) return { ok: false, error: fe.message };
  if (!exists) return { ok: false, error: "Không tìm thấy phiếu chuyển." };

  await rollbackChuyenDon(supabase, donId);

  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, message: "Đã xoá phiếu chuyển." };
}
