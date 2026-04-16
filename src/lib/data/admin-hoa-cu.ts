import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveHinhThucFromMon } from "@/lib/data/courses-page";

const KHO_SELECT =
  "id, ten_hang, loai_san_pham, gia_nhap, gia_ban, ton_kho, thumbnail";

export type AdminHoaCuSanPham = {
  id: number;
  ten_hang: string;
  loai_san_pham: string | null;
  gia_nhap: number;
  gia_ban: number;
  ton_kho: number;
  thumbnail: string | null;
};

export type AdminHoaCuNhapDon = {
  id: number;
  created_at: string;
  nha_cung_cap: string | null;
  nguoi_nhap: number | null;
  nguoi_nhap_name: string;
  so_mat_hang: number;
  tong_tien: number;
};

export type AdminHoaCuBanDon = {
  id: number;
  created_at: string;
  hinh_thuc_thu: string | null;
  nguoi_ban: number | null;
  khach_hang: number | null;
  nguoi_ban_name: string;
  khach_hang_name: string;
  so_mat_hang: number;
  tong_tien: number;
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
  hc_danh_sach_san_pham?: { gia_nhap?: number | null; gia_ban?: number | null } | null;
};

type ChiBanRow = {
  don_ban: number;
  so_luong_ban: number | null;
  mat_hang: number | null;
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

    for (const raw of data as Record<string, unknown>[]) {
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

async function fetchSanPham(supabase: SupabaseClient): Promise<{ data: AdminHoaCuSanPham[]; error: string | null }> {
  const viewRes = await supabase.from("hc_danh_sach_san_pham_view").select(KHO_SELECT).order("ten_hang");
  if (!viewRes.error && viewRes.data) {
    return { data: normalizeSanPham(viewRes.data), error: null };
  }
  const tRes = await supabase.from("hc_danh_sach_san_pham").select(KHO_SELECT).order("ten_hang");
  if (tRes.error) return { data: [], error: tRes.error.message };
  return { data: normalizeSanPham(tRes.data ?? []), error: null };
}

function normalizeSanPham(rows: Record<string, unknown>[]): AdminHoaCuSanPham[] {
  return rows
    .map((r) => {
      const id = Number(r.id);
      if (!Number.isFinite(id) || id <= 0) return null;
      return {
        id,
        ten_hang: String(r.ten_hang ?? "").trim() || "—",
        loai_san_pham: r.loai_san_pham != null ? String(r.loai_san_pham).trim() || null : null,
        gia_nhap: Number(r.gia_nhap) || 0,
        gia_ban: Number(r.gia_ban) || 0,
        ton_kho: Number(r.ton_kho) || 0,
        thumbnail: r.thumbnail != null ? String(r.thumbnail).trim() || null : null,
      };
    })
    .filter((x): x is AdminHoaCuSanPham => x != null);
}

export async function fetchAdminHoaCuBundle(supabase: SupabaseClient): Promise<
  { ok: true; data: AdminHoaCuBundle } | { ok: false; error: string }
> {
  const { data: sp, error: spErr } = await fetchSanPham(supabase);
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
  const staffOptions: AdminHoaCuStaffOpt[] = [...staffMap.entries()]
    .filter(([id]) => vanHanhMarketingIds.size === 0 || vanHanhMarketingIds.has(id))
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));

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
    .select("id, created_at, nha_cung_cap, nguoi_nhap")
    .order("created_at", { ascending: false })
    .limit(300);
  if (nhapErr) return { ok: false, error: nhapErr.message };

  const nhapIds = (nhapRecs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  let nhapCtByDon = new Map<number, ChiNhapRow[]>();
  if (nhapIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_nhap_hoa_cu_chi_tiet")
      .select("don_nhap, so_luong_nhap, mat_hang, hc_danh_sach_san_pham(gia_nhap, gia_ban)")
      .in("don_nhap", nhapIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    nhapCtByDon = groupByDon(ct as ChiNhapRow[], "don_nhap");
  }

  const donNhap: AdminHoaCuNhapDon[] = (nhapRecs ?? []).map((raw) => {
    const r = raw as { id: number; created_at: string; nha_cung_cap?: string | null; nguoi_nhap?: number | null };
    const ct = nhapCtByDon.get(r.id) ?? [];
    const tong = ct.reduce((s, c) => {
      const { gia_nhap } = unwrapSp(c.hc_danh_sach_san_pham);
      return s + gia_nhap * (Number(c.so_luong_nhap) || 1);
    }, 0);
    const nv = r.nguoi_nhap != null ? staffMap.get(r.nguoi_nhap) ?? "—" : "—";
    return {
      id: r.id,
      created_at: r.created_at,
      nha_cung_cap: r.nha_cung_cap ?? null,
      nguoi_nhap: r.nguoi_nhap ?? null,
      nguoi_nhap_name: nv,
      so_mat_hang: ct.length,
      tong_tien: tong,
    };
  });

  const { data: banRecs, error: banErr } = await supabase
    .from("hc_don_ban_hoa_cu")
    .select("id, created_at, hinh_thuc_thu, nguoi_ban, khach_hang")
    .order("created_at", { ascending: false })
    .limit(300);
  if (banErr) return { ok: false, error: banErr.message };

  const hvMap = new Map(studentOptions.map((h) => [h.id, h.full_name]));
  const banIds = (banRecs ?? []).map((r) => Number((r as { id?: unknown }).id)).filter((id) => id > 0);
  let banCtByDon = new Map<number, ChiBanRow[]>();
  if (banIds.length) {
    const { data: ct, error: ctErr } = await supabase
      .from("hc_ban_hc_chi_tiet")
      .select("don_ban, so_luong_ban, mat_hang, hc_danh_sach_san_pham(gia_nhap, gia_ban)")
      .in("don_ban", banIds);
    if (ctErr) return { ok: false, error: ctErr.message };
    banCtByDon = groupByDon(ct as ChiBanRow[], "don_ban");
  }

  const donBan: AdminHoaCuBanDon[] = (banRecs ?? []).map((raw) => {
    const r = raw as {
      id: number;
      created_at: string;
      hinh_thuc_thu?: string | null;
      nguoi_ban?: number | null;
      khach_hang?: number | null;
    };
    const ct = banCtByDon.get(r.id) ?? [];
    const tong = ct.reduce((s, c) => {
      const { gia_ban } = unwrapSp(c.hc_danh_sach_san_pham);
      return s + gia_ban * (Number(c.so_luong_ban) || 1);
    }, 0);
    return {
      id: r.id,
      created_at: r.created_at,
      hinh_thuc_thu: r.hinh_thuc_thu ?? null,
      nguoi_ban: r.nguoi_ban ?? null,
      khach_hang: r.khach_hang ?? null,
      nguoi_ban_name: r.nguoi_ban != null ? staffMap.get(r.nguoi_ban) ?? "—" : "—",
      khach_hang_name: r.khach_hang != null ? hvMap.get(r.khach_hang) ?? "—" : "—",
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
