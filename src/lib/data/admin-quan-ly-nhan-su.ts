import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizePortfolioToUrls } from "@/lib/data/courses-page";

/** Một dòng `hr_nhan_su` (không gồm `password`). */
export type AdminNhanSuRow = {
  id: number;
  created_at: string | null;
  full_name: string | null;
  sdt: string | null;
  email: string | null;
  avatar: string | null;
  bank_name: string | null;
  bank_stk: string | null;
  stk_nhan_luong: string | null;
  chi_nhanh_id: number | null;
  status: string | null;
  ghi_chu: string | null;
  hinh_thuc_tinh_luong: string | null;
  luong_co_ban: number | null;
  tro_cap: number | null;
  bhxh: number | null;
  so_buoi_nghi_toi_da: number | null;
  ngay_sinh: string | null;
  sa_startdate: string | null;
  facebook: string | null;
  hop_dong_lao_dong: string | null;
  thong_tin_khac: string | null;
  vai_tro: string | null;
  ban: number | null;
  portfolio: string[];
  bio: string | null;
  nam_kinh_nghiem: number | null;
  rate_thuong_co_ban: number | null;
  rate_thuong_hoc_vien: number | null;
};

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("column") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
}

function nNum(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function nInt(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function mapRow(raw: Record<string, unknown>): AdminNhanSuRow {
  const id = Number(raw.id);
  const bankStk = raw.bank_stk != null ? String(raw.bank_stk).trim() || null : null;
  const stkNhan = raw.stk_nhan_luong != null ? String(raw.stk_nhan_luong).trim() || null : null;
  const bhxhRaw = raw.BHXH ?? raw.bhxh;

  return {
    id: Number.isFinite(id) && id > 0 ? id : 0,
    created_at: raw.created_at != null ? String(raw.created_at) : null,
    full_name: raw.full_name != null ? String(raw.full_name).trim() || null : null,
    sdt: raw.sdt != null ? String(raw.sdt).trim() || null : null,
    email: raw.email != null ? String(raw.email).trim() || null : null,
    avatar: raw.avatar != null ? String(raw.avatar).trim() || null : null,
    bank_name: raw.bank_name != null ? String(raw.bank_name).trim() || null : null,
    bank_stk: bankStk,
    stk_nhan_luong: stkNhan,
    chi_nhanh_id:
      raw.chi_nhanh_id != null && Number.isFinite(Number(raw.chi_nhanh_id))
        ? Number(raw.chi_nhanh_id)
        : null,
    status: raw.status != null ? String(raw.status).trim() || null : null,
    ghi_chu: raw.ghi_chu != null ? String(raw.ghi_chu).trim() || null : null,
    hinh_thuc_tinh_luong:
      raw.hinh_thuc_tinh_luong != null ? String(raw.hinh_thuc_tinh_luong).trim() || null : null,
    luong_co_ban: nNum(raw.luong_co_ban),
    tro_cap: nNum(raw.tro_cap),
    bhxh: nNum(bhxhRaw),
    so_buoi_nghi_toi_da: nInt(raw.so_buoi_nghi_toi_da),
    ngay_sinh: raw.ngay_sinh != null ? String(raw.ngay_sinh).trim().slice(0, 10) || null : null,
    sa_startdate: raw.sa_startdate != null ? String(raw.sa_startdate).trim().slice(0, 10) || null : null,
    facebook: raw.facebook != null ? String(raw.facebook).trim() || null : null,
    hop_dong_lao_dong: raw.hop_dong_lao_dong != null ? String(raw.hop_dong_lao_dong).trim() || null : null,
    thong_tin_khac: raw.thong_tin_khac != null ? String(raw.thong_tin_khac).trim() || null : null,
    vai_tro: raw.vai_tro != null ? String(raw.vai_tro).trim() || null : null,
    ban: raw.ban != null && Number.isFinite(Number(raw.ban)) ? Number(raw.ban) : null,
    portfolio: normalizePortfolioToUrls(raw.portfolio),
    bio: raw.bio != null ? String(raw.bio).trim() || null : null,
    nam_kinh_nghiem: nInt(raw.nam_kinh_nghiem),
    rate_thuong_co_ban: nNum(raw.rate_thuong_co_ban),
    rate_thuong_hoc_vien: nNum(raw.rate_thuong_hoc_vien),
  };
}

/** Cột đúng schema production (PostgREST: `BHXH` cần nháy kép). */
const SELECT_FULL =
  'id, created_at, full_name, sdt, email, avatar, bank_name, bank_stk, chi_nhanh_id, status, ghi_chu, rate_thuong_co_ban, rate_thuong_hoc_vien, hinh_thuc_tinh_luong, luong_co_ban, tro_cap, "BHXH", so_buoi_nghi_toi_da, ngay_sinh, sa_startdate, facebook, stk_nhan_luong, hop_dong_lao_dong, thong_tin_khac, vai_tro, ban, portfolio, bio, nam_kinh_nghiem';

const SELECT_NO_BHXH =
  "id, created_at, full_name, sdt, email, avatar, bank_name, bank_stk, chi_nhanh_id, status, ghi_chu, rate_thuong_co_ban, rate_thuong_hoc_vien, hinh_thuc_tinh_luong, luong_co_ban, tro_cap, so_buoi_nghi_toi_da, ngay_sinh, sa_startdate, facebook, stk_nhan_luong, hop_dong_lao_dong, thong_tin_khac, vai_tro, ban, portfolio, bio, nam_kinh_nghiem";

const SELECT_MIN = "id, full_name, sdt, email, avatar";

async function fetchStaffRows(
  supabase: SupabaseClient
): Promise<{ rows: AdminNhanSuRow[]; usedMinimalSelect: boolean; error: string | null }> {
  const attempts = [SELECT_FULL, SELECT_NO_BHXH, SELECT_MIN];
  let usedMinimalSelect = false;

  for (const select of attempts) {
    const { data, error } = await supabase
      .from("hr_nhan_su")
      .select(select)
      .order("full_name", { ascending: true });

    if (!error) {
      if (select === SELECT_MIN) usedMinimalSelect = true;
      const list = (data ?? []) as unknown as Record<string, unknown>[];
      return {
        rows: list.map(mapRow).filter((r) => r.id > 0),
        usedMinimalSelect,
        error: null,
      };
    }

    const msg = error.message ?? "";
    if (!isMissingColumnError(msg)) {
      return { rows: [], usedMinimalSelect: false, error: msg };
    }
  }

  return { rows: [], usedMinimalSelect: false, error: "Không đọc được hr_nhan_su." };
}

/** Một dòng `hr_bang_tinh_luong` + kỳ điểm danh (từ `hr_lich_diem_danh.bang_tinh_luong`) — cùng logic Framer `VH_Bang_tinh_luong`. */
export type AdminBangTinhLuongListItem = {
  id: number;
  nhan_vien: number;
  created_at: string | null;
  tam_ung: number | null;
  thuong: number | null;
  luong_co_ban: number | null;
  tro_cap: number | null;
  lich_diem_danh: number | null;
  ky_thang: string | null;
  ky_nam: string | null;
  so_buoi_lam_viec: number | null;
  so_buoi_nghi_trong_thang: number | null;
  tong_buoi_lam_viec_trong_thang: number | null;
};

export type AdminPhongOption = { id: number; ten: string };

export async function fetchAdminQuanLyNhanSuBundle(supabase: SupabaseClient): Promise<{
  staff: AdminNhanSuRow[];
  chiNhanhById: Record<number, string>;
  banById: Record<number, string>;
  /** Chuỗi tên phòng (hr_phong), cách nhau bởi dấu phẩy — cùng nguồn `hr_nhan_su_phong` như Framer. */
  phongBanByStaffId: Record<number, string>;
  /** Danh sách `phong_id` theo nhân sự (`hr_nhan_su_phong`). */
  phongIdsByStaffId: Record<number, number[]>;
  /** Toàn bộ phòng để gán trong admin (`hr_phong`). */
  allPhongOptions: AdminPhongOption[];
  /** `phong_id` → `hr_ban.id` từ cột `hr_phong.ban` (nếu có trong DB). */
  phongToBanId: Record<number, number>;
  /** Ban hiển thị: hợp nhất `hr_nhan_su.ban` + ban suy ra từ các phòng đã gán. */
  banIdsByStaffId: Record<number, number[]>;
  bangTinhLuongByStaffId: Record<number, AdminBangTinhLuongListItem[]>;
  error: string | null;
  usedMinimalSelect: boolean;
}> {
  const { rows, usedMinimalSelect, error } = await fetchStaffRows(supabase);
  if (error) {
    return {
      staff: [],
      chiNhanhById: {},
      banById: {},
      phongBanByStaffId: {},
      phongIdsByStaffId: {},
      allPhongOptions: [],
      phongToBanId: {},
      banIdsByStaffId: {},
      bangTinhLuongByStaffId: {},
      error,
      usedMinimalSelect,
    };
  }

  const staffIds: number[] = [];
  for (const r of rows) {
    if (r.id > 0) staffIds.push(r.id);
  }

  const [cnRes, nvPhongRes] = await Promise.all([
    supabase.from("ql_chi_nhanh").select("id, ten").order("id", { ascending: true }),
    staffIds.length
      ? supabase.from("hr_nhan_su_phong").select("nhan_su_id, phong_id").in("nhan_su_id", staffIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  const chiNhanhById: Record<number, string> = {};
  if (!cnRes.error && cnRes.data) {
    for (const r of cnRes.data as unknown as Record<string, unknown>[]) {
      const id = Number(r.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      chiNhanhById[id] = String(r.ten ?? "").trim() || `Chi nhánh #${id}`;
    }
  }

  const phongIds = new Set<number>();
  const phongIdsByStaff = new Map<number, number[]>();
  if (!nvPhongRes.error && nvPhongRes.data) {
    for (const r of nvPhongRes.data as unknown as Record<string, unknown>[]) {
      const sid = Number(r.nhan_su_id);
      const pid = Number(r.phong_id);
      if (!Number.isFinite(sid) || sid <= 0 || !Number.isFinite(pid) || pid <= 0) continue;
      phongIds.add(pid);
      const cur = phongIdsByStaff.get(sid) ?? [];
      if (!cur.includes(pid)) cur.push(pid);
      phongIdsByStaff.set(sid, cur);
    }
  }

  const phongTenById = new Map<number, string>();
  const phongToBanId: Record<number, number> = {};

  const ingestPhongRow = (raw: Record<string, unknown>) => {
    const id = Number(raw.id);
    if (!Number.isFinite(id) || id <= 0) return;
    phongTenById.set(id, String(raw.ten_phong ?? "").trim() || `Phòng #${id}`);
    const bRaw = raw.ban;
    if (bRaw != null && Number.isFinite(Number(bRaw)) && Number(bRaw) > 0) {
      phongToBanId[id] = Number(bRaw);
    }
  };

  if (phongIds.size > 0) {
    let pr = await supabase.from("hr_phong").select("id, ten_phong, ban").in("id", [...phongIds]);
    if (pr.error && isMissingColumnError(pr.error.message ?? "")) {
      pr = await supabase.from("hr_phong").select("id, ten_phong").in("id", [...phongIds]);
    }
    if (!pr.error && pr.data) {
      for (const r of pr.data as unknown as Record<string, unknown>[]) {
        ingestPhongRow(r);
      }
    }
  }

  const phongBanByStaffId: Record<number, string> = {};
  const phongIdsByStaffId: Record<number, number[]> = {};
  for (const [sid, pids] of phongIdsByStaff) {
    const names = pids
      .map((pid) => phongTenById.get(pid))
      .filter((t): t is string => Boolean(t && t.length > 0));
    names.sort((a, b) => a.localeCompare(b, "vi"));
    if (names.length) phongBanByStaffId[sid] = names.join(", ");
    phongIdsByStaffId[sid] = [...pids].sort((a, b) => a - b);
  }

  let allPhongOptions: AdminPhongOption[] = [];
  let apRes = await supabase.from("hr_phong").select("id, ten_phong, ban").order("ten_phong", { ascending: true });
  if (apRes.error && isMissingColumnError(apRes.error.message ?? "")) {
    apRes = await supabase.from("hr_phong").select("id, ten_phong").order("ten_phong", { ascending: true });
  }
  if (!apRes.error && apRes.data) {
    for (const r of apRes.data as unknown as Record<string, unknown>[]) {
      ingestPhongRow(r);
    }
    allPhongOptions = (apRes.data as unknown as Record<string, unknown>[]).map((r) => {
      const id = Number(r.id);
      return {
        id: Number.isFinite(id) && id > 0 ? id : 0,
        ten: String(r.ten_phong ?? "").trim() || `Phòng #${id}`,
      };
    }).filter((x) => x.id > 0);
  }

  const allBanIds = new Set<number>();
  for (const r of rows) {
    if (r.ban != null && r.ban > 0) allBanIds.add(r.ban);
  }
  for (const bid of Object.values(phongToBanId)) {
    if (bid > 0) allBanIds.add(bid);
  }

  const banById: Record<number, string> = {};
  if (allBanIds.size > 0) {
    const banRes = await supabase.from("hr_ban").select("id, ten_ban").in("id", [...allBanIds]);
    if (!banRes.error && banRes.data) {
      for (const r of banRes.data as unknown as Record<string, unknown>[]) {
        const id = Number(r.id);
        if (!Number.isFinite(id) || id <= 0) continue;
        banById[id] = String(r.ten_ban ?? "").trim() || `Ban #${id}`;
      }
    }
  }

  const banIdsByStaffId: Record<number, number[]> = {};
  for (const r of rows) {
    if (r.id <= 0) continue;
    const set = new Set<number>();
    if (r.ban != null && r.ban > 0) set.add(r.ban);
    const pids = phongIdsByStaff.get(r.id) ?? [];
    for (const pid of pids) {
      const b = phongToBanId[pid];
      if (b != null && b > 0) set.add(b);
    }
    banIdsByStaffId[r.id] = [...set].sort((a, b) => a - b);
  }

  const bangTinhLuongByStaffId = await fetchBangTinhLuongByStaffId(supabase, staffIds);

  return {
    staff: rows,
    chiNhanhById,
    banById,
    phongBanByStaffId,
    phongIdsByStaffId,
    allPhongOptions,
    phongToBanId,
    banIdsByStaffId,
    bangTinhLuongByStaffId,
    error: null,
    usedMinimalSelect,
  };
}

function nNumBang(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function mapBangListRow(
  raw: Record<string, unknown>,
  lich: {
    thang: string | null;
    nam: string | null;
    so_buoi_lam_viec: number | null;
    so_buoi_nghi_trong_thang: number | null;
    tong_buoi_lam_viec_trong_thang: number | null;
  } | null
): AdminBangTinhLuongListItem {
  const id = Number(raw.id);
  const nv = Number(raw.nhan_vien);
  return {
    id: Number.isFinite(id) && id > 0 ? id : 0,
    nhan_vien: Number.isFinite(nv) && nv > 0 ? nv : 0,
    created_at: raw.created_at != null ? String(raw.created_at) : null,
    tam_ung: nNumBang(raw.tam_ung),
    thuong: nNumBang(raw.thuong),
    luong_co_ban: nNumBang(raw.luong_co_ban),
    tro_cap: nNumBang(raw.tro_cap),
    lich_diem_danh: raw.lich_diem_danh != null && Number.isFinite(Number(raw.lich_diem_danh)) ? Number(raw.lich_diem_danh) : null,
    ky_thang: lich?.thang ?? null,
    ky_nam: lich?.nam ?? null,
    so_buoi_lam_viec: lich?.so_buoi_lam_viec ?? null,
    so_buoi_nghi_trong_thang: lich?.so_buoi_nghi_trong_thang ?? null,
    tong_buoi_lam_viec_trong_thang: lich?.tong_buoi_lam_viec_trong_thang ?? null,
  };
}

async function fetchBangTinhLuongByStaffId(
  supabase: SupabaseClient,
  staffIds: number[]
): Promise<Record<number, AdminBangTinhLuongListItem[]>> {
  const empty: Record<number, AdminBangTinhLuongListItem[]> = {};
  if (!staffIds.length) return empty;

  const selects = [
    "id, created_at, nhan_vien, tam_ung, thuong, luong_co_ban, tro_cap, lich_diem_danh",
    "id, created_at, nhan_vien, tam_ung, thuong",
  ];

  let bangRows: Record<string, unknown>[] = [];
  for (const sel of selects) {
    const { data, error } = await supabase
      .from("hr_bang_tinh_luong")
      .select(sel)
      .in("nhan_vien", staffIds)
      .order("id", { ascending: false });
    if (!error && data) {
      bangRows = data as unknown as Record<string, unknown>[];
      break;
    }
  }

  if (!bangRows.length) return empty;

  const bangIds = bangRows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id) && id > 0);
  const lichFirstByBang = new Map<
    number,
    {
      thang: string | null;
      nam: string | null;
      so_buoi_lam_viec: number | null;
      so_buoi_nghi_trong_thang: number | null;
      tong_buoi_lam_viec_trong_thang: number | null;
    }
  >();

  if (bangIds.length > 0) {
    const { data: lichData, error: lichErr } = await supabase
      .from("hr_lich_diem_danh")
      .select("id, bang_tinh_luong, thang, nam, so_buoi_lam_viec, so_buoi_nghi_trong_thang, tong_buoi_lam_viec_trong_thang")
      .in("bang_tinh_luong", bangIds)
      .order("id", { ascending: true });

    if (!lichErr && lichData) {
      for (const lr of lichData as unknown as Record<string, unknown>[]) {
        const bid = Number(lr.bang_tinh_luong);
        if (!Number.isFinite(bid) || bid <= 0) continue;
        if (lichFirstByBang.has(bid)) continue;
        lichFirstByBang.set(bid, {
          thang: lr.thang != null ? String(lr.thang).trim() || null : null,
          nam: lr.nam != null ? String(lr.nam).trim() || null : null,
          so_buoi_lam_viec: nNumBang(lr.so_buoi_lam_viec),
          so_buoi_nghi_trong_thang: nNumBang(lr.so_buoi_nghi_trong_thang),
          tong_buoi_lam_viec_trong_thang: nNumBang(lr.tong_buoi_lam_viec_trong_thang),
        });
      }
    }
  }

  const byStaff: Record<number, AdminBangTinhLuongListItem[]> = {};
  for (const raw of bangRows) {
    const id = Number(raw.id);
    const lich = Number.isFinite(id) && id > 0 ? lichFirstByBang.get(id) ?? null : null;
    const row = mapBangListRow(raw, lich);
    if (row.nhan_vien <= 0) continue;
    const cur = byStaff[row.nhan_vien] ?? [];
    cur.push(row);
    byStaff[row.nhan_vien] = cur;
  }

  return byStaff;
}
