import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_DONS = 2000;

export type AdminHpDonRow = {
  id: number;
  created_at: string | null;
  ma_don: string | null;
  ma_don_so: string | null;
  student: number | null;
  nguoi_tao: number | null;
  hinh_thuc_thu: string | null;
  status: string | null;
  ngay_thanh_toan: string | null;
  giam_gia: number | string | null;
  /** Trừ thêm VND (sau KM %/combo) — tư vấn viên. */
  giam_gia_vnd: number | string | null;
};

export type AdminChiTietDisplay = {
  id: number;
  don_thu: number;
  khoa_hoc_vien: number | null;
  goi_hoc_phi: number | null;
  ngay_dau_ky: string | null;
  ngay_cuoi_ky: string | null;
  status: string | null;
  hoc_phi_display: number | null;
  lop_id: number | null;
  ten_lop: string;
};

export type AdminHoaDonBundle = {
  dons: AdminHpDonRow[];
  chiByDonId: Record<string, AdminChiTietDisplay[]>;
  hvNameById: Record<string, string>;
  nsNameById: Record<string, string>;
};

function sinceIsoForDays(days: number): string | null {
  if (days < 0) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function nId(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function discountToPayable(giaGoc: number, discountPct: number): number {
  const g = Math.max(0, giaGoc);
  const d = Math.min(100, Math.max(0, discountPct));
  return Math.round((g * (100 - d)) / 100);
}

function payableFromGoiRow(row: Record<string, unknown>): number | null {
  const giaGoc = parseMoney(row.gia_goc);
  const disc = parseMoney(row.discount);
  if (giaGoc > 0) return discountToPayable(giaGoc, disc);
  const giaGiam = parseMoney(row.gia_giam);
  if (giaGiam > 0) return Math.round(giaGiam);
  const hp = parseMoney(row.hoc_phi);
  return hp > 0 ? hp : null;
}

/** Cột gói theo bảng — `hp_goi_hoc_phi_new` không có `hoc_phi`. */
function goiHocPhiSelectForTable(table: string): string {
  return table === "hp_goi_hoc_phi" ? "id, hoc_phi, gia_giam" : 'id, "number", don_vi, gia_goc, discount';
}

/**
 * Gói dữ liệu trang admin «Quản lý hóa đơn» (`hp_don_thu_hoc_phi` + chi tiết + tên HV/NS/lớp; gói chỉ theo id + số tiền từ bảng gói).
 * `days`: số ngày lùi từ 0h hôm nay (0 = chỉ hôm nay), `-1` = không lọc theo ngày (vẫn giới hạn số đơn).
 */
export async function fetchAdminHoaDonBundle(
  supabase: SupabaseClient,
  opts: { days: number }
): Promise<{ ok: true; data: AdminHoaDonBundle } | { ok: false; error: string }> {
  const since = sinceIsoForDays(opts.days);

  let q = supabase
    .from("hp_don_thu_hoc_phi")
    .select(
      "id, created_at, ma_don, ma_don_so, student, nguoi_tao, hinh_thuc_thu, status, ngay_thanh_toan, giam_gia, giam_gia_vnd"
    )
    .order("created_at", { ascending: false })
    .limit(MAX_DONS);

  if (since != null) {
    q = q.gte("created_at", since);
  }

  const { data: donRows, error: donErr } = await q;
  if (donErr) {
    return { ok: false, error: donErr.message || "Không đọc được đơn thu học phí." };
  }

  const dons = (donRows ?? []) as unknown as AdminHpDonRow[];
  if (dons.length === 0) {
    return {
      ok: true,
      data: { dons: [], chiByDonId: {}, hvNameById: {}, nsNameById: {} },
    };
  }

  const donIds = dons.map((d) => d.id).filter((id) => Number.isFinite(id) && id > 0);
  const hvIds = [...new Set(dons.map((d) => nId(d.student)).filter((x): x is number => x != null))];
  const nsIds = [...new Set(dons.map((d) => nId(d.nguoi_tao)).filter((x): x is number => x != null))];

  const { data: chiRaw, error: chiErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("id, don_thu, khoa_hoc_vien, goi_hoc_phi, ngay_dau_ky, ngay_cuoi_ky, status")
    .in("don_thu", donIds)
    .order("created_at", { ascending: true });

  if (chiErr) {
    return { ok: false, error: chiErr.message || "Không đọc được chi tiết đơn." };
  }

  const chiList = (chiRaw ?? []) as Record<string, unknown>[];
  const qlIds = [
    ...new Set(
      chiList.map((c) => nId(c.khoa_hoc_vien)).filter((x): x is number => x != null)
    ),
  ];
  const goiIds = [
    ...new Set(
      chiList.map((c) => nId(c.goi_hoc_phi)).filter((x): x is number => x != null)
    ),
  ];

  const goiTable = hpGoiHocPhiTableName();

  const [hvRes, nsRes, qlRes, goiRes] = await Promise.all([
    hvIds.length
      ? supabase.from("ql_thong_tin_hoc_vien").select("id, full_name").in("id", hvIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    nsIds.length
      ? supabase.from("hr_nhan_su").select("id, full_name").in("id", nsIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    qlIds.length
      ? supabase.from("ql_quan_ly_hoc_vien").select("id, lop_hoc").in("id", qlIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    goiIds.length
      ? supabase.from(goiTable).select(goiHocPhiSelectForTable(goiTable)).in("id", goiIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (hvRes.error || nsRes.error || qlRes.error || goiRes.error) {
    const msg =
      hvRes.error?.message ||
      nsRes.error?.message ||
      qlRes.error?.message ||
      goiRes.error?.message ||
      "Lỗi tải tham chiếu.";
    return { ok: false, error: msg };
  }

  const hvNameById: Record<string, string> = {};
  for (const r of hvRes.data ?? []) {
    const row = r as { id?: unknown; full_name?: unknown };
    const id = nId(row.id);
    if (id) hvNameById[String(id)] = String(row.full_name ?? "").trim() || `HV #${id}`;
  }

  const nsNameById: Record<string, string> = {};
  for (const r of nsRes.data ?? []) {
    const row = r as { id?: unknown; full_name?: unknown };
    const id = nId(row.id);
    if (id) nsNameById[String(id)] = String(row.full_name ?? "").trim() || `NS #${id}`;
  }

  const qlLopById = new Map<number, number>();
  for (const r of qlRes.data ?? []) {
    const row = r as { id?: unknown; lop_hoc?: unknown };
    const qid = nId(row.id);
    const lid = nId(row.lop_hoc);
    if (qid && lid) qlLopById.set(qid, lid);
  }

  const lopIds = [...new Set(qlLopById.values())];
  const lopNameById = new Map<number, string>();
  if (lopIds.length > 0) {
    const { data: lopRows, error: lopErr } = await supabase
      .from("ql_lop_hoc")
      .select("id, class_full_name, class_name")
      .in("id", lopIds);
    if (lopErr) {
      return { ok: false, error: lopErr.message || "Không đọc được lớp học." };
    }
    for (const r of lopRows ?? []) {
      const row = r as { id?: unknown; class_full_name?: unknown; class_name?: unknown };
      const id = nId(row.id);
      if (!id) continue;
      const name =
        String(row.class_full_name ?? "").trim() || String(row.class_name ?? "").trim() || `Lớp #${id}`;
      lopNameById.set(id, name);
    }
  }

  const goiRowById = new Map<number, Record<string, unknown>>();
  for (const r of goiRes.data ?? []) {
    const row = r as Record<string, unknown>;
    const id = nId(row.id);
    if (id) goiRowById.set(id, row);
  }

  const chiByDonId: Record<string, AdminChiTietDisplay[]> = {};

  for (const c of chiList) {
    const id = nId(c.id);
    const donThu = nId(c.don_thu);
    if (!id || !donThu) continue;

    const kcv = nId(c.khoa_hoc_vien);
    const goiId = nId(c.goi_hoc_phi);
    const lopId = kcv != null ? qlLopById.get(kcv) ?? null : null;
    const tenLop = lopId != null ? lopNameById.get(lopId) ?? `Lớp #${lopId}` : "—";

    const goiRow = goiId != null ? goiRowById.get(goiId) : undefined;
    const hocPhiDisplay = goiRow != null ? payableFromGoiRow(goiRow) : null;

    const row: AdminChiTietDisplay = {
      id,
      don_thu: donThu,
      khoa_hoc_vien: kcv,
      goi_hoc_phi: goiId,
      ngay_dau_ky: c.ngay_dau_ky != null ? String(c.ngay_dau_ky).slice(0, 10) : null,
      ngay_cuoi_ky: c.ngay_cuoi_ky != null ? String(c.ngay_cuoi_ky).slice(0, 10) : null,
      status: c.status != null ? String(c.status) : null,
      hoc_phi_display: hocPhiDisplay,
      lop_id: lopId,
      ten_lop: tenLop,
    };

    const key = String(donThu);
    if (!chiByDonId[key]) chiByDonId[key] = [];
    chiByDonId[key].push(row);
  }

  return {
    ok: true,
    data: {
      dons,
      chiByDonId,
      hvNameById,
      nsNameById,
    },
  };
}
