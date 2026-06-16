import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveHinhThucFromMon } from "@/lib/data/courses-page";
import {
  parseBanDonIdFromQuery,
  resolveBanDonCodes,
} from "@/lib/data/hc-don-ban-helpers";

export {
  isHcBanDonDaThanhToan,
  resolveBanDonCodes,
  resolveHcBanDonTrangThai,
} from "@/lib/data/hc-don-ban-helpers";

export const HOA_CU_PAGE_SIZE = 15;

/** Base URL admin họa cụ + các tab (App Router). */
export const HOA_CU_BASE_PATH = "/admin/dashboard/quan-ly-hoa-cu";
export const HOA_CU_KHO_PATH = `${HOA_CU_BASE_PATH}/danh-muc-kho`;
export const HOA_CU_NHAP_PATH = `${HOA_CU_BASE_PATH}/don-nhap`;
export const HOA_CU_BAN_PATH = `${HOA_CU_BASE_PATH}/don-ban`;
export const HOA_CU_CHUYEN_PATH = `${HOA_CU_BASE_PATH}/chuyen-kho`;

const KHO_SELECT_BASE = "id, ten_hang, loai_san_pham, gia_nhap, gia_ban, thumbnail, chi_nhanh_id";

export type AdminHoaCuSanPham = {
  id: number;
  ten_hang: string;
  loai_san_pham: string | null;
  gia_nhap: number;
  gia_ban: number;
  /** Σ nhập − Σ bán từ `hc_*_chi_tiet` (không đọc cột `ton_kho` DB). */
  ton_kho: number;
  thumbnail: string | null;
  chi_nhanh_id: number | null;
  chi_nhanh_ten: string | null;
};

export type AdminHoaCuNhapDon = {
  id: number;
  created_at: string;
  nha_cung_cap: string | null;
  hinh_thuc_chi: string | null;
  nguoi_nhap: number | null;
  nguoi_nhap_name: string;
  chi_nhanh_id: number | null;
  chi_nhanh_ten: string | null;
  so_mat_hang: number;
  tong_tien: number;
};

export type AdminHoaCuBanDon = {
  id: number;
  created_at: string;
  /** Mã đơn hiển thị, vd `HC-00000012`. */
  ma_don: string;
  /** Mã số nội dung CK, vd `SC000012`. */
  ma_don_so: string;
  hinh_thuc_thu: string | null;
  /** `Chờ thanh toán` | `Đã thanh toán` — null nếu đơn cũ chưa có cột DB. */
  status: string | null;
  nguoi_ban: number | null;
  khach_hang: number | null;
  nguoi_ban_name: string;
  khach_hang_name: string;
  chi_nhanh_id: number | null;
  chi_nhanh_ten: string | null;
  so_mat_hang: number;
  tong_tien: number;
};

export type AdminHoaCuChuyenDon = {
  id: number;
  created_at: string;
  nguoi_chuyen: number | null;
  nguoi_chuyen_name: string;
  chi_nhanh_nguon: number;
  chi_nhanh_nguon_ten: string;
  chi_nhanh_dich: number;
  chi_nhanh_dich_ten: string;
  so_mat_hang: number;
  ghi_chu: string | null;
};

export type AdminHoaCuStaffOpt = { id: number; full_name: string };
/** `hoc_tag` từ `ql_mon_hoc.hinh_thuc` qua ghi danh `Đang học` (Online / Offline = không online). */
export type AdminHoaCuHvOpt = {
  id: number;
  full_name: string;
  /** `ql_thong_tin_hoc_vien.avatar` (URL, vd Cloudflare Images). */
  avatar: string | null;
  hoc_tag: "Online" | "Offline" | null;
};

export type AdminHoaCuBundle = {
  sanPham: AdminHoaCuSanPham[];
  donNhap: AdminHoaCuNhapDon[];
  donBan: AdminHoaCuBanDon[];
  staffOptions: AdminHoaCuStaffOpt[];
  studentOptions: AdminHoaCuHvOpt[];
};

type ChiNhapRow = {
  don_nhap: number;
  so_luong_nhap: number | null;
  mat_hang: number | null;
  thanh_tien?: number | string | null;
  hc_danh_sach_san_pham?: { gia_nhap?: number | null; gia_ban?: number | null } | null;
};

type ChiBanRow = {
  don_ban: number;
  so_luong_ban: number | null;
  mat_hang: number | null;
  thanh_tien?: number | string | null;
  hc_danh_sach_san_pham?: { gia_nhap?: number | null; gia_ban?: number | null } | null;
};

function unwrapSp(
  v: { gia_nhap?: unknown; gia_ban?: unknown } | { gia_nhap?: unknown; gia_ban?: unknown }[] | null | undefined
): { gia_nhap: number; gia_ban: number } {
  const o = Array.isArray(v) ? v[0] : v;
  return {
    gia_nhap: Number(o?.gia_nhap) || 0,
    gia_ban: Number(o?.gia_ban) || 0,
  };
}

function unwrapOne<T extends Record<string, unknown>>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : v;
}

function tongChiNhapLines(ct: ChiNhapRow[]): number {
  return ct.reduce((s, c) => {
    const raw = c.thanh_tien;
    if (raw != null && raw !== "") {
      const tt = Number(raw);
      if (Number.isFinite(tt)) return s + tt;
    }
    const { gia_nhap } = unwrapSp(c.hc_danh_sach_san_pham);
    return s + gia_nhap * (Number(c.so_luong_nhap) || 1);
  }, 0);
}

