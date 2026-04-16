import type { SupabaseClient } from "@supabase/supabase-js";

/** Dòng `tc_thu_chi_khac` + join hiển thị */
export type AdminThuChiKhacRow = {
  id: number;
  created_at: string;
  tieu_de: string;
  chu_thich: string | null;
  thu: number;
  chi: number;
  hinh_thuc: string | null;
  loai_thu_chi_id: number | null;
  nguoi_tao_id: number | null;
  nguoi_tao?: { full_name: string } | { full_name: string }[] | null;
  loai?: { giai_nghia: string; loai_thu_chi?: string } | { giai_nghia: string; loai_thu_chi?: string }[] | null;
};

export type AdminLoaiThuChiOpt = {
  id: number;
  giai_nghia: string;
  loai_thu_chi: string;
};

export type AdminThuChiStaffOpt = {
  id: number;
  full_name: string;
};

export type AdminThuChiKhacBundle = {
  records: AdminThuChiKhacRow[];
  staffOptions: AdminThuChiStaffOpt[];
  loaiOptions: AdminLoaiThuChiOpt[];
};

function unwrapOne<T extends Record<string, unknown>>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : v;
}

/** Nhân sự thuộc ban «Vận hành» (qua phòng); lỗi / rỗng → dùng toàn bộ nhân sự như Framer. */
async function fetchVanHanhNhanSuIds(supabase: SupabaseClient): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("hr_nhan_su_phong")
    .select("nhan_su_id, hr_phong!inner(ban, hr_ban!inner(ten_ban))");

  if (error || !data?.length) return new Set();

  const ids = new Set<number>();
  for (const row of data as { nhan_su_id?: unknown; hr_phong?: unknown }[]) {
    const ph = unwrapOne(row.hr_phong as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!ph) continue;
    const banRaw = (ph as { hr_ban?: unknown }).hr_ban;
    const ban = unwrapOne(banRaw as Record<string, unknown> | Record<string, unknown>[] | null);
    const tenBan = ban && typeof (ban as { ten_ban?: unknown }).ten_ban === "string" ? (ban as { ten_ban: string }).ten_ban : "";
    if (tenBan !== "Vận hành") continue;
    const nid = Number(row.nhan_su_id);
    if (Number.isFinite(nid) && nid > 0) ids.add(nid);
  }
  return ids;
}

export async function fetchAdminThuChiKhacBundle(supabase: SupabaseClient): Promise<
  { ok: true; data: AdminThuChiKhacBundle } | { ok: false; error: string }
> {
  const vanHanhIds = await fetchVanHanhNhanSuIds(supabase);

  let staffQuery = supabase.from("hr_nhan_su").select("id, full_name").order("full_name");
  if (vanHanhIds.size > 0) {
    staffQuery = staffQuery.in("id", [...vanHanhIds]);
  }
  const { data: staffRows, error: staffErr } = await staffQuery;
  if (staffErr) {
    return { ok: false, error: staffErr.message };
  }

  const { data: loaiRows, error: loaiErr } = await supabase
    .from("tc_loai_thu_chi")
    .select("id, giai_nghia, loai_thu_chi")
    .order("giai_nghia");

  if (loaiErr) {
    return { ok: false, error: loaiErr.message };
  }

  const { data: recRows, error: recErr } = await supabase
    .from("tc_thu_chi_khac")
    .select(
      "id, created_at, tieu_de, chu_thich, thu, chi, hinh_thuc, loai_thu_chi_id, nguoi_tao_id, nguoi_tao:hr_nhan_su(full_name), loai:tc_loai_thu_chi(giai_nghia, loai_thu_chi)"
    )
    .order("created_at", { ascending: false });

  if (recErr) {
    return { ok: false, error: recErr.message };
  }

  const staffOptions = (staffRows ?? [])
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const full_name = String((r as { full_name?: unknown }).full_name ?? "").trim();
      if (!Number.isFinite(id) || id <= 0 || !full_name) return null;
      return { id, full_name };
    })
    .filter((x): x is AdminThuChiStaffOpt => x != null);

  const loaiOptions = (loaiRows ?? [])
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const giai_nghia = String((r as { giai_nghia?: unknown }).giai_nghia ?? "").trim();
      const loai_thu_chi = String((r as { loai_thu_chi?: unknown }).loai_thu_chi ?? "Chi");
      if (!Number.isFinite(id) || id <= 0 || !giai_nghia) return null;
      return { id, giai_nghia, loai_thu_chi };
    })
    .filter((x): x is AdminLoaiThuChiOpt => x != null);

  const records = (recRows ?? []) as AdminThuChiKhacRow[];

  return {
    ok: true,
    data: { records, staffOptions, loaiOptions },
  };
}
