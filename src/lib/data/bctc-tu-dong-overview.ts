import type { SupabaseClient } from "@supabase/supabase-js";

import {
  n,
  THANG_FULL_ORDER,
  type BaoCaoColumn,
  type ColData,
} from "@/lib/data/bao-cao-tai-chinh-config";
import { fetchBctcTuDongBundle, type BctcTuDongBundle, type BctcTuDongMatrixRow } from "@/lib/data/bctc-tu-dong";
import {
  mapTuDongRowToRevenueAllocations,
  type AmountAllocation,
} from "@/lib/data/bctc-revenue-alloc";

function monthKeyToThangFull(mk: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(mk.trim());
  if (!m) return null;
  const mi = parseInt(m[2]!, 10);
  if (!Number.isFinite(mi) || mi < 1 || mi > 12) return null;
  return THANG_FULL_ORDER[mi - 1] ?? null;
}

function addMoney(data: ColData, key: string, delta: number) {
  if (!Number.isFinite(delta) || delta === 0) return;
  const next = Math.round(n(data[key]) + delta);
  if (next === 0) delete data[key];
  else data[key] = String(next);
}

function tonelessVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function mapExpenseAllocations(row: BctcTuDongMatrixRow): AmountAllocation[] {
  const ma = tonelessVi(row.ma);
  const ten = tonelessVi(row.ten);
  const blob = `${ma} ${ten}`.trim();

  if (row.source === "luong_nhan_su") {
    if (row.key.includes("van_hanh")) return [{ colKey: "luongVHDichVu", ratio: 1 }];
    if (row.key.includes("dao_tao")) return [{ colKey: "luongGVLuyenThi", ratio: 1 }];
    return [{ colKey: "luongGVLuyenThi", ratio: 1 }];
  }
  if (row.source === "khau_hao_tscd") return [{ colKey: "cpKhauHao", ratio: 1 }];
  if (row.source === "bctc_thu_cong") {
    if (blob.includes("trich")) return [{ colKey: "cpTrichTruoc", ratio: 1 }];
    if (blob.includes("mat bang") || blob.includes("matbang")) return [{ colKey: "cpMatBang", ratio: 1 }];
  }
  if (row.source === "hoa_cu_nhap") return [{ colKey: "cpTienKhac", ratio: 1 }];

  if (blob.includes("khau hao")) return [{ colKey: "cpKhauHao", ratio: 1 }];
  if (blob.includes("mat bang") || blob.includes("matbang")) return [{ colKey: "cpMatBang", ratio: 1 }];
  if (blob.includes("trich truoc") || blob.includes("trichtruoc")) return [{ colKey: "cpTrichTruoc", ratio: 1 }];
  if (blob.includes("bhxh")) return [{ colKey: "bhxhNhanVien", ratio: 1 }];
  if (blob.includes("dien") || blob.includes("nuoc") || blob.includes("internet")) {
    return [{ colKey: "cpDienNuoc", ratio: 1 }];
  }
  if (blob.includes("marketing") || blob.includes("quang cao")) return [{ colKey: "cpMarketing", ratio: 1 }];
  if (blob.includes("website") || /\bweb\b/.test(blob)) return [{ colKey: "cpWebsite", ratio: 1 }];
  if (blob.includes("phan mem") || blob.includes("software")) return [{ colKey: "cpPhanMem", ratio: 1 }];
  if (blob.includes("ngan hang") || blob.includes("nganhang")) return [{ colKey: "cpNganHang", ratio: 1 }];
  if (blob.includes("dao tao") || blob.includes("daotao")) return [{ colKey: "cpDaoTao", ratio: 1 }];
  if (blob.includes("tiec") || blob.includes("qua") || blob.includes("sinh nhat")) {
    return [{ colKey: "cpTiecQua", ratio: 1 }];
  }

  return [{ colKey: "cpTienKhac", ratio: 1 }];
}

/** Gán dòng ma trận BCTC tự động → ô nhập BCTC (cùng công thức tổng quan). */
export function mapTuDongRowToAllocations(row: BctcTuDongMatrixRow): AmountAllocation[] {
  if (row.loai === "thu") {
    return (
      mapTuDongRowToRevenueAllocations({
        ma: row.ma,
        ten: row.ten,
        loai: row.loai,
        source: row.source,
        key: row.key,
      }) ?? [{ colKey: "dtDichVu", ratio: 1 }]
    );
  }
  return mapExpenseAllocations(row);
}

export function tuDongBundleToColumns(bundle: BctcTuDongBundle): BaoCaoColumn[] {
  const byMonth = new Map<string, ColData>();
  const nam = String(bundle.nam);

  for (const row of bundle.rows) {
    const allocs = mapTuDongRowToAllocations(row);
    for (const [mk, amount] of Object.entries(row.byMonth)) {
      if (amount <= 0) continue;
      const thang = monthKeyToThangFull(mk);
      if (!thang) continue;
      const mapKey = `${nam}|${thang}`;
      if (!byMonth.has(mapKey)) byMonth.set(mapKey, {});
      const data = byMonth.get(mapKey)!;
      for (const { colKey, ratio } of allocs) {
        addMoney(data, colKey, Math.round(amount * ratio));
      }
    }
  }

  const cols: BaoCaoColumn[] = [];
  /** Luôn đủ 12 tháng/năm (kể cả 0 ₫) để YoY & TB/tháng khớp cấu trúc BCTC thủ công. */
  for (const thang of THANG_FULL_ORDER) {
    const mapKey = `${nam}|${thang}`;
    cols.push({
      id: `auto-${bundle.nam}-${thang}`,
      nam,
      thang,
      data: byMonth.get(mapKey) ?? {},
      dirty: false,
    });
  }
  return cols;
}

/** Năm cần gom BCTC tự động — ưu tiên năm đã có trong BCTC thủ công + năm liền trước để so YoY. */
export function yearsForTuDongOverview(meta: { nam: string }[]): number[] {
  const years = new Set<number>();
  for (const row of meta) {
    const y = parseInt(row.nam, 10);
    if (Number.isFinite(y)) years.add(y);
  }
  if (years.size === 0) {
    const cy = new Date().getFullYear();
    years.add(cy);
    years.add(cy - 1);
  } else {
    const max = Math.max(...years);
    years.add(max - 1);
  }
  return Array.from(years).sort((a, b) => a - b);
}

export async function fetchBctcTuDongOverviewColumns(
  supabase: SupabaseClient,
  years: number[],
): Promise<{ ok: true; columns: BaoCaoColumn[] } | { ok: false; error: string }> {
  const uniqueYears = [...new Set(years.filter((y) => Number.isFinite(y) && y >= 2000 && y <= 2100))].sort(
    (a, b) => a - b,
  );
  if (uniqueYears.length === 0) {
    return { ok: false, error: "Không xác định được năm cho BCTC tự động." };
  }

  const results = await Promise.all(uniqueYears.map((nam) => fetchBctcTuDongBundle(supabase, { nam })));
  const columns: BaoCaoColumn[] = [];
  for (let i = 0; i < results.length; i++) {
    const res = results[i]!;
    if (!res.ok) return { ok: false, error: res.error };
    columns.push(...tuDongBundleToColumns(res.data));
  }

  return { ok: true, columns };
}