function tongChiBanLines(ct: ChiBanRow[]): number {
  return ct.reduce((s, c) => {
    const raw = c.thanh_tien;
    if (raw != null && raw !== "") {
      const tt = Number(raw);
      if (Number.isFinite(tt)) return s + tt;
    }
    const { gia_ban } = unwrapSp(c.hc_danh_sach_san_pham);
    return s + gia_ban * (Number(c.so_luong_ban) || 1);
  }, 0);
}

function tongTienHoaCuHeader(header: unknown, chiTong: number): number {
  if (header != null && header !== "") {
    const n = Number(header);
    if (Number.isFinite(n)) return n;
  }
  return chiTong;
}

function buildBanDonSearchOr(
  rawQ: string,
  ctx: { staffMap: Map<number, string>; hvMap: Map<number, string> },
): string | null {
  const t = rawQ.trim();
  if (!t) return null;
  const searchPat = `%${t.replace(/%/g, "\\%")}%`;
  const tl = t.toLowerCase();
  const parts: string[] = [`ma_don.ilike.${searchPat}`, `ma_don_so.ilike.${searchPat}`, `hinh_thuc_thu.ilike.${searchPat}`, `status.ilike.${searchPat}`];

  const donId = parseBanDonIdFromQuery(t);
  if (donId != null) parts.push(`id.eq.${donId}`);

  const staffIds = [...ctx.staffMap.entries()]
    .filter(([, name]) => name.toLowerCase().includes(tl))
    .map(([id]) => id);
  const hvIds = [...ctx.hvMap.entries()]
    .filter(([, name]) => name.toLowerCase().includes(tl))
    .map(([id]) => id);
  if (staffIds.length) parts.push(`nguoi_ban.in.(${staffIds.join(",")})`);
  if (hvIds.length) parts.push(`khach_hang.in.(${hvIds.join(",")})`);

  return parts.join(",");
}

/** Nhân sự thuộc ban «Vận hành» hoặc «Marketing» (qua `hr_nhan_su_phong` → `hr_phong` → `hr_ban`). */
async function fetchVanHanhMarketingNhanSuIds(supabase: SupabaseClient): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("hr_nhan_su_phong")
    .select("nhan_su_id, hr_phong!inner(ban, hr_ban!inner(ten_ban))");

  if (error || !data?.length) return new Set();

  const allowed = new Set(["Vận hành", "Marketing", "Ban Vận hành"]);
  const ids = new Set<number>();
  for (const row of data as { nhan_su_id?: unknown; hr_phong?: unknown }[]) {
    const ph = unwrapOne(row.hr_phong as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!ph) continue;
    const banRaw = (ph as { hr_ban?: unknown }).hr_ban;
    const ban = unwrapOne(banRaw as Record<string, unknown> | Record<string, unknown>[] | null);
    const tenBan = ban && typeof (ban as { ten_ban?: unknown }).ten_ban === "string" ? String((ban as { ten_ban: string }).ten_ban).trim() : "";
    if (!tenBan || !allowed.has(tenBan)) continue;
    const nid = Number(row.nhan_su_id);
    if (Number.isFinite(nid) && nid > 0) ids.add(nid);
  }
  return ids;
}

function unwrapLopMonHinhThuc(row: Record<string, unknown>): string | null {
  const lop = row.ql_lop_hoc;
  const lopOne = Array.isArray(lop) ? lop[0] : lop;
  if (!lopOne || typeof lopOne !== "object") return null;
  const mon = (lopOne as { mon_hoc?: unknown }).mon_hoc;
  const monOne = Array.isArray(mon) ? mon[0] : mon;
  if (!monOne || typeof monOne !== "object") return null;
  const raw = (monOne as { hinh_thuc?: unknown }).hinh_thuc;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

/** Gom tag Online nếu có ≥1 môn online; ngược lại Offline nếu có ghi danh đang học khớp lớp/môn. */
async function fetchStudentHocTagsByHvIds(
  supabase: SupabaseClient,
  hvIds: number[]
): Promise<Map<number, "Online" | "Offline">> {
  const out = new Map<number, "Online" | "Offline">();
  if (!hvIds.length) return out;

  const CHUNK = 180;
  for (let i = 0; i < hvIds.length; i += CHUNK) {
    const chunk = hvIds.slice(i, i + CHUNK);
    let sel = "hoc_vien_id, status, ql_lop_hoc(mon_hoc:ql_mon_hoc(hinh_thuc))";
    let { data, error } = await supabase.from("ql_quan_ly_hoc_vien").select(sel).in("hoc_vien_id", chunk);
    if (error && /column|schema/i.test(error.message)) {
      sel = "hoc_vien_id, ql_lop_hoc(mon_hoc:ql_mon_hoc(hinh_thuc))";
      ({ data, error } = await supabase.from("ql_quan_ly_hoc_vien").select(sel).in("hoc_vien_id", chunk));
    }
    if (error || !data?.length) continue;

    for (const raw of data as unknown as Record<string, unknown>[]) {
      const hid = Number(raw.hoc_vien_id);
      if (!Number.isFinite(hid) || hid <= 0) continue;
      const statusRaw = raw.status != null ? String(raw.status).trim() : "";
      if (statusRaw && statusRaw !== "Đang học") continue;

      const hinhRaw = unwrapLopMonHinhThuc(raw);
      const { tag } = resolveHinhThucFromMon({ hinh_thuc: hinhRaw });
      const next: "Online" | "Offline" = tag === "Online" ? "Online" : "Offline";
      const prev = out.get(hid);
      if (next === "Online" || prev === "Online") out.set(hid, "Online");
      else out.set(hid, "Offline");
    }
  }
  return out;
}

function groupByDon<T extends { don_nhap?: number; don_ban?: number }>(
  rows: T[] | null,
  key: "don_nhap" | "don_ban"
): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const r of rows ?? []) {
    const id = Number(r[key]);
    if (!Number.isFinite(id) || id <= 0) continue;
    const arr = m.get(id) ?? [];
    arr.push(r);
    m.set(id, arr);
  }
  return m;
}

