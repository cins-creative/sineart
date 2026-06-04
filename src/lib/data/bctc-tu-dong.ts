import { hpGoiHocPhiTableName } from "@/lib/data/hp-goi-hoc-phi-table";
import {
  depreciationExpenseForCalendarMonth,
  fetchAdminTaiSanRows,
  type TaiSanDbRow,
} from "@/lib/data/admin-gia-tri-tai-san";
import { THANG_FULL_TO_SHORT } from "@/lib/data/bao-cao-tai-chinh-config";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BctcTuDongSource =
  | "hoc_phi"
  | "thu_chi_khac"
  | "hoa_cu_ban"
  | "hoa_cu_nhap"
  | "luong_nhan_su"
  | "bctc_thu_cong"
  | "khau_hao_tscd";

export type BctcTuDongDetail = {
  label: string;
  amount: number;
  note?: string;
  sourceType?: "hoc_phi";
  sourceId?: number;
  fields?: { label: string; value: string }[];
};

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
  /** Breakdown chi tiết khi click ô số trong bảng. */
  detailsByMonth?: Record<string, BctcTuDongDetail[]>;
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

type HvRef = { full_name: string; email_prefix: string | null };

function hvCodeLabel(hv: HvRef | undefined, studentId: number): string {
  const ep = hv?.email_prefix?.trim();
  return ep || `#${studentId}`;
}

function hvDisplayName(hv: HvRef | undefined, studentId: number): string {
  const name = hv?.full_name?.trim();
  return name || `HV #${studentId}`;
}

