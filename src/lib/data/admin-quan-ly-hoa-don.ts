import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  hpGoiHocPhiSelectForTable,
  hpParseMoney,
  hpResolveHocPhiDong,
} from "@/lib/data/hp-goi-payable";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_HOA_DON_PAGE_SIZE = 15;
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
  /** Số tiền SePay đã ghi nhận, dùng làm fallback nếu đơn bị thiếu dòng chi tiết. */
  paid_amount: number | null;
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
  /** Tổng số đơn theo bộ lọc `days` (không phụ thuộc phân trang). `null` = không đếm được. */
  totalCount: number | null;
  /** Số đơn đã trả lần này (= `dons.length`). */
  loadedCount: number;
  /** Vẫn còn đơn để tải tiếp. */
  hasMore: boolean;
  /** Offset (số đơn đã bỏ qua) ứng với batch hiện tại. */
  offset: number;
  /** Page size đã dùng. */
  pageSize: number;
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

/**
 * Gói dữ liệu trang admin «Quản lý hóa đơn» — học phí dòng đọc từ snapshot `hoc_phi_dong`.
 * `days`: số ngày lùi từ 0h hôm nay (0 = chỉ hôm nay), `-1` = không lọc theo ngày (vẫn giới hạn `MAX_DONS` tổng).
 * `limit`/`offset`: phân trang server-side (mặc định `ADMIN_HOA_DON_PAGE_SIZE = 15`, offset 0).
 */
export async function fetchAdminHoaDonBundle(
  supabase: SupabaseClient,
  opts: { days: number; limit?: number; offset?: number; query?: string }
): Promise<{ ok: true; data: AdminHoaDonBundle } | { ok: false; error: string }> {
  const since = sinceIsoForDays(opts.days);
  const pageSize = Math.max(1, Math.min(100, opts.limit ?? ADMIN_HOA_DON_PAGE_SIZE));
  const offset = Math.max(0, opts.offset ?? 0);
  const rangeFrom = offset;
  const rangeTo = Math.min(MAX_DONS - 1, offset + pageSize - 1);
  const query = opts.query?.trim() ?? "";

  let q = supabase
    .from("hp_don_thu_hoc_phi")
    .select(
      "id, created_at, ma_don, ma_don_so, student, nguoi_tao, hinh_thuc_thu, status, ngay_thanh_toan, giam_gia, giam_gia_vnd",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (since != null) {
    q = q.gte("created_at", since);
  }
  if (query) {
    const safe = query.replace(/[%_,]/g, "\\$&");
    q = q.or(`ma_don.ilike.%${safe}%,ma_don_so.ilike.%${safe}%`);
  }

  const { data: donRows, error: donErr, count: donCount } = await q;
  if (donErr) {
    return { ok: false, error: donErr.message || "Không đọc được đơn thu học phí." };
  }

  const donsRaw = (donRows ?? []) as unknown as Omit<AdminHpDonRow, "paid_amount">[];
  const totalCount = typeof donCount === "number" ? Math.min(donCount, MAX_DONS) : null;
  const loadedCount = donsRaw.length;
  const hasMore = totalCount != null ? offset + loadedCount < totalCount : loadedCount === pageSize;

  if (donsRaw.length === 0) {
    return {
      ok: true,
      data: {
        dons: [],
        chiByDonId: {},
        hvNameById: {},
        nsNameById: {},
        totalCount,
        loadedCount: 0,
        hasMore: false,
        offset,
        pageSize,
      },
    };
  }

  const paymentCodeToDonId = new Map<string, number>();
  for (const d of donsRaw) {
    const id = nId(d.id);
    if (!id) continue;
    for (const raw of [d.ma_don_so, d.ma_don]) {
      const code = String(raw ?? "").trim().toUpperCase();
      if (code) paymentCodeToDonId.set(code, id);
    }
  }

  const paidAmountByDonId = new Map<number, number>();
  const paymentCodes = [...paymentCodeToDonId.keys()];
  if (paymentCodes.length > 0) {
    const { data: txRows, error: txErr } = await supabase
      .from("hp_giao_dich_thanh_toan")
      .select("ma_don_trich_xuat, transfer_amount")
      .in("ma_don_trich_xuat", paymentCodes);
    if (txErr) {
      return { ok: false, error: txErr.message || "Không đọc được giao dịch thanh toán." };
    }
    for (const tx of txRows ?? []) {
      const row = tx as { ma_don_trich_xuat?: unknown; transfer_amount?: unknown };
      const code = String(row.ma_don_trich_xuat ?? "").trim().toUpperCase();
      const donId = paymentCodeToDonId.get(code);
      if (!donId) continue;
      const amount = hpParseMoney(row.transfer_amount);
      if (amount <= 0) continue;
      paidAmountByDonId.set(donId, (paidAmountByDonId.get(donId) ?? 0) + amount);
    }
  }

  const dons: AdminHpDonRow[] = donsRaw.map((d) => ({
    ...d,
    paid_amount: paidAmountByDonId.get(d.id) ?? null,
  }));

  const donIds = dons.map((d) => d.id).filter((id) => Number.isFinite(id) && id > 0);
  const hvIds = [...new Set(dons.map((d) => nId(d.student)).filter((x): x is number => x != null))];
  const nsIds = [...new Set(dons.map((d) => nId(d.nguoi_tao)).filter((x): x is number => x != null))];

  const { data: chiRaw, error: chiErr } = await supabase
    .from("hp_thu_hp_chi_tiet")
    .select("id, don_thu, khoa_hoc_vien, goi_hoc_phi, ngay_dau_ky, ngay_cuoi_ky, status, hoc_phi_dong")
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
      ? supabase.from(goiTable).select(hpGoiHocPhiSelectForTable(goiTable)).in("id", goiIds)
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
    const hocPhiDisplay = hpResolveHocPhiDong(c, goiRow);

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
      totalCount,
      loadedCount,
      hasMore,
      offset,
      pageSize,
    },
  };
}