function isSkippableChuyenKhoReadError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("schema") ||
    msg.includes("relation") ||
    msg.includes("permission denied") ||
    msg.includes("permission") ||
    msg.includes("42501")
  );
}

/** Áp dụng chuyển kho vào map tồn (trừ nguồn, cộng đích). Bỏ qua nếu bảng chưa có hoặc chưa grant. */
async function applyChuyenKhoToTonMap(supabase: SupabaseClient, m: Map<number, number>): Promise<void> {
  const { data: rows, error } = await supabase
    .from("hc_chuyen_kho_chi_tiet")
    .select("mat_hang_nguon, mat_hang_dich, so_luong");
  if (error) {
    if (isSkippableChuyenKhoReadError(error.message ?? "")) return;
    throw new Error(error.message);
  }
  for (const r of rows ?? []) {
    const src = Number((r as { mat_hang_nguon?: unknown }).mat_hang_nguon);
    const dst = Number((r as { mat_hang_dich?: unknown }).mat_hang_dich);
    const q = Math.trunc(Number((r as { so_luong?: unknown }).so_luong) || 0);
    if (q <= 0) continue;
    if (Number.isFinite(src) && src > 0) m.set(src, (m.get(src) ?? 0) - q);
    if (Number.isFinite(dst) && dst > 0) m.set(dst, (m.get(dst) ?? 0) + q);
  }
}

/** Tồn theo phiếu toàn hệ thống: Σ nhập − Σ bán ± chuyển kho (không dùng cột `ton_kho`). */
async function fetchTonKhoMapTuPhieuToanCuc(supabase: SupabaseClient): Promise<Map<number, number>> {
  const m = new Map<number, number>();
  const { data: nRows, error: ne } = await supabase.from("hc_nhap_hoa_cu_chi_tiet").select("mat_hang, so_luong_nhap");
  if (ne) throw new Error(ne.message);
  const { data: bRows, error: be } = await supabase.from("hc_ban_hc_chi_tiet").select("mat_hang, so_luong_ban");
  if (be) throw new Error(be.message);
  for (const r of nRows ?? []) {
    const mh = Number((r as { mat_hang?: unknown }).mat_hang);
    const q = Math.trunc(Number((r as { so_luong_nhap?: unknown }).so_luong_nhap) || 0);
    if (!Number.isFinite(mh) || mh <= 0 || q <= 0) continue;
    m.set(mh, (m.get(mh) ?? 0) + q);
  }
  for (const r of bRows ?? []) {
    const mh = Number((r as { mat_hang?: unknown }).mat_hang);
    const q = Math.trunc(Number((r as { so_luong_ban?: unknown }).so_luong_ban) || 0);
    if (!Number.isFinite(mh) || mh <= 0 || q <= 0) continue;
    m.set(mh, (m.get(mh) ?? 0) - q);
  }
  await applyChuyenKhoToTonMap(supabase, m);
  return m;
}

const TON_PHIEU_IN_CHUNK = 280;

/** Tồn theo phiếu cho danh sách `mat_hang` (dùng trang kho / validate đơn bán). */
export async function fetchTonKhoTheoPhieuForIds(
  supabase: SupabaseClient,
  matIds: number[],
): Promise<Map<number, number>> {
  const uniq = [...new Set(matIds)].filter((x) => Number.isFinite(x) && x > 0) as number[];
  const m = new Map<number, number>();
  for (const id of uniq) m.set(id, 0);
  if (!uniq.length) return m;

  for (let i = 0; i < uniq.length; i += TON_PHIEU_IN_CHUNK) {
    const chunk = uniq.slice(i, i + TON_PHIEU_IN_CHUNK);
    const { data: nRows, error: ne } = await supabase
      .from("hc_nhap_hoa_cu_chi_tiet")
      .select("mat_hang, so_luong_nhap")
      .in("mat_hang", chunk);
    if (ne) throw new Error(ne.message);
    const { data: bRows, error: be } = await supabase
      .from("hc_ban_hc_chi_tiet")
      .select("mat_hang, so_luong_ban")
      .in("mat_hang", chunk);
    if (be) throw new Error(be.message);
    for (const r of nRows ?? []) {
      const mh = Number((r as { mat_hang?: unknown }).mat_hang);
      const q = Math.trunc(Number((r as { so_luong_nhap?: unknown }).so_luong_nhap) || 0);
      if (!Number.isFinite(mh) || mh <= 0 || q <= 0) continue;
      m.set(mh, (m.get(mh) ?? 0) + q);
    }
    for (const r of bRows ?? []) {
      const mh = Number((r as { mat_hang?: unknown }).mat_hang);
      const q = Math.trunc(Number((r as { so_luong_ban?: unknown }).so_luong_ban) || 0);
      if (!Number.isFinite(mh) || mh <= 0 || q <= 0) continue;
      m.set(mh, (m.get(mh) ?? 0) - q);
    }
    const { data: cRows, error: ce } = await supabase
      .from("hc_chuyen_kho_chi_tiet")
      .select("mat_hang_nguon, mat_hang_dich, so_luong")
      .or(`mat_hang_nguon.in.(${chunk.join(",")}),mat_hang_dich.in.(${chunk.join(",")})`);
    if (ce) {
      if (!isSkippableChuyenKhoReadError(ce.message ?? "")) {
        throw new Error(ce.message);
      }
    } else {
      for (const r of cRows ?? []) {
        const src = Number((r as { mat_hang_nguon?: unknown }).mat_hang_nguon);
        const dst = Number((r as { mat_hang_dich?: unknown }).mat_hang_dich);
        const q = Math.trunc(Number((r as { so_luong?: unknown }).so_luong) || 0);
        if (q <= 0) continue;
        if (chunk.includes(src)) m.set(src, (m.get(src) ?? 0) - q);
        if (chunk.includes(dst)) m.set(dst, (m.get(dst) ?? 0) + q);
      }
    }
  }
  return m;
}

