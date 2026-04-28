import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  depreciationExpenseForCalendarMonth,
  fetchAdminTaiSanRows,
  type TaiSanDbRow,
} from "@/lib/data/admin-gia-tri-tai-san";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BctcTuDongSource =
  | "hoc_phi"
  | "thu_chi_khac"
  | "hoa_cu_ban"
  | "hoa_cu_nhap"
  | "khau_hao_tscd";

/** Một dòng báo cáo — gộp theo danh mục + nguồn + loại thu/chi. */
export type BctcTuDongMatrixRow = {
  key: string;
  danhMucId: number | null;
  ma: string;
  ten: string;
  loai: "thu" | "chi";
  source: BctcTuDongSource;
  /** `YYYY-MM` → số tiền (luôn dương; loại chi hiển thị trong nhóm chi). */
  byMonth: Record<string, number>;
};

export type BctcTuDongBundle = {
  nam: number;
  /** Các tháng có phát sinh (đã sort). */
  monthKeys: string[];
  rows: BctcTuDongMatrixRow[];
  error?: string;
};

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

function goiHocPhiSelectForTable(table: string): string {
  return table === "hp_goi_hoc_phi" ? "id, hoc_phi, gia_giam" : 'id, "number", don_vi, gia_goc, discount';
}

function yearFromDonLike(ngayThanhToan: string | null | undefined, createdAt: string | null | undefined): number | null {
  const raw = ngayThanhToan?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}/.test(raw)) return parseInt(raw.slice(0, 4), 10);
  const c = createdAt?.trim();
  if (c) return new Date(c).getFullYear();
  return null;
}

function monthKeyFromDonLike(
  ngayThanhToan: string | null | undefined,
  createdAt: string | null | undefined,
  nam: number,
): string | null {
  const raw = ngayThanhToan?.trim();
  let d: Date;
  if (raw && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    d = new Date(raw + "T12:00:00.000Z");
  } else if (createdAt) {
    d = new Date(createdAt);
  } else return null;
  if (d.getFullYear() !== nam) return null;
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${nam}-${m}`;
}

function monthKeyFromIso(iso: string | null | undefined, nam: number): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() !== nam) return null;
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${nam}-${m}`;
}

function mergeAmount(map: Record<string, number>, mk: string | null, delta: number) {
  if (!mk || !Number.isFinite(delta) || delta === 0) return;
  map[mk] = (map[mk] ?? 0) + delta;
}

function rowKey(dmId: number | null, loai: "thu" | "chi", source: BctcTuDongSource): string {
  return `${dmId ?? "null"}_${loai}_${source}`;
}

function upsertRow(
  pool: Map<string, BctcTuDongMatrixRow>,
  dmId: number | null,
  ma: string,
  ten: string,
  loai: "thu" | "chi",
  source: BctcTuDongSource,
  mk: string | null,
  amount: number,
  /** Nhiều dòng cùng danh mục + nguồn (vd. từng TSCĐ). */
  rowDiscriminator?: string,
) {
  const base = rowKey(dmId, loai, source);
  const key = rowDiscriminator ? `${base}__${rowDiscriminator}` : base;
  let r = pool.get(key);
  if (!r) {
    r = { key, danhMucId: dmId, ma, ten, loai, source, byMonth: {} };
    pool.set(key, r);
  }
  mergeAmount(r.byMonth, mk, amount);
}

/** Gắn nhẹ với chỉ tiêu «Khấu hao TSCĐ» / cột DB `cp_khauhao_tscd` khi có danh mục chi phù hợp. */
function resolveKhauHaoDanhMucChiId(dmById: Map<number, { ma: string; ten: string; loai: string }>): number | null {
  for (const [id, j] of dmById) {
    if (j.loai.trim().toLowerCase() !== "chi") continue;
    const ma = j.ma.toLowerCase();
    const ten = j.ten.toLowerCase();
    if (ma.includes("khauhao") || ma.includes("khau_hao") || ma.includes("khấu")) return id;
    if (ten.includes("khấu hao") && ten.includes("tscđ")) return id;
    if (ten.includes("khấu hao") && ten.includes("tscd")) return id;
  }
  return null;
}

function assetRowLabel(dmKhauHaoId: number | null, dmById: Map<number, { ma: string; ten: string }>, row: TaiSanDbRow) {
  const dm = dmKhauHaoId != null ? dmById.get(dmKhauHaoId) : undefined;
  const maPrefix = dm?.ma?.trim() ? dm.ma : "KH-TSCĐ";
  return {
    ma: `${maPrefix} · TS${row.id}`,
    ten: row.ten_tai_san.trim() || `Tài sản #${row.id}`,
  };
}

/**
 * BCTC tự động theo năm: học phí (đơn đã TT + chi tiết có danh mục),
 * `tc_thu_chi_khac`, đơn bán / nhập họa cụ (cột `danh_muc_thu_chi_id`).
 */