/** Dòng phụ trong popup chi tiết ô — tên · mã học viên. */
function studentNoteLine(hvById: Map<number, HvRef>, studentId: number | null): string {
  if (studentId == null) return "—";
  const hv = hvById.get(studentId);
  return `${hvDisplayName(hv, studentId)} · ${hvCodeLabel(hv, studentId)}`;
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

const VND_ALLOC_UNIT = 1000;

function roundVndThousand(v: number): number {
  return Math.round(v / VND_ALLOC_UNIT) * VND_ALLOC_UNIT;
}

function allocatePayableByThousand(lineAmounts: readonly number[], payableTotal: number): number[] {
  const positive = lineAmounts.map((amt) => Math.max(0, amt));
  const subtotal = positive.reduce((sum, amt) => sum + amt, 0);
  if (subtotal <= 0) return positive.map(() => 0);

  const target = roundVndThousand(Math.max(0, payableTotal));
  const rawAllocated = positive.map((amt) => (amt * target) / subtotal);
  const rounded = rawAllocated.map(roundVndThousand);

  let delta = target - rounded.reduce((sum, amt) => sum + amt, 0);
  let guard = 0;
  while (delta !== 0 && guard < rounded.length * 20) {
    const step = delta > 0 ? VND_ALLOC_UNIT : -VND_ALLOC_UNIT;
    const candidates = rawAllocated
      .map((raw, idx) => ({ idx, remainder: raw - rounded[idx]! }))
      .filter(({ idx }) => step > 0 || rounded[idx]! + step >= 0)
      .sort((a, b) => (step > 0 ? b.remainder - a.remainder : a.remainder - b.remainder));

    const pick = candidates[0];
    if (!pick) break;
    rounded[pick.idx] = rounded[pick.idx]! + step;
    delta -= step;
    guard += 1;
  }

  return rounded;
}

function allocateEvenByThousand(total: number, bucketCount: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || bucketCount <= 0) return [];
  const target = roundVndThousand(total);
  const raw = target / bucketCount;
  const rounded = Array.from({ length: bucketCount }, () => roundVndThousand(raw));

  let delta = target - rounded.reduce((sum, amt) => sum + amt, 0);
  let guard = 0;
  while (delta !== 0 && guard < bucketCount * 20) {
    const step = delta > 0 ? VND_ALLOC_UNIT : -VND_ALLOC_UNIT;
    const candidates = rounded
      .map((amt, idx) => ({ idx, remainder: raw - amt }))
      .filter(({ idx }) => step > 0 || rounded[idx]! + step >= 0)
      .sort((a, b) => (step > 0 ? b.remainder - a.remainder : a.remainder - b.remainder));

    const pick = candidates[0];
    if (!pick) break;
    rounded[pick.idx] = rounded[pick.idx]! + step;
    delta -= step;
    guard += 1;
  }

  return rounded;
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

function monthKeyFromPayrollPeriod(thang: unknown, namRaw: unknown, fallbackIso: unknown, nam: number): string | null {
  const y = String(namRaw ?? "").trim();
  const monthText = String(thang ?? "").trim();
  const monthMatch = /(\d{1,2})/.exec(monthText);
  const yy = Number(y);
  const mm = monthMatch ? Number(monthMatch[1]) : NaN;
  if (Number.isFinite(yy) && yy === nam && Number.isFinite(mm) && mm >= 1 && mm <= 12) {
    return `${nam}-${String(mm).padStart(2, "0")}`;
  }
  return monthKeyFromIso(fallbackIso != null ? String(fallbackIso) : null, nam);
}

function monthKeyFromBctcPeriod(thang: unknown, namRaw: unknown, nam: number): string | null {
  const yy = Number(String(namRaw ?? "").trim());
  if (!Number.isFinite(yy) || yy !== nam) return null;
  const raw = String(thang ?? "").trim();
  const short = THANG_FULL_TO_SHORT[raw] ?? raw;
  const monthMatch = /^T?(\d{1,2})$/i.exec(short);
  const mm = monthMatch ? Number(monthMatch[1]) : NaN;
  return Number.isFinite(mm) && mm >= 1 && mm <= 12 ? `${nam}-${String(mm).padStart(2, "0")}` : null;
}

function parseDateOnly(raw: unknown): Date | null {
  const value = String(raw ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function monthKeyFromIndex(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthKeysBetweenDates(startRaw: unknown, endRaw: unknown): string[] {
  const start = parseDateOnly(startRaw);
  const end = parseDateOnly(endRaw);
  if (!start || !end) return [];

  const startIdx = monthIndex(start);
  const endIdx = monthIndex(end);
  if (endIdx < startIdx) return [];

  const out: string[] = [];
  for (let idx = startIdx; idx <= endIdx && out.length < 600; idx += 1) {
    out.push(monthKeyFromIndex(idx));
  }
  return out;
}

function payrollNetSalary(args: {
  hinhThuc: unknown;
  luongCoBan: unknown;
  troCap: unknown;
  tamUng: unknown;
  thuong: unknown;
  soBuoiLam: unknown;
}): number {
  const isTheoBuoi = String(args.hinhThuc ?? "").trim() === "Theo buổi";
  const lcb = parseMoney(args.luongCoBan);
  const troCap = parseMoney(args.troCap);
  const tamUng = parseMoney(args.tamUng);
  const thuong = parseMoney(args.thuong);
  const soBuoiLam = parseMoney(args.soBuoiLam);
  if (isTheoBuoi) return Math.round(lcb * soBuoiLam + thuong - tamUng);
  return Math.round(lcb + troCap + thuong - tamUng);
}

function tonelessVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function payrollGroupFromPhongNames(phongNames: readonly string[]): {
  ma: string;
  ten: string;
  discriminator: string;
} {
  for (const raw of phongNames) {
    const p = tonelessVi(raw);
    if (
      p.includes("hanh chinh") ||
      p.includes("hanhchinh") ||
      p.includes("van hanh") ||
      p.includes("vanhanh") ||
      p.includes("media") ||
      p.includes("marketing")
    ) {
      return { ma: "LƯƠNG-VH", ten: "Lương Vận hành", discriminator: "van_hanh" };
    }
  }
  return { ma: "LƯƠNG-ĐT", ten: "Lương Đào tạo", discriminator: "dao_tao" };
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
  detail?: BctcTuDongDetail,
) {
  const base = rowKey(dmId, loai, source);
  const key = rowDiscriminator ? `${base}__${rowDiscriminator}` : base;
  let r = pool.get(key);
  if (!r) {
    r = { key, danhMucId: dmId, ma, ten, loai, source, byMonth: {}, detailsByMonth: {} };
    pool.set(key, r);
  }
  mergeAmount(r.byMonth, mk, amount);
  if (mk && detail) {
    const details = r.detailsByMonth ?? {};
    details[mk] = [...(details[mk] ?? []), detail];
    r.detailsByMonth = details;
  }
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
    .select("id, created_at, ma_don, ma_don_so, student, hinh_thuc_thu, ngay_thanh_toan, giam_gia, giam_gia_vnd, status")
    .eq("status", STATUS_PAID);

  if (donErr) {
    return { ok: false, error: donErr.message || "Không đọc được đơn học phí." };
  }

  const donsAll = (donRows ?? []) as Record<string, unknown>[];
  const donIds = donsAll.map((d) => nId(d.id)).filter((x): x is number => x != null);

  const hvById = new Map<number, HvRef>();
  const studentIds = [
    ...new Set(donsAll.map((d) => nId(d.student)).filter((x): x is number => x != null)),
  ];
  if (studentIds.length > 0) {
    const { data: hvRows, error: hvErr } = await supabase
      .from("ql_thong_tin_hoc_vien")
      .select("id, full_name, email_prefix")
      .in("id", studentIds);
    if (hvErr) {
      return { ok: false, error: hvErr.message || "Không đọc được học viên." };
    }
    for (const raw of hvRows ?? []) {
      const row = raw as Record<string, unknown>;
      const id = nId(row.id);
      if (!id) continue;
      hvById.set(id, {
        full_name: String(row.full_name ?? "").trim(),
        email_prefix:
          row.email_prefix != null && String(row.email_prefix).trim() !== ""
            ? String(row.email_prefix).trim()
            : null,
      });
    }
  }

  if (donIds.length > 0) {
    const { data: chiRaw, error: chiErr } = await supabase
      .from("hp_thu_hp_chi_tiet")
      .select("id, don_thu, khoa_hoc_vien, goi_hoc_phi, status, danh_muc_thu_chi_id, ngay_dau_ky, ngay_cuoi_ky")
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
    for (const d of donsAll) {
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
      const studentId = nId(don?.student);
      const hvRef = studentId != null ? hvById.get(studentId) : undefined;
      const lines = chiByDon.get(donId) ?? [];
      const fallbackPaymentMonthKey = monthKeyFromDonLike(
        don?.ngay_thanh_toan != null ? String(don.ngay_thanh_toan) : null,
        don?.created_at != null ? String(don.created_at) : null,
        nam,
      );

      let subtotal = 0;
      const lineAmts: {
        chiTietId: number | null;
        dmId: number | null;
        goiId: number | null;
        amt: number;
        kyMonthKeys: string[];
        ngayDauKy: string;
        ngayCuoiKy: string;
      }[] = [];
      for (const ln of lines) {
        const goiId = nId(ln.goi_hoc_phi);
        const goiRow = goiId != null ? goiRowById.get(goiId) : undefined;
        const hoc = goiRow != null ? payableFromGoiRow(goiRow) : null;
        const amt = hoc ?? 0;
        subtotal += amt;
        const dmId = ln.danh_muc_thu_chi_id != null ? nId(ln.danh_muc_thu_chi_id) : null;
        const kyMonthKeys = monthKeysBetweenDates(ln.ngay_dau_ky, ln.ngay_cuoi_ky);
        lineAmts.push({
          chiTietId: nId(ln.id),
          dmId,
          goiId,
          amt,
          kyMonthKeys,
          ngayDauKy: String(ln.ngay_dau_ky ?? "—").slice(0, 10),
          ngayCuoiKy: String(ln.ngay_cuoi_ky ?? "—").slice(0, 10),
        });
      }

      const discount = parseMoney(don?.giam_gia) + parseMoney(don?.giam_gia_vnd);
      const payableTotal = Math.max(0, Math.round(subtotal - discount));
      const allocatedAmounts = allocatePayableByThousand(
        lineAmts.map((line) => line.amt),
        payableTotal,
      );

      for (const [idx, { chiTietId, dmId, goiId, amt, kyMonthKeys, ngayDauKy, ngayCuoiKy }] of lineAmts.entries()) {
        const alloc = allocatedAmounts[idx] ?? 0;
        if (alloc <= 0) continue;
        const lb = labelForDm(dmId);
        const hasKyHoc = kyMonthKeys.length > 0;
        const revenueMonthKeys = hasKyHoc ? kyMonthKeys : fallbackPaymentMonthKey ? [fallbackPaymentMonthKey] : [];
        const monthAmounts = allocateEvenByThousand(alloc, revenueMonthKeys.length);

        for (const [monthIdx, mk] of revenueMonthKeys.entries()) {
          if (!mk.startsWith(`${nam}-`)) continue;
          const monthAlloc = monthAmounts[monthIdx] ?? 0;
          if (monthAlloc <= 0) continue;
          upsertRow(pool, dmId, lb.ma, lb.ten, "thu", "hoc_phi", mk, monthAlloc, undefined, {
            label: `Đơn học phí #${donId}`,
            amount: monthAlloc,
            note: studentNoteLine(hvById, studentId),
            sourceType: "hoc_phi",
            sourceId: donId,
            fields: [
              { label: "Mã đơn", value: String(don?.ma_don ?? "—") },
              { label: "Mã CK", value: String(don?.ma_don_so ?? "—") },
              { label: "Trạng thái", value: String(don?.status ?? "—") },
              { label: "Hình thức", value: String(don?.hinh_thuc_thu ?? "—") },
              { label: "Ngày thanh toán", value: String(don?.ngay_thanh_toan ?? "—").slice(0, 10) },
              {
                label: "Học viên",
                value: studentId != null ? hvDisplayName(hvRef, studentId) : "—",
              },
              {
                label: "Mã học viên",
                value: studentId != null ? hvCodeLabel(hvRef, studentId) : "—",
              },
              { label: "Dòng chi tiết", value: chiTietId != null ? `#${chiTietId}` : "—" },
              { label: "Gói học phí", value: goiId != null ? `#${goiId}` : "—" },
              { label: "Danh mục", value: `${lb.ten}${lb.ma ? ` · ${lb.ma}` : ""}` },
              { label: "Ngày đầu kỳ", value: ngayDauKy },
              { label: "Ngày cuối kỳ", value: ngayCuoiKy },
              { label: "Cách phân bổ", value: hasKyHoc ? "Theo tháng kỳ học" : "Theo tháng thanh toán do thiếu kỳ học" },
              { label: "Số tháng kỳ học", value: hasKyHoc ? String(revenueMonthKeys.length) : "—" },
              { label: "Học phí dòng gốc", value: Math.round(amt).toLocaleString("vi-VN") },
              { label: "Giảm giá đơn", value: Math.round(parseMoney(don?.giam_gia)).toLocaleString("vi-VN") },
              { label: "Giảm thêm", value: Math.round(parseMoney(don?.giam_gia_vnd)).toLocaleString("vi-VN") },
              { label: "Phân bổ sau giảm của dòng", value: Math.round(alloc).toLocaleString("vi-VN") },
              { label: "Phân bổ vào tháng", value: Math.round(monthAlloc).toLocaleString("vi-VN") },
            ],
          });
          monthKeysSet.add(mk);
        }
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
      upsertRow(pool, dmId, lb.ma, lb.ten, "thu", "thu_chi_khac", mk, thu, undefined, {
        label: `Thu chi khác #${r.id ?? "?"}`,
        amount: thu,
        note: lb.ten,
      });
      monthKeysSet.add(mk);
    }
    if (chi > 0) {
      upsertRow(pool, dmId, lb.ma, lb.ten, "chi", "thu_chi_khac", mk, chi, undefined, {
        label: `Thu chi khác #${r.id ?? "?"}`,
        amount: chi,
        note: lb.ten,
      });
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
    upsertRow(pool, dmId, lb.ma, lb.ten, "thu", "hoa_cu_ban", mk, tong, undefined, {
      label: `Đơn bán họa cụ #${r.id ?? "?"}`,
      amount: tong,
      note: lb.ten,
    });
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
    upsertRow(pool, dmId, lb.ma, lb.ten, "chi", "hoa_cu_nhap", mk, tong, undefined, {
      label: `Đơn nhập họa cụ #${r.id ?? "?"}`,
      amount: tong,
      note: lb.ten,
    });
    monthKeysSet.add(mk);
  }

  const { data: payrollRows, error: payrollErr } = await supabase
    .from("hr_bang_tinh_luong")
    .select("id, created_at, nhan_vien, tam_ung, thuong");

  if (payrollErr) {
    return { ok: false, error: payrollErr.message || "Không đọc được bảng lương nhân sự." };
  }

  const payrollList = (payrollRows ?? []) as Record<string, unknown>[];
  const payrollIds = payrollList.map((r) => nId(r.id)).filter((x): x is number => x != null);
  const payrollStaffIds = payrollList.map((r) => nId(r.nhan_vien)).filter((x): x is number => x != null);

  const [payrollStaffRes, payrollLichRes, payrollPhongRes] = await Promise.all([
    payrollStaffIds.length > 0
      ? supabase
          .from("hr_nhan_su")
          .select("id, full_name, hinh_thuc_tinh_luong, luong_co_ban, tro_cap")
          .in("id", [...new Set(payrollStaffIds)])
      : Promise.resolve({ data: [] as unknown[], error: null }),
    payrollIds.length > 0
      ? supabase
          .from("hr_lich_diem_danh")
          .select("id, bang_tinh_luong, thang, nam, so_buoi_lam_viec")
          .in("bang_tinh_luong", payrollIds)
          .order("id", { ascending: true })
      : Promise.resolve({ data: [] as unknown[], error: null }),
    payrollStaffIds.length > 0
      ? supabase
          .from("hr_nhan_su_phong")
          .select("nhan_su_id, hr_phong!inner(ten_phong)")
          .in("nhan_su_id", [...new Set(payrollStaffIds)])
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  if (payrollStaffRes.error || payrollLichRes.error || payrollPhongRes.error) {
    return {
      ok: false,
      error:
        payrollStaffRes.error?.message ||
        payrollLichRes.error?.message ||
        payrollPhongRes.error?.message ||
        "Không đọc được dữ liệu kỳ lương nhân sự.",
    };
  }

  const staffById = new Map<number, Record<string, unknown>>();
  for (const raw of payrollStaffRes.data ?? []) {
    const row = raw as Record<string, unknown>;
    const id = nId(row.id);
    if (id) staffById.set(id, row);
  }

  const lichByPayrollId = new Map<number, Record<string, unknown>>();
  for (const raw of payrollLichRes.data ?? []) {
    const row = raw as Record<string, unknown>;
    const bangId = nId(row.bang_tinh_luong);
    if (bangId && !lichByPayrollId.has(bangId)) lichByPayrollId.set(bangId, row);
  }

  const phongNamesByStaffId = new Map<number, string[]>();
  for (const raw of payrollPhongRes.data ?? []) {
    const row = raw as Record<string, unknown>;
    const staffId = nId(row.nhan_su_id);
    if (!staffId) continue;
    const phongRaw = row.hr_phong;
    const phong = Array.isArray(phongRaw)
      ? (phongRaw[0] as Record<string, unknown> | undefined)
      : (phongRaw as Record<string, unknown> | null | undefined);
    const name = String(phong?.ten_phong ?? "").trim();
    if (!name) continue;
    const cur = phongNamesByStaffId.get(staffId) ?? [];
    cur.push(name);
    phongNamesByStaffId.set(staffId, cur);
  }

  for (const raw of payrollList) {
    const r = raw as Record<string, unknown>;
    const bangId = nId(r.id);
    const staffId = nId(r.nhan_vien);
    const staff = staffId != null ? staffById.get(staffId) : undefined;
    const lich = bangId != null ? lichByPayrollId.get(bangId) : undefined;
    const mk = monthKeyFromPayrollPeriod(lich?.thang, lich?.nam, r.created_at, nam);
    if (!mk) continue;

    const net = payrollNetSalary({
      hinhThuc: staff?.hinh_thuc_tinh_luong,
      luongCoBan: staff?.luong_co_ban,
      troCap: staff?.tro_cap,
      tamUng: r.tam_ung,
      thuong: r.thuong,
      soBuoiLam: lich?.so_buoi_lam_viec,
    });
    if (net <= 0) continue;

    const payrollGroup = payrollGroupFromPhongNames(staffId != null ? phongNamesByStaffId.get(staffId) ?? [] : []);
    upsertRow(
      pool,
      null,
      payrollGroup.ma,
      payrollGroup.ten,
      "chi",
      "luong_nhan_su",
      mk,
      net,
      payrollGroup.discriminator,
      {
        label: String(staff?.full_name ?? "").trim() || `Nhân sự #${r.nhan_vien ?? "?"}`,
        amount: net,
        note: `Bảng lương #${bangId ?? "?"}`,
      },
    );
    monthKeysSet.add(mk);
  }

  const { data: manualBctcRows, error: manualBctcErr } = await supabase
    .from("tc_bao_cao_tai_chinh")
    .select("nam, thang, cp_trich_truoc, cp_matbang")
    .eq("nam", String(nam));

  if (manualBctcErr) {
    return { ok: false, error: manualBctcErr.message || "Không đọc được chi phí từ Báo cáo tài chính." };
  }

  for (const raw of manualBctcRows ?? []) {
    const r = raw as Record<string, unknown>;
    const mk = monthKeyFromBctcPeriod(r.thang, r.nam, nam);
    if (!mk) continue;
    const cpTrichTruoc = parseMoney(r.cp_trich_truoc);
    if (cpTrichTruoc > 0) {
      upsertRow(pool, null, "CP-TRÍCH", "Trích trước", "chi", "bctc_thu_cong", mk, cpTrichTruoc, "cp_trich_truoc", {
        label: "Báo cáo tài chính: Trích trước",
        amount: cpTrichTruoc,
        note: String(r.thang ?? ""),
      });
      monthKeysSet.add(mk);
    }
    const cpMatBang = parseMoney(r.cp_matbang);
    if (cpMatBang > 0) {
      upsertRow(pool, null, "CP-MB", "Mặt bằng", "chi", "bctc_thu_cong", mk, cpMatBang, "cp_matbang", {
        label: "Báo cáo tài chính: Mặt bằng",
        amount: cpMatBang,
        note: String(r.thang ?? ""),
      });
      monthKeysSet.add(mk);
    }
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
      const { ma } = assetRowLabel(dmKhauHaoId, dmById, raw);
      upsertRow(pool, dmKhauHaoId, ma, "Khấu hao TSCĐ", "chi", "khau_hao_tscd", mk, exp, undefined, {
        label: raw.ten_tai_san.trim() || `Tài sản #${raw.id}`,
        amount: exp,
        note: `TS${raw.id}`,
      });
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

  for (let m = 1; m <= 12; m++) {
    monthKeysSet.add(`${nam}-${String(m).padStart(2, "0")}`);
  }
  const allMonthKeys = [...monthKeysSet].sort();

  return {
    ok: true,
    data: { nam, monthKeys: allMonthKeys, rows },
  };
}