async function fetchAllSanPhamIds(supabase: SupabaseClient): Promise<number[]> {
  const ids: number[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("hc_danh_sach_san_pham")
      .select("id")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) {
      const id = Number((r as { id: unknown }).id);
      if (Number.isFinite(id) && id > 0) ids.push(id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

/** Toàn bộ danh mục kho (modal nhập/bán / picker). `ton_kho` = Σ nhập − Σ bán theo phiếu, không đọc cột DB. */
export async function fetchAllHoaCuSanPham(
  supabase: SupabaseClient,
  opts?: { chi_nhanh_id?: number | null; branchNames?: Map<number, string> },
): Promise<{ data: AdminHoaCuSanPham[]; error: string | null }> {
  let qb = supabase.from("hc_danh_sach_san_pham").select(KHO_SELECT_BASE);
  const branchId = opts?.chi_nhanh_id;
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    qb = qb.eq("chi_nhanh_id", branchId);
  }
  const tRes = await qb.order("ten_hang");
  if (tRes.error) return { data: [], error: tRes.error.message };
  const rawRows = (tRes.data ?? []) as Record<string, unknown>[];
  const pageIds = rawRows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);
  try {
    const tonMap =
      branchId != null && Number.isFinite(branchId) && branchId > 0
        ? await fetchTonKhoTheoPhieuForIds(supabase, pageIds)
        : await fetchTonKhoMapTuPhieuToanCuc(supabase);
    return { data: normalizeSanPham(rawRows, tonMap, opts?.branchNames), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không tổng hợp được tồn theo phiếu.";
    return { data: [], error: msg };
  }
}

function normalizeSanPham(
  rows: Record<string, unknown>[],
  tonTheoPhieu: Map<number, number>,
  branchNames?: Map<number, string>,
): AdminHoaCuSanPham[] {
  return rows
    .map((r) => {
      const id = Number(r.id);
      if (!Number.isFinite(id) || id <= 0) return null;
      const computedTon = Math.trunc(tonTheoPhieu.get(id) ?? 0);
      const chi_nhanh_id =
        r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id)) ? Number(r.chi_nhanh_id) : null;
      const chi_nhanh_ten =
        chi_nhanh_id != null && branchNames?.has(chi_nhanh_id) ? branchNames.get(chi_nhanh_id)! : null;
      return {
        id,
        ten_hang: String(r.ten_hang ?? "").trim() || "—",
        loai_san_pham: r.loai_san_pham != null ? String(r.loai_san_pham).trim() || null : null,
        gia_nhap: Number(r.gia_nhap) || 0,
        gia_ban: Number(r.gia_ban) || 0,
        ton_kho: computedTon,
        thumbnail: r.thumbnail != null ? String(r.thumbnail).trim() || null : null,
        chi_nhanh_id,
        chi_nhanh_ten,
      };
    })
    .filter((x): x is AdminHoaCuSanPham => x != null);
}