export async function fetchBctcTuDongBundle(
  supabase: SupabaseClient,
  opts: { nam: number },
): Promise<{ ok: true; data: BctcTuDongBundle } | { ok: false; error: string }> {
  const nam = opts.nam;
  if (!Number.isFinite(nam) || nam < 2000 || nam > 2100) {
    return { ok: false, error: "Năm không hợp lệ." };
  }

  const pool = new Map<string, BctcTuDongMatrixRow>();
  const monthKeysSet = new Set<string>();

  const { data: dmRows, error: dmErr } = await supabase
    .from("tc_danh_muc_thu_chi")
    .select("id, ma, ten, loai");

  if (dmErr) {
    return { ok: false, error: dmErr.message || "Không đọc được danh mục thu chi." };
  }

  const dmById = new Map<number, { ma: string; ten: string; loai: string }>();
  for (const r of dmRows ?? []) {
    const row = r as { id?: unknown; ma?: unknown; ten?: unknown; loai?: unknown };
    const id = nId(row.id);
    if (!id) continue;
    dmById.set(id, {
      ma: String(row.ma ?? "").trim() || `DM${id}`,
      ten: String(row.ten ?? "").trim() || "—",
      loai: String(row.loai ?? "").trim().toLowerCase(),
    });
  }

  function labelForDm(id: number | null): { ma: string; ten: string; loai: "thu" | "chi" } {
    if (id == null) return { ma: "—", ten: "Chưa gán danh mục", loai: "thu" };
    const j = dmById.get(id);
    if (!j) return { ma: "?", ten: `Danh mục #${id}`, loai: "thu" };
    return { ma: j.ma, ten: j.ten, loai: j.loai === "chi" ? "chi" : "thu" };
  }

  const STATUS_PAID = "Đã thanh toán";

  const { data: donRows, error: donErr } = await supabase
    .from("hp_don_thu_hoc_phi")
    .select("id, created_at, ngay_thanh_toan, giam_gia, giam_gia_vnd, status")
    .eq("status", STATUS_PAID);

  if (donErr) {
    return { ok: false, error: donErr.message || "Không đọc được đơn học phí." };
  }

  const donsAll = (donRows ?? []) as Record<string, unknown>[];
  const donsInYear = donsAll.filter((d) => yearFromDonLike(String(d.ngay_thanh_toan ?? ""), String(d.created_at ?? "")) === nam);
  const donIds = donsInYear.map((d) => nId(d.id)).filter((x): x is number => x != null);

  if (donIds.length > 0) {
    const { data: chiRaw, error: chiErr } = await supabase
      .from("hp_thu_hp_chi_tiet")
      .select("id, don_thu, khoa_hoc_vien, goi_hoc_phi, status, danh_muc_thu_chi_id")
      .in("don_thu", donIds)
      .eq("status", STATUS_PAID);

    if (chiErr) {
      return { ok: false, error: chiErr.message || "Không đọc được chi tiết học phí." };
    }

    const chiList = (chiRaw ?? []) as Record<string, unknown>[];
    const goiIds = [...new Set(chiList.map((c) => nId(c.goi_hoc_phi)).filter((x): x is number => x != null))];
    const goiTable = hpGoiHocPhiTableName();

    const { data: goiRes } =
      goiIds.length > 0
        ? await supabase.from(goiTable).select(goiHocPhiSelectForTable(goiTable)).in("id", goiIds)
        : { data: [] as unknown[] };

    const goiRowById = new Map<number, Record<string, unknown>>();
    for (const r of goiRes ?? []) {
      const row = r as Record<string, unknown>;
      const id = nId(row.id);
      if (id) goiRowById.set(id, row);
    }

    const donById = new Map<number, Record<string, unknown>>();
    for (const d of donsInYear) {
      const id = nId(d.id);
      if (id) donById.set(id, d);
    }

    const chiByDon = new Map<number, Record<string, unknown>[]>();
    for (const c of chiList) {
      const did = nId(c.don_thu);
      if (!did) continue;
      if (!chiByDon.has(did)) chiByDon.set(did, []);
      chiByDon.get(did)!.push(c);
    }

    for (const donId of donIds) {
      const don = donById.get(donId);
      const lines = chiByDon.get(donId) ?? [];
      const mk = monthKeyFromDonLike(
        don?.ngay_thanh_toan != null ? String(don.ngay_thanh_toan) : null,
        don?.created_at != null ? String(don.created_at) : null,
        nam,
      );
      if (!mk) continue;

      let subtotal = 0;
      const lineAmts: { dmId: number | null; amt: number }[] = [];
      for (const ln of lines) {
        const goiId = nId(ln.goi_hoc_phi);
        const goiRow = goiId != null ? goiRowById.get(goiId) : undefined;
        const hoc = goiRow != null ? payableFromGoiRow(goiRow) : null;
        const amt = hoc ?? 0;
        subtotal += amt;
        const dmId = ln.danh_muc_thu_chi_id != null ? nId(ln.danh_muc_thu_chi_id) : null;
        lineAmts.push({ dmId, amt });
      }

      const discount = parseMoney(don?.giam_gia) + parseMoney(don?.giam_gia_vnd);
      const payableTotal = Math.max(0, Math.round(subtotal - discount));
      const factor = subtotal > 0 ? payableTotal / subtotal : 0;

      for (const { dmId, amt } of lineAmts) {
        const alloc = Math.round(amt * factor);
        if (alloc <= 0) continue;
        const lb = labelForDm(dmId);
        upsertRow(pool, dmId, lb.ma, lb.ten, "thu", "hoc_phi", mk, alloc);
        monthKeysSet.add(mk);
      }
    }
  }

  const startIso = `${nam}-01-01T00:00:00.000Z`;
  const endIso = `${nam}-12-31T23:59:59.999Z`;

  const { data: tcRows, error: tcErr } = await supabase
    .from("tc_thu_chi_khac")
    .select("id, created_at, thu, chi, danh_muc_thu_chi_id")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (tcErr) {
    return { ok: false, error: tcErr.message || "Không đọc được thu chi khác." };
  }

  for (const raw of tcRows ?? []) {
    const r = raw as Record<string, unknown>;
    const mk = monthKeyFromIso(r.created_at != null ? String(r.created_at) : null, nam);
    if (!mk) continue;
    const dmId = r.danh_muc_thu_chi_id != null ? nId(r.danh_muc_thu_chi_id) : null;
    const thu = parseMoney(r.thu);
    const chi = parseMoney(r.chi);
    const lb = labelForDm(dmId);

    if (thu > 0) {
      upsertRow(pool, dmId, lb.ma, lb.ten, "thu", "thu_chi_khac", mk, thu);
      monthKeysSet.add(mk);
    }
    if (chi > 0) {
      upsertRow(pool, dmId, lb.ma, lb.ten, "chi", "thu_chi_khac", mk, chi);
      monthKeysSet.add(mk);
    }
  }

  const { data: banRows, error: banErr } = await supabase
    .from("hc_don_ban_hoa_cu")
    .select("id, created_at, tong_tien, danh_muc_thu_chi_id")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (banErr) {
    return { ok: false, error: banErr.message || "Không đọc được đơn bán họa cụ." };
  }

  for (const raw of banRows ?? []) {
    const r = raw as Record<string, unknown>;
    const mk = monthKeyFromIso(String(r.created_at ?? ""), nam);
    if (!mk) continue;
    const dmId = r.danh_muc_thu_chi_id != null ? nId(r.danh_muc_thu_chi_id) : null;
    const tong = parseMoney(r.tong_tien);
    if (tong <= 0) continue;
    const lb = labelForDm(dmId);
    upsertRow(pool, dmId, lb.ma, lb.ten, "thu", "hoa_cu_ban", mk, tong);
    monthKeysSet.add(mk);
  }

  const { data: nhapRows, error: nhapErr } = await supabase
    .from("hc_nhap_hoa_cu")
    .select("id, created_at, tong_tien, danh_muc_thu_chi_id")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (nhapErr) {
    return { ok: false, error: nhapErr.message || "Không đọc được đơn nhập họa cụ." };
  }

  for (const raw of nhapRows ?? []) {
    const r = raw as Record<string, unknown>;
    const mk = monthKeyFromIso(String(r.created_at ?? ""), nam);
    if (!mk) continue;
    const dmId = r.danh_muc_thu_chi_id != null ? nId(r.danh_muc_thu_chi_id) : null;
    const tong = parseMoney(r.tong_tien);
    if (tong <= 0) continue;
    const lb = labelForDm(dmId);
    upsertRow(pool, dmId, lb.ma, lb.ten, "chi", "hoa_cu_nhap", mk, tong);
    monthKeysSet.add(mk);
  }

  const dmKhauHaoId = resolveKhauHaoDanhMucChiId(dmById);
  const khauHaoRes = await fetchAdminTaiSanRows(supabase);
  if (!khauHaoRes.ok) {
    return { ok: false, error: khauHaoRes.error };
  }
  for (const raw of khauHaoRes.rows) {
    for (let mo = 1; mo <= 12; mo++) {
      const mk = `${nam}-${String(mo).padStart(2, "0")}`;
      const exp = depreciationExpenseForCalendarMonth(raw, mk);
      if (!exp) continue;
      const { ma, ten } = assetRowLabel(dmKhauHaoId, dmById, raw);
      upsertRow(pool, dmKhauHaoId, ma, ten, "chi", "khau_hao_tscd", mk, exp, `ts_${raw.id}`);
      monthKeysSet.add(mk);
    }
  }

  const rows = [...pool.values()].sort((a, b) => {
    const lo = a.loai.localeCompare(b.loai);
    if (lo !== 0) return lo;
    const tm = a.ten.localeCompare(b.ten, "vi");
    if (tm !== 0) return tm;
    return a.source.localeCompare(b.source);
  });

  const monthKeys = [...monthKeysSet].sort();
  for (let m = 1; m <= 12; m++) {
    monthKeysSet.add(`${nam}-${String(m).padStart(2, "0")}`);
  }
  const allMonthKeys = [...monthKeysSet].sort();

  return {
    ok: true,
    data: { nam, monthKeys: allMonthKeys, rows },
  };
}
