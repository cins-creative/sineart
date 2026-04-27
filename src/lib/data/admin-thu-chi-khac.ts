import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Phiếu `tc_thu_chi_khac`: cột `danh_muc_thu_chi_id` → `tc_danh_muc_thu_chi`.
 * Không dùng embed PostgREST `danh_muc:tc_danh_muc_thu_chi(...)` vì cần FK trong DB;
 * tên danh mục được map sau khi fetch (xem `attachDanhMucLabels`).
 * Cột `loai_thu_chi_id` (→ tc_loai_thu_chi) — dữ liệu cũ, fallback hiển thị.
 */

/** Dòng `tc_thu_chi_khac` + join hiển thị */
export type AdminThuChiKhacRow = {
  id: number;
  created_at: string;
  tieu_de: string;
  chu_thich: string | null;
  thu: number;
  chi: number;
  hinh_thuc: string | null;
  danh_muc_thu_chi_id: number | null;
  loai_thu_chi_id: number | null;
  nguoi_tao_id: number | null;
  nguoi_tao?: { full_name: string } | { full_name: string }[] | null;
  danh_muc?:
    | { ma?: string | null; ten?: string | null; nhom?: string | null; loai?: string | null }
    | { ma?: string | null; ten?: string | null; nhom?: string | null; loai?: string | null }[]
    | null;
  loai?:
    | { giai_nghia: string; loai_thu_chi?: string }
    | { giai_nghia: string; loai_thu_chi?: string }[]
    | null;
};

/** Một dòng `tc_danh_muc_thu_chi` — dropdown & lọc danh mục. */
export type AdminDanhMucThuChiOpt = {
  id: number;
  ma: string;
  ten: string;
  nhom: string;
  loai: string;
};

export type AdminThuChiStaffOpt = { id: number; full_name: string };

export type AdminThuChiKhacBundle = {
  records: AdminThuChiKhacRow[];
  staffOptions: AdminThuChiStaffOpt[];
  danhMucOptions: AdminDanhMucThuChiOpt[];
};

function unwrapOne<T extends Record<string, unknown>>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : v;
}

/** Map id → nhãn danh mục (mọi dòng `dmRows`, kể cả inactive — để hiển thị phiếu cũ). */
function buildDanhMucLookup(
  dmRows: Record<string, unknown>[] | null,
): Map<number, { ma: string; ten: string; nhom: string; loai: string }> {
  const m = new Map<number, { ma: string; ten: string; nhom: string; loai: string }>();
  for (const r of dmRows ?? []) {
    const id = Number((r as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    m.set(id, {
      ma: String((r as { ma?: unknown }).ma ?? "").trim(),
      ten: String((r as { ten?: unknown }).ten ?? "").trim(),
      nhom: String((r as { nhom?: unknown }).nhom ?? "").trim(),
      loai: String((r as { loai?: unknown }).loai ?? "").trim(),
    });
  }
  return m;
}

function attachDanhMucLabels(
  recRows: Record<string, unknown>[] | null,
  dmById: Map<number, { ma: string; ten: string; nhom: string; loai: string }>,
): AdminThuChiKhacRow[] {
  return (recRows ?? []).map((raw) => {
    const did = raw.danh_muc_thu_chi_id != null ? Number(raw.danh_muc_thu_chi_id) : null;
    const dm =
      did != null && Number.isFinite(did) ? dmById.get(did) ?? null : null;
    return { ...raw, danh_muc: dm } as AdminThuChiKhacRow;
  });
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
    const tenBan =
      ban && typeof (ban as { ten_ban?: unknown }).ten_ban === "string"
        ? (ban as { ten_ban: string }).ten_ban
        : "";
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

  const { data: dmRows, error: dmErr } = await supabase
    .from("tc_danh_muc_thu_chi")
    .select("id, ma, ten, nhom, loai, thu_tu, active")
    .order("thu_tu", { ascending: true })
    .order("ten", { ascending: true });

  if (dmErr) {
    return { ok: false, error: dmErr.message };
  }

  const { data: recRows, error: recErr } = await supabase
    .from("tc_thu_chi_khac")
    .select(
      "id, created_at, tieu_de, chu_thich, thu, chi, hinh_thuc, danh_muc_thu_chi_id, loai_thu_chi_id, nguoi_tao_id, nguoi_tao:hr_nhan_su(full_name), loai:tc_loai_thu_chi(giai_nghia, loai_thu_chi)",
    )
    .order("created_at", { ascending: false });

  if (recErr) {
    return { ok: false, error: recErr.message };
  }

  const dmById = buildDanhMucLookup(dmRows as Record<string, unknown>[] | null);

  const staffOptions = (staffRows ?? [])
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const full_name = String((r as { full_name?: unknown }).full_name ?? "").trim();
      if (!Number.isFinite(id) || id <= 0 || !full_name) return null;
      return { id, full_name };
    })
    .filter((x): x is AdminThuChiStaffOpt => x != null);

  const danhMucOptions: AdminDanhMucThuChiOpt[] = (dmRows ?? [])
    .filter((r) => (r as { active?: boolean | null }).active !== false)
    .map((r) => {
      const id = Number((r as { id?: unknown }).id);
      const ma = String((r as { ma?: unknown }).ma ?? "").trim();
      const ten = String((r as { ten?: unknown }).ten ?? "").trim();
      const nhom = String((r as { nhom?: unknown }).nhom ?? "").trim();
      const loai = String((r as { loai?: unknown }).loai ?? "").trim();
      if (!Number.isFinite(id) || id <= 0 || !ten) return null;
      return { id, ma, ten, nhom: nhom || "—", loai: loai || "Chi" };
    })
    .filter((x): x is AdminDanhMucThuChiOpt => x != null);

  const records = attachDanhMucLabels(recRows as Record<string, unknown>[] | null, dmById);

  return {
    ok: true,
    data: { records, staffOptions, danhMucOptions },
  };
}