export async function fetchAdminHoaCuBundle(
  supabase: SupabaseClient,
  opts?: { ensureStaffId?: number },
): Promise<{ ok: true; data: AdminHoaCuBundle } | { ok: false; error: string }> {
  const { data: sp, error: spErr } = await fetchAllHoaCuSanPham(supabase);
  if (spErr) return { ok: false, error: spErr };

  const { data: nsRows, error: nsErr } = await supabase.from("hr_nhan_su").select("id, full_name").order("full_name");
  if (nsErr) return { ok: false, error: nsErr.message };
  const staffMap = new Map<number, string>();
  for (const r of nsRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    const name = String((r as { full_name?: unknown }).full_name ?? "").trim();
    if (Number.isFinite(id) && id > 0 && name) staffMap.set(id, name);
  }

  const vanHanhMarketingIds = await fetchVanHanhMarketingNhanSuIds(supabase);
  let staffOptions: AdminHoaCuStaffOpt[] = [...staffMap.entries()]
    .filter(([id]) => vanHanhMarketingIds.size === 0 || vanHanhMarketingIds.has(id))
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));

  const ensureId = opts?.ensureStaffId;
  if (ensureId != null && Number.isFinite(ensureId) && ensureId > 0 && !staffOptions.some((s) => s.id === ensureId)) {
    let full_name = staffMap.get(ensureId) ?? "";
    if (!full_name.trim()) {
      const { data: one } = await supabase.from("hr_nhan_su").select("full_name").eq("id", ensureId).maybeSingle();
      full_name = one?.full_name != null ? String(one.full_name).trim() : "";
    }
    if (full_name) {
      staffOptions = [...staffOptions, { id: ensureId, full_name }].sort((a, b) =>
        a.full_name.localeCompare(b.full_name, "vi"),
      );
    }
  }

  const { data: hvRows, error: hvErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id, full_name, avatar")
    .order("full_name")
    .limit(2500);
  if (hvErr) return { ok: false, error: hvErr.message };
  const studentBase = (hvRows ?? [])
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const full_name = String((r as { full_name?: unknown }).full_name ?? "").trim();
      const avRaw = (r as { avatar?: unknown }).avatar;
      const avatar =
        avRaw != null && String(avRaw).trim() !== "" ? String(avRaw).trim() : null;
      if (!Number.isFinite(id) || id <= 0 || !full_name) return null;
      return { id, full_name, avatar };
    })
    .filter((x): x is { id: number; full_name: string; avatar: string | null } => x != null);

  const tagByHv = await fetchStudentHocTagsByHvIds(
    supabase,
    studentBase.map((s) => s.id)
  );
  const studentOptions: AdminHoaCuHvOpt[] = studentBase.map((s) => ({
    ...s,
    hoc_tag: tagByHv.get(s.id) ?? null,
  }));

  const { data: nhapRecs, error: nhapErr } = await supabase
    .from("hc_nhap_hoa_cu")
    .select("id, created_at, nha_cung_cap, hinh_thuc_chi, nguoi_nhap, tong_tien, chi_nhanh_id")
    .order("created_at", { ascending: false })
    .limit(300);
  if (nhapErr) return { ok: false, error: nhapErr.message };

  const { data: banRows, error: banBranchErr } = await supabase.from("hr_ban").select("id, ten_ban");
  if (banBranchErr) return { ok: false, error: banBranchErr.message };
  const branchNames = new Map<number, string>();
  for (const b of banRows ?? []) {
    const id = Number((b as { id?: unknown }).id);
    const ten = String((b as { ten_ban?: unknown }).ten_ban ?? "").trim();
    if (Number.isFinite(id) && id > 0 && ten) branchNames.set(id, ten);
  }

  const nhapIds = (nhapRecs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  let nhapCtByDon = new Map<number, ChiNhapRow[]>();
  if (nhapIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_nhap_hoa_cu_chi_tiet")
      .select("don_nhap, so_luong_nhap, mat_hang, thanh_tien, hc_danh_sach_san_pham(gia_nhap, gia_ban)")
      .in("don_nhap", nhapIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    nhapCtByDon = groupByDon(ct as ChiNhapRow[], "don_nhap");
  }

  const donNhap: AdminHoaCuNhapDon[] = (nhapRecs ?? []).map((raw) => {
    const r = raw as {
      id: number;
      created_at: string;
      nha_cung_cap?: string | null;
      hinh_thuc_chi?: string | null;
      nguoi_nhap?: number | null;
      tong_tien?: unknown;
      chi_nhanh_id?: number | null;
    };
    const ct = nhapCtByDon.get(r.id) ?? [];
    const tong = tongTienHoaCuHeader(r.tong_tien, tongChiNhapLines(ct));
    const nv = r.nguoi_nhap != null ? staffMap.get(r.nguoi_nhap) ?? "—" : "—";
    const cid = r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id)) ? Number(r.chi_nhanh_id) : null;
    return {
      id: r.id,
      created_at: r.created_at,
      nha_cung_cap: r.nha_cung_cap ?? null,
      hinh_thuc_chi: r.hinh_thuc_chi ?? null,
      nguoi_nhap: r.nguoi_nhap ?? null,
      nguoi_nhap_name: nv,
      chi_nhanh_id: cid,
      chi_nhanh_ten: cid != null && branchNames.has(cid) ? branchNames.get(cid)! : null,
      so_mat_hang: ct.length,
      tong_tien: tong,
    };
  });

  const { data: banRecs, error: banErr } = await supabase
    .from("hc_don_ban_hoa_cu")
    .select("id, created_at, ma_don, ma_don_so, hinh_thuc_thu, status, nguoi_ban, khach_hang, tong_tien, chi_nhanh_id")
    .order("created_at", { ascending: false })
    .limit(300);
  if (banErr) return { ok: false, error: banErr.message };

  const hvMap = new Map(studentOptions.map((h) => [h.id, h.full_name]));
  const banIds = (banRecs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  let banCtByDon = new Map<number, ChiBanRow[]>();
  if (banIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_ban_hc_chi_tiet")
      .select("don_ban, so_luong_ban, mat_hang, thanh_tien, hc_danh_sach_san_pham(gia_nhap, gia_ban)")
      .in("don_ban", banIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    banCtByDon = groupByDon(ct as ChiBanRow[], "don_ban");
  }

  const donBan: AdminHoaCuBanDon[] = (banRecs ?? []).map((raw) => {
    const r = raw as {
      id: number;
      created_at: string;
      ma_don?: string | null;
      ma_don_so?: string | null;
      hinh_thuc_thu?: string | null;
      status?: string | null;
      nguoi_ban?: number | null;
      khach_hang?: number | null;
      tong_tien?: unknown;
      chi_nhanh_id?: number | null;
    };
    const ct = banCtByDon.get(r.id) ?? [];
    const tong = tongTienHoaCuHeader(r.tong_tien, tongChiBanLines(ct));
    const cid = r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id)) ? Number(r.chi_nhanh_id) : null;
    const codes = resolveBanDonCodes(r.id, r);
    return {
      id: r.id,
      created_at: r.created_at,
      ma_don: codes.ma_don,
      ma_don_so: codes.ma_don_so,
      hinh_thuc_thu: r.hinh_thuc_thu ?? null,
      status: r.status != null ? String(r.status) : null,
      nguoi_ban: r.nguoi_ban ?? null,
      khach_hang: r.khach_hang ?? null,
      nguoi_ban_name: r.nguoi_ban != null ? staffMap.get(r.nguoi_ban) ?? "—" : "—",
      khach_hang_name: r.khach_hang != null ? hvMap.get(r.khach_hang) ?? "—" : "—",
      chi_nhanh_id: cid,
      chi_nhanh_ten: cid != null && branchNames.has(cid) ? branchNames.get(cid)! : null,
      so_mat_hang: ct.length,
      tong_tien: tong,
    };
  });

  const sanPham = [...sp].sort((a, b) => {
    const ta = a.ton_kho > 0;
    const tb = b.ton_kho > 0;
    if (ta !== tb) return ta ? -1 : 1;
    return a.ten_hang.localeCompare(b.ten_hang, "vi");
  });

  return {
    ok: true,
    data: {
      sanPham,
      donNhap,
      donBan,
      staffOptions,
      studentOptions,
    },
  };
}

export type KhoSanPhamPage = {
  rows: AdminHoaCuSanPham[];
  total: number;
  page: number;
  pageSize: number;
};

/** Một trang danh mục kho + tổng bản ghi. `ton_kho` hiển thị = Σ nhập − Σ bán (không đọc cột DB). */
export async function fetchKhoSanPhamPage(
  supabase: SupabaseClient,
  opts: {
    page: number;
    pageSize?: number;
    q?: string | null;
    chi_nhanh_id?: number | null;
    branchNames?: Map<number, string>;
  },
): Promise<{ ok: true } & KhoSanPhamPage | { ok: false; error: string }> {
  const pageSize = opts.pageSize ?? HOA_CU_PAGE_SIZE;
  const page = Math.max(1, Math.floor(Number(opts.page)) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const rawQ = (opts.q ?? "").trim();
  const searchPat = rawQ ? `%${rawQ.replace(/%/g, "\\%")}%` : "";
  const branchId = opts.chi_nhanh_id;

  let qb = supabase.from("hc_danh_sach_san_pham").select(KHO_SELECT_BASE, { count: "exact" });
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    qb = qb.eq("chi_nhanh_id", branchId);
  }
  if (searchPat) {
    qb = qb.or(`ten_hang.ilike.${searchPat},loai_san_pham.ilike.${searchPat}`);
  }
  const res = await qb.order("ten_hang", { ascending: true }).order("id", { ascending: true }).range(from, to);
  if (res.error) return { ok: false, error: res.error.message };

  const rawRows = (res.data ?? []) as Record<string, unknown>[];
  const pageIds = rawRows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);
  try {
    const tonMap = await fetchTonKhoTheoPhieuForIds(supabase, pageIds);
    return {
      ok: true,
      rows: normalizeSanPham(rawRows, tonMap, opts.branchNames),
      total: res.count ?? 0,
      page,
      pageSize,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không tổng hợp được tồn theo phiếu.";
    return { ok: false, error: msg };
  }
}

async function fetchSanPhamIdsByBranch(
  supabase: SupabaseClient,
  chi_nhanh_id?: number | null,
): Promise<number[]> {
  const ids: number[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    let qb = supabase.from("hc_danh_sach_san_pham").select("id").order("id", { ascending: true });
    if (chi_nhanh_id != null && Number.isFinite(chi_nhanh_id) && chi_nhanh_id > 0) {
      qb = qb.eq("chi_nhanh_id", chi_nhanh_id);
    }
    const { data, error } = await qb.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) {
      const id = Number((r as { id: unknown }).id);
      if (Number.isFinite(id) && id > 0) ids.push(id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

/** Số mặt hàng, số hết tồn, Σ tồn — tồn theo phiếu (không dùng cột `ton_kho`). */
export async function fetchKhoInventoryStats(
  supabase: SupabaseClient,
  opts?: { chi_nhanh_id?: number | null },
): Promise<{ total: number; hetHang: number; tonSum: number }> {
  const branchId = opts?.chi_nhanh_id;
  let countQb = supabase.from("hc_danh_sach_san_pham").select("id", { count: "exact", head: true });
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    countQb = countQb.eq("chi_nhanh_id", branchId);
  }
  const totalRes = await countQb;
  const total = totalRes.count ?? 0;
  if (totalRes.error) {
    return { total: 0, hetHang: 0, tonSum: 0 };
  }

  if (total === 0) {
    return { total: 0, hetHang: 0, tonSum: 0 };
  }

  try {
    const ids = await fetchSanPhamIdsByBranch(supabase, branchId);
    const tonMap = await fetchTonKhoTheoPhieuForIds(supabase, ids);
    let hetHang = 0;
    let tonSum = 0;
    for (const id of ids) {
      const t = Math.trunc(tonMap.get(id) ?? 0);
      tonSum += t;
      if (t <= 0) hetHang += 1;
    }
    return { total, hetHang, tonSum };
  } catch {
    return { total, hetHang: 0, tonSum: 0 };
  }
}

export type DonNhapPage = {
  rows: AdminHoaCuNhapDon[];
  total: number;
  page: number;
  pageSize: number;
};

export type DonBanPage = {
  rows: AdminHoaCuBanDon[];
  total: number;
  page: number;
  pageSize: number;
};

export type DonChuyenPage = {
  rows: AdminHoaCuChuyenDon[];
  total: number;
  page: number;
  pageSize: number;
};

export type HoaCuStaffStudentContext = {
  staffOptions: AdminHoaCuStaffOpt[];
  studentOptions: AdminHoaCuHvOpt[];
  staffMap: Map<number, string>;
  hvMap: Map<number, string>;
};

/** Nhân sự + học viên cho đơn bán / tên người nhập — tái sử dụng giữa các trang. */
export async function fetchHoaCuStaffStudentContext(
  supabase: SupabaseClient,
  opts?: { ensureStaffId?: number },
): Promise<{ ok: true; data: HoaCuStaffStudentContext } | { ok: false; error: string }> {
  const { data: nsRows, error: nsErr } = await supabase.from("hr_nhan_su").select("id, full_name").order("full_name");
  if (nsErr) return { ok: false, error: nsErr.message };
  const staffMap = new Map<number, string>();
  for (const r of nsRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    const name = String((r as { full_name?: unknown }).full_name ?? "").trim();
    if (Number.isFinite(id) && id > 0 && name) staffMap.set(id, name);
  }

  const vanHanhMarketingIds = await fetchVanHanhMarketingNhanSuIds(supabase);
  let staffOptions: AdminHoaCuStaffOpt[] = [...staffMap.entries()]
    .filter(([id]) => vanHanhMarketingIds.size === 0 || vanHanhMarketingIds.has(id))
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));

  const ensureId = opts?.ensureStaffId;
  if (ensureId != null && Number.isFinite(ensureId) && ensureId > 0 && !staffOptions.some((s) => s.id === ensureId)) {
    let full_name = staffMap.get(ensureId) ?? "";
    if (!full_name.trim()) {
      const { data: one } = await supabase.from("hr_nhan_su").select("full_name").eq("id", ensureId).maybeSingle();
      full_name = one?.full_name != null ? String(one.full_name).trim() : "";
    }
    if (full_name) {
      staffOptions = [...staffOptions, { id: ensureId, full_name }].sort((a, b) =>
        a.full_name.localeCompare(b.full_name, "vi"),
      );
    }
  }

  const { data: hvRows, error: hvErr } = await supabase
    .from("ql_thong_tin_hoc_vien")
    .select("id, full_name, avatar")
    .order("full_name")
    .limit(2500);
  if (hvErr) return { ok: false, error: hvErr.message };

  const studentBase = (hvRows ?? [])
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const full_name = String((r as { full_name?: unknown }).full_name ?? "").trim();
      const avRaw = (r as { avatar?: unknown }).avatar;
      const avatar = avRaw != null && String(avRaw).trim() !== "" ? String(avRaw).trim() : null;
      if (!Number.isFinite(id) || id <= 0 || !full_name) return null;
      return { id, full_name, avatar };
    })
    .filter((x): x is { id: number; full_name: string; avatar: string | null } => x != null);

  const tagByHv = await fetchStudentHocTagsByHvIds(
    supabase,
    studentBase.map((s) => s.id),
  );
  const studentOptions: AdminHoaCuHvOpt[] = studentBase.map((s) => ({
    ...s,
    hoc_tag: tagByHv.get(s.id) ?? null,
  }));

  const hvMap = new Map(studentOptions.map((h) => [h.id, h.full_name]));

  return {
    ok: true,
    data: { staffOptions, studentOptions, staffMap, hvMap },
  };
}

export async function fetchDonNhapPage(
  supabase: SupabaseClient,
  ctx: HoaCuStaffStudentContext,
  opts: { page: number; pageSize?: number; chi_nhanh_id?: number | null; branchNames?: Map<number, string> },
): Promise<{ ok: true } & DonNhapPage | { ok: false; error: string }> {
  const pageSize = opts.pageSize ?? HOA_CU_PAGE_SIZE;
  const page = Math.max(1, Math.floor(Number(opts.page)) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const branchNames = opts.branchNames;

  const { staffMap } = ctx;

  let qb = supabase
    .from("hc_nhap_hoa_cu")
    .select("id, created_at, nha_cung_cap, hinh_thuc_chi, nguoi_nhap, tong_tien, chi_nhanh_id", { count: "exact" });
  const branchId = opts.chi_nhanh_id;
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    qb = qb.eq("chi_nhanh_id", branchId);
  }
  const { data: nhapRecs, error: nhapErr, count } = await qb.order("created_at", { ascending: false }).range(from, to);

  if (nhapErr) return { ok: false, error: nhapErr.message };

  const nhapIds = (nhapRecs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  let nhapCtByDon = new Map<number, ChiNhapRow[]>();
  if (nhapIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_nhap_hoa_cu_chi_tiet")
      .select("don_nhap, so_luong_nhap, mat_hang, thanh_tien, hc_danh_sach_san_pham(gia_nhap, gia_ban)")
      .in("don_nhap", nhapIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    nhapCtByDon = groupByDon(ct as ChiNhapRow[], "don_nhap");
  }

  const donNhap: AdminHoaCuNhapDon[] = (nhapRecs ?? []).map((raw) => {
    const r = raw as {
      id: number;
      created_at: string;
      nha_cung_cap?: string | null;
      hinh_thuc_chi?: string | null;
      nguoi_nhap?: number | null;
      tong_tien?: unknown;
      chi_nhanh_id?: number | null;
    };
    const ct = nhapCtByDon.get(r.id) ?? [];
    const tong = tongTienHoaCuHeader(r.tong_tien, tongChiNhapLines(ct));
    const nv = r.nguoi_nhap != null ? staffMap.get(r.nguoi_nhap) ?? "—" : "—";
    const cid = r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id)) ? Number(r.chi_nhanh_id) : null;
    return {
      id: r.id,
      created_at: r.created_at,
      nha_cung_cap: r.nha_cung_cap ?? null,
      hinh_thuc_chi: r.hinh_thuc_chi ?? null,
      nguoi_nhap: r.nguoi_nhap ?? null,
      nguoi_nhap_name: nv,
      chi_nhanh_id: cid,
      chi_nhanh_ten: cid != null && branchNames?.has(cid) ? branchNames.get(cid)! : null,
      so_mat_hang: ct.length,
      tong_tien: tong,
    };
  });

  return {
    ok: true,
    rows: donNhap,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function fetchDonBanPage(
  supabase: SupabaseClient,
  ctx: HoaCuStaffStudentContext,
  opts: { page: number; pageSize?: number; q?: string | null; chi_nhanh_id?: number | null; branchNames?: Map<number, string> },
): Promise<{ ok: true } & DonBanPage | { ok: false; error: string }> {
  const pageSize = opts.pageSize ?? HOA_CU_PAGE_SIZE;
  const page = Math.max(1, Math.floor(Number(opts.page)) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const branchNames = opts.branchNames;

  const { staffMap, hvMap } = ctx;

  let qb = supabase
    .from("hc_don_ban_hoa_cu")
    .select("id, created_at, ma_don, ma_don_so, hinh_thuc_thu, status, nguoi_ban, khach_hang, tong_tien, chi_nhanh_id", { count: "exact" });
  const branchId = opts.chi_nhanh_id;
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    qb = qb.eq("chi_nhanh_id", branchId);
  }
  const searchOr = buildBanDonSearchOr((opts.q ?? "").trim(), { staffMap, hvMap });
  if (searchOr) qb = qb.or(searchOr);
  const { data: banRecs, error: banErr, count } = await qb.order("created_at", { ascending: false }).range(from, to);

  if (banErr) return { ok: false, error: banErr.message };

  const banIds = (banRecs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  let banCtByDon = new Map<number, ChiBanRow[]>();
  if (banIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_ban_hc_chi_tiet")
      .select("don_ban, so_luong_ban, mat_hang, thanh_tien, hc_danh_sach_san_pham(gia_nhap, gia_ban)")
      .in("don_ban", banIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    banCtByDon = groupByDon(ct as ChiBanRow[], "don_ban");
  }

  const donBan: AdminHoaCuBanDon[] = (banRecs ?? []).map((raw) => {
    const r = raw as {
      id: number;
      created_at: string;
      ma_don?: string | null;
      ma_don_so?: string | null;
      hinh_thuc_thu?: string | null;
      status?: string | null;
      nguoi_ban?: number | null;
      khach_hang?: number | null;
      tong_tien?: unknown;
      chi_nhanh_id?: number | null;
    };
    const ct = banCtByDon.get(r.id) ?? [];
    const tong = tongTienHoaCuHeader(r.tong_tien, tongChiBanLines(ct));
    const cid = r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id)) ? Number(r.chi_nhanh_id) : null;
    const codes = resolveBanDonCodes(r.id, r);
    return {
      id: r.id,
      created_at: r.created_at,
      ma_don: codes.ma_don,
      ma_don_so: codes.ma_don_so,
      hinh_thuc_thu: r.hinh_thuc_thu ?? null,
      status: r.status != null ? String(r.status) : null,
      nguoi_ban: r.nguoi_ban ?? null,
      khach_hang: r.khach_hang ?? null,
      nguoi_ban_name: r.nguoi_ban != null ? staffMap.get(r.nguoi_ban) ?? "—" : "—",
      khach_hang_name: r.khach_hang != null ? hvMap.get(r.khach_hang) ?? "—" : "—",
      chi_nhanh_id: cid,
      chi_nhanh_ten: cid != null && branchNames?.has(cid) ? branchNames.get(cid)! : null,
      so_mat_hang: ct.length,
      tong_tien: tong,
    };
  });

  return {
    ok: true,
    rows: donBan,
    total: count ?? 0,
    page,
    pageSize,
  };
}

type ChiChuyenRow = { don_chuyen?: number };

export async function fetchDonChuyenPage(
  supabase: SupabaseClient,
  ctx: HoaCuStaffStudentContext,
  opts: { page: number; pageSize?: number; branchNames: Map<number, string> },
): Promise<{ ok: true } & DonChuyenPage | { ok: false; error: string }> {
  const pageSize = opts.pageSize ?? HOA_CU_PAGE_SIZE;
  const page = Math.max(1, Math.floor(Number(opts.page)) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { staffMap } = ctx;
  const branchNames = opts.branchNames;

  const { data: recs, error, count } = await supabase
    .from("hc_chuyen_kho")
    .select("id, created_at, nguoi_chuyen, chi_nhanh_nguon, chi_nhanh_dich, ghi_chu", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("does not exist") || msg.includes("schema") || msg.includes("relation")) {
      return { ok: true, rows: [], total: 0, page, pageSize };
    }
    return { ok: false, error: error.message };
  }

  const donIds = (recs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  const ctCountByDon = new Map<number, number>();
  if (donIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_chuyen_kho_chi_tiet")
      .select("don_chuyen")
      .in("don_chuyen", donIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    for (const row of ct ?? []) {
      const did = Number((row as ChiChuyenRow).don_chuyen);
      if (!Number.isFinite(did) || did <= 0) continue;
      ctCountByDon.set(did, (ctCountByDon.get(did) ?? 0) + 1);
    }
  }

  const rows: AdminHoaCuChuyenDon[] = (recs ?? []).map((raw) => {
    const r = raw as {
      id: number;
      created_at: string;
      nguoi_chuyen?: number | null;
      chi_nhanh_nguon?: number | null;
      chi_nhanh_dich?: number | null;
      ghi_chu?: string | null;
    };
    const src = Number(r.chi_nhanh_nguon);
    const dst = Number(r.chi_nhanh_dich);
    return {
      id: r.id,
      created_at: r.created_at,
      nguoi_chuyen: r.nguoi_chuyen ?? null,
      nguoi_chuyen_name: r.nguoi_chuyen != null ? staffMap.get(r.nguoi_chuyen) ?? "—" : "—",
      chi_nhanh_nguon: src,
      chi_nhanh_nguon_ten: branchNames.get(src) ?? (Number.isFinite(src) ? `#${src}` : "—"),
      chi_nhanh_dich: dst,
      chi_nhanh_dich_ten: branchNames.get(dst) ?? (Number.isFinite(dst) ? `#${dst}` : "—"),
      so_mat_hang: ctCountByDon.get(r.id) ?? 0,
      ghi_chu: r.ghi_chu != null ? String(r.ghi_chu).trim() || null : null,
    };
  });

  return { ok: true, rows, total: count ?? 0, page, pageSize };
}
