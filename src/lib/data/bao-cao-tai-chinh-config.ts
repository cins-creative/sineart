/** Bảng `tc_bao_cao_tai_chinh` — map UI key → cột Supabase (theo Framer VH_Bao_cao_tai_chinh). */

export type RowType = "section" | "input" | "formula" | "result";

export interface RowDef {
  key: string;
  label: string;
  type: RowType;
  section?: string;
  indent?: number;
  formula?: (cols: ColData) => number;
  color?: string;
  bold?: boolean;
}

export type ColData = Record<string, string>;

/** Thứ tự quan trọng: cột DB trùng nhau → key đứng trước nhận giá trị khi đọc. */
export const KEY_TO_COL_ENTRIES: readonly [string, string][] = [
  ["dtTTMOnline", "dt_ttm_onl"],
  ["dtTTMOffline", "dt_ttm_off"],
  ["dtHHOnline", "dt_hh_onl"],
  ["dtHHOffline", "dt_hh_off"],
  ["dtBCMOnline", "dt_bcm_onl"],
  ["dtBCMOffline", "dt_bcm_off"],
  ["dtKids", "dt_kids"],
  ["dtBackground", "dt_background"],
  ["dtDichVu", "dt_dich_vu"],
  ["dtMarketplace", "dt_marketplace"],
  ["dtHoaCu", "dt_hh_off"],
  ["dtHoatDongTC", "dt_hoat_dong_tc"],
  ["ckKhuyenMai", "chietkhau_khuyenmai"],
  ["hangTraLai", "hangban_tralai"],
  ["luongGVLuyenThi", "luong_gv_luyenthi"],
  ["luongGVBackground", "luong_gv_background"],
  ["luongVHDaoTao", "luong_vh_luyenthi"],
  ["luongVHDichVu", "luong_vh_web"],
  ["bhxhNhanVien", "bhxh_nhanvien"],
  ["thueVATHV", "thue_vat_hocvien"],
  ["thueCC", "thue_cungcapdichvu"],
  ["cpTrichTruoc", "cp_trich_truoc"],
  ["cpTiecQua", "cp_qua_sinhnhat"],
  ["cpDaoTao", "cp_daotao"],
  ["cpWebsite", "cp_website"],
  ["cpPhanMem", "cp_phanmem"],
  ["cpMarketing", "cp_khac"],
  ["cpKhauHao", "cp_khauhao_tscd"],
  ["cpDienNuoc", "cp_diennuoc_internet"],
  ["cpMatBang", "cp_matbang"],
  ["cpNganHang", "cp_nganhang"],
  ["cpTienKhac", "cp_khac"],
] as const;

export const KEY_TO_COL: Record<string, string> = Object.fromEntries(KEY_TO_COL_ENTRIES);

export const TC_BAO_CAO_SELECT_COLUMNS = [
  "id",
  "created_at",
  "nam",
  "thang",
  ...Array.from(new Set(KEY_TO_COL_ENTRIES.map(([, c]) => c))),
].join(",");

const DS_ACC = "#10b981";
const DS_RED = "#ef4444";
const DS_AMBER = "#f59e0b";

/**
 * Đọc số tiền / số từ ô nhập hoặc DB.
 * Hỗ trợ dạng VN: `171.430.068` (dấu chấm phân cách nghìn), số nguyên thuần, và số âm `-1.234.567`.
 * Tránh `parseFloat("171.430.068") === 171.43` (lỗi cũ làm sai toàn bộ công thức & cột quý).
 */
export const n = (s?: string): number => {
  if (s == null) return 0;
  let t = String(s).trim().replace(/\s/g, "");
  if (!t || t === "—") return 0;
  const neg = t.startsWith("-");
  if (neg) t = t.slice(1);
  let v = 0;
  if (/^\d+$/.test(t)) {
    v = parseInt(t, 10);
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    v = parseInt(t.replace(/\./g, ""), 10);
  } else {
    const x = parseFloat(t.replace(/,/g, "."));
    v = Number.isNaN(x) ? 0 : x;
  }
  const out = neg ? -v : v;
  return Number.isFinite(out) ? out : 0;
};

export const fmtNum = (v: number): string =>
  v === 0 ? "—" : Math.round(v).toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export const ROWS: RowDef[] = [
  { key: "__sec_dt", label: "DOANH THU LỚP HỌC", type: "section", color: "#3b82f6" },
  { key: "dtTTMOnline", label: "TTM Online", type: "input", indent: 1 },
  { key: "dtTTMOffline", label: "TTM Offline", type: "input", indent: 1 },
  { key: "dtHHOnline", label: "HH Online", type: "input", indent: 1 },
  { key: "dtHHOffline", label: "HH Offline", type: "input", indent: 1 },
  { key: "dtBCMOnline", label: "BCM Online", type: "input", indent: 1 },
  { key: "dtBCMOffline", label: "BCM Offline", type: "input", indent: 1 },
  { key: "dtKids", label: "Kids", type: "input", indent: 1 },
  { key: "dtBackground", label: "Lớp Background", type: "input", indent: 1 },
  { key: "__sec_tonghop", label: "TỔNG HỢP DOANH THU", type: "section", color: DS_ACC },
  {
    key: "_dtHinhHoa",
    label: "DT Hình họa",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtHHOnline) + n(c.dtHHOffline),
  },
  {
    key: "_dtTTM",
    label: "DT TTM",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtTTMOnline) + n(c.dtTTMOffline),
  },
  {
    key: "_dtBCM",
    label: "DT BCM",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtBCMOnline) + n(c.dtBCMOffline),
  },
  {
    key: "_dtOnline",
    label: "Tổng DT Online",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) =>
      n(c.dtTTMOnline) + n(c.dtHHOnline) + n(c.dtBCMOnline) + n(c.dtKids) + n(c.dtBackground),
  },
  {
    key: "_dtOffline",
    label: "Tổng DT Offline",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtTTMOffline) + n(c.dtHHOffline) + n(c.dtBCMOffline),
  },
  { key: "__sec_dtkhac", label: "DOANH THU KHÁC", type: "section", color: "#8b5cf6" },
  { key: "dtDichVu", label: "Dịch vụ", type: "input", indent: 1 },
  { key: "dtMarketplace", label: "Marketplace", type: "input", indent: 1 },
  { key: "dtHoaCu", label: "Họa cụ", type: "input", indent: 1 },
  { key: "dtHoatDongTC", label: "Hoạt động tài chính", type: "input", indent: 1 },
  { key: "__sec_giamtru", label: "GIẢM TRỪ DOANH THU", type: "section", color: DS_AMBER },
  { key: "ckKhuyenMai", label: "Chiết khấu KM", type: "input", indent: 1 },
  { key: "hangTraLai", label: "Hàng bán trả lại", type: "input", indent: 1 },
  {
    key: "_tongDT",
    label: "TỔNG DOANH THU",
    type: "result",
    bold: true,
    color: DS_ACC,
    formula: (c) =>
      n(c.dtTTMOnline) +
      n(c.dtTTMOffline) +
      n(c.dtHHOnline) +
      n(c.dtHHOffline) +
      n(c.dtBCMOnline) +
      n(c.dtBCMOffline) +
      n(c.dtKids) +
      n(c.dtBackground) +
      n(c.dtDichVu) +
      n(c.dtMarketplace) +
      n(c.dtHoaCu),
  },
  {
    key: "_dtThuan",
    label: "DT THUẦN BH & DV",
    type: "result",
    bold: true,
    color: DS_ACC,
    formula: (c) => {
      const t =
        n(c.dtTTMOnline) +
        n(c.dtTTMOffline) +
        n(c.dtHHOnline) +
        n(c.dtHHOffline) +
        n(c.dtBCMOnline) +
        n(c.dtBCMOffline) +
        n(c.dtKids) +
        n(c.dtBackground) +
        n(c.dtDichVu) +
        n(c.dtMarketplace) +
        n(c.dtHoaCu);
      return t - n(c.ckKhuyenMai) - n(c.hangTraLai);
    },
  },
  { key: "__sec_luong", label: "LƯƠNG", type: "section", color: DS_AMBER },
  { key: "luongGVLuyenThi", label: "GV lớp luyện thi", type: "input", indent: 1 },
  { key: "luongGVBackground", label: "GV lớp Background", type: "input", indent: 1 },
  { key: "luongVHDaoTao", label: "VH hoạt động đào tạo", type: "input", indent: 1 },
  { key: "luongVHDichVu", label: "VH hoạt động dịch vụ", type: "input", indent: 1 },
  {
    key: "_tongLuong",
    label: "Tổng lương",
    type: "formula",
    indent: 1,
    color: DS_AMBER,
    bold: true,
    formula: (c) =>
      n(c.luongGVLuyenThi) + n(c.luongGVBackground) + n(c.luongVHDaoTao) + n(c.luongVHDichVu),
  },
  { key: "__sec_thue", label: "THUẾ & BHXH", type: "section", color: DS_RED },
  { key: "bhxhNhanVien", label: "BHXH nhân viên", type: "input", indent: 1 },
  { key: "thueVATHV", label: "Thuế VAT học viên", type: "input", indent: 1 },
  { key: "thueCC", label: "Thuế cung cấp DV", type: "input", indent: 1 },
  {
    key: "_tongThue",
    label: "Tổng thuế",
    type: "formula",
    indent: 1,
    color: DS_RED,
    formula: (c) => n(c.bhxhNhanVien) + n(c.thueVATHV) + n(c.thueCC),
  },
  { key: "__sec_chiphi", label: "CHI PHÍ", type: "section", color: DS_RED },
  { key: "cpTrichTruoc", label: "Trích trước", type: "input", indent: 1 },
  { key: "cpTiecQua", label: "Tiệc, quà & sinh nhật", type: "input", indent: 1 },
  { key: "cpDaoTao", label: "Dùng trong đào tạo", type: "input", indent: 1 },
  { key: "cpWebsite", label: "Duy trì website", type: "input", indent: 1 },
  { key: "cpPhanMem", label: "Phần mềm", type: "input", indent: 1 },
  { key: "cpMarketing", label: "Marketing", type: "input", indent: 1 },
  { key: "cpKhauHao", label: "Khấu hao TSCĐ", type: "input", indent: 1 },
  { key: "cpDienNuoc", label: "Điện nước internet", type: "input", indent: 1 },
  { key: "cpMatBang", label: "Mặt bằng", type: "input", indent: 1 },
  { key: "cpNganHang", label: "Ngân hàng", type: "input", indent: 1 },
  { key: "cpTienKhac", label: "Bằng tiền khác", type: "input", indent: 1 },
  { key: "__sec_tongcp", label: "TỔNG HỢP CHI PHÍ", type: "section", color: DS_ACC },
  {
    key: "_cpHoTroKD",
    label: "CP hỗ trợ kinh doanh",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.cpMarketing) + n(c.cpTiecQua),
  },
  {
    key: "_cpCoDinh",
    label: "CP cố định khác",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) =>
      n(c.cpWebsite) +
      n(c.cpPhanMem) +
      n(c.cpDienNuoc) +
      n(c.cpMatBang) +
      n(c.cpNganHang) +
      n(c.cpTienKhac),
  },
  {
    key: "_tongCP",
    label: "Tổng chi phí",
    type: "formula",
    indent: 1,
    bold: true,
    color: DS_RED,
    formula: (c) =>
      n(c.luongGVLuyenThi) +
      n(c.luongGVBackground) +
      n(c.luongVHDaoTao) +
      n(c.luongVHDichVu) +
      n(c.bhxhNhanVien) +
      n(c.cpTrichTruoc) +
      n(c.cpTiecQua) +
      n(c.cpDaoTao) +
      n(c.cpWebsite) +
      n(c.cpPhanMem) +
      n(c.cpMarketing) +
      n(c.cpKhauHao) +
      n(c.cpDienNuoc) +
      n(c.cpMatBang) +
      n(c.cpNganHang) +
      n(c.cpTienKhac),
  },
  { key: "__sec_kq", label: "KẾT QUẢ KINH DOANH", type: "section", color: "#EE5CA2" },
  {
    key: "_lnTruocThue",
    label: "LỢI NHUẬN TRƯỚC THUẾ",
    type: "result",
    bold: true,
    color: "#EE5CA2",
    formula: (c) => {
      const dt =
        n(c.dtTTMOnline) +
        n(c.dtTTMOffline) +
        n(c.dtHHOnline) +
        n(c.dtHHOffline) +
        n(c.dtBCMOnline) +
        n(c.dtBCMOffline) +
        n(c.dtKids) +
        n(c.dtBackground) +
        n(c.dtDichVu) +
        n(c.dtMarketplace) +
        n(c.dtHoaCu) +
        n(c.dtHoatDongTC) -
        n(c.ckKhuyenMai) -
        n(c.hangTraLai);
      const cp =
        n(c.luongGVLuyenThi) +
        n(c.luongGVBackground) +
        n(c.luongVHDaoTao) +
        n(c.luongVHDichVu) +
        n(c.bhxhNhanVien) +
        n(c.cpTrichTruoc) +
        n(c.cpTiecQua) +
        n(c.cpDaoTao) +
        n(c.cpWebsite) +
        n(c.cpPhanMem) +
        n(c.cpMarketing) +
        n(c.cpKhauHao) +
        n(c.cpDienNuoc) +
        n(c.cpMatBang) +
        n(c.cpNganHang) +
        n(c.cpTienKhac);
      return dt - cp;
    },
  },
  {
    key: "_lnSauThue",
    label: "LỢI NHUẬN SAU THUẾ (~6%)",
    type: "result",
    bold: true,
    color: "#EE5CA2",
    formula: (c) => {
      const dt =
        n(c.dtTTMOnline) +
        n(c.dtTTMOffline) +
        n(c.dtHHOnline) +
        n(c.dtHHOffline) +
        n(c.dtBCMOnline) +
        n(c.dtBCMOffline) +
        n(c.dtKids) +
        n(c.dtBackground) +
        n(c.dtDichVu) +
        n(c.dtMarketplace) +
        n(c.dtHoaCu) +
        n(c.dtHoatDongTC) -
        n(c.ckKhuyenMai) -
        n(c.hangTraLai);
      const cp =
        n(c.luongGVLuyenThi) +
        n(c.luongGVBackground) +
        n(c.luongVHDaoTao) +
        n(c.luongVHDichVu) +
        n(c.bhxhNhanVien) +
        n(c.cpTrichTruoc) +
        n(c.cpTiecQua) +
        n(c.cpDaoTao) +
        n(c.cpWebsite) +
        n(c.cpPhanMem) +
        n(c.cpMarketing) +
        n(c.cpKhauHao) +
        n(c.cpDienNuoc) +
        n(c.cpMatBang) +
        n(c.cpNganHang) +
        n(c.cpTienKhac);
      return (dt - cp) * 0.94;
    },
  },
];

/** Chỉ tiêu tab «BCTC tổng quan» (dashboard) — tổng hợp & KQKD, không chi tiết từng dòng nhập. */
export const BCTC_SUMMARY_ROW_KEYS = [
  "__sec_tonghop",
  "_dtHinhHoa",
  "_dtTTM",
  "_dtBCM",
  "_dtOnline",
  "_dtOffline",
  "__sec_giamtru",
  "_tongDT",
  "_dtThuan",
  "__sec_luong",
  "_tongLuong",
  "__sec_thue",
  "_tongThue",
  "__sec_tongcp",
  "_cpHoTroKD",
  "_cpCoDinh",
  "_tongCP",
  "__sec_kq",
  "_lnTruocThue",
  "_lnSauThue",
] as const;

/** Bản đầy đủ như trang Báo cáo tài chính hoặc bản rút gọn cho toàn nhân viên. */
export function rowsForBctcVariant(variant: "full" | "summary"): RowDef[] {
  if (variant === "full") return ROWS;
  const allowed = new Set<string>(BCTC_SUMMARY_ROW_KEYS);
  return ROWS.filter((r) => allowed.has(r.key));
}

export const INPUT_KEYS = ROWS.filter((r) => r.type === "input").map((r) => r.key);

export const THANG_SHORT_TO_FULL: Record<string, string> = {
  T1: "Tháng 1",
  T2: "Tháng 2",
  T3: "Tháng 3",
  T4: "Tháng 4",
  T5: "Tháng 5",
  T6: "Tháng 6",
  T7: "Tháng 7",
  T8: "Tháng 8",
  T9: "Tháng 9",
  T10: "Tháng 10",
  T11: "Tháng 11",
  T12: "Tháng 12",
};

export const THANG_FULL_TO_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(THANG_SHORT_TO_FULL).map(([k, v]) => [v, k]),
);

export const THANG_OPT = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export const THANG_FULL_ORDER = Object.values(THANG_SHORT_TO_FULL);

export function namOptions(centerYear: number): string[] {
  return Array.from({ length: 9 }, (_, i) => String(centerYear - 3 + i));
}

export function mapRowToColData(r: Record<string, unknown>): ColData {
  const data: ColData = {};
  const assignedDb = new Set<string>();
  for (const [uiKey, dbCol] of KEY_TO_COL_ENTRIES) {
    if (assignedDb.has(dbCol)) continue;
    const val = r[dbCol];
    if (val != null && val !== "") {
      data[uiKey] = String(val);
      assignedDb.add(dbCol);
    }
  }
  return data;
}

export function buildSupabasePayload(
  nam: string,
  thang: string,
  data: ColData,
): Record<string, string | number> {
  const body: Record<string, string | number> = { nam, thang };
  const sums: Record<string, number> = {};
  for (const key of INPUT_KEYS) {
    const col = KEY_TO_COL[key];
    if (!col) continue;
    sums[col] = (sums[col] ?? 0) + n(data[key]);
  }
  for (const [col, sum] of Object.entries(sums)) {
    body[col] = Math.round(sum);
  }
  return body;
}

function mergeColData(cols: ColData[]): ColData {
  const result: ColData = {};
  for (const k of INPUT_KEYS) {
    const sum = Math.round(cols.reduce((acc, c) => acc + n(c[k]), 0));
    if (sum !== 0) result[k] = String(sum);
  }
  return result;
}

const QUARTER_MONTHS: Record<number, string[]> = {
  1: ["Tháng 1", "Tháng 2", "Tháng 3"],
  2: ["Tháng 4", "Tháng 5", "Tháng 6"],
  3: ["Tháng 7", "Tháng 8", "Tháng 9"],
  4: ["Tháng 10", "Tháng 11", "Tháng 12"],
};

export interface BaoCaoColumn {
  id: string;
  nam: string;
  thang: string;
  data: ColData;
  recordId?: number;
  saving?: boolean;
  saved?: boolean;
  error?: string;
  dirty?: boolean;
  isQuarter?: boolean;
  quarterLabel?: string;
  quarterData?: ColData;
  quarterPartial?: boolean;
  quarterCount?: number;
}

export function buildDisplayCols(columns: BaoCaoColumn[]): BaoCaoColumn[] {
  const display: BaoCaoColumn[] = [];
  const byYear: Record<string, BaoCaoColumn[]> = {};
  for (const c of columns) {
    if (!byYear[c.nam]) byYear[c.nam] = [];
    byYear[c.nam].push(c);
  }
  const years = Object.keys(byYear).sort();
  for (const year of years) {
    const yearCols = byYear[year].sort(
      (a, b) => THANG_FULL_ORDER.indexOf(a.thang) - THANG_FULL_ORDER.indexOf(b.thang),
    );
    /** Trước: Q1+tháng Q1, Q2+tháng… — sau: Q1…Q4 (cột tổng quý), rồi toàn bộ tháng theo lịch. */
    for (let q = 1; q <= 4; q++) {
      const qMonths = QUARTER_MONTHS[q];
      const present = yearCols.filter((c) => qMonths.includes(c.thang));
      if (present.length === 0) continue;
      const merged = mergeColData(present.map((c) => c.data));
      display.push({
        id: `q_${year}_Q${q}`,
        nam: year,
        thang: "",
        data: merged,
        isQuarter: true,
        quarterLabel: `Q${q} ${year}`,
        quarterData: merged,
        quarterPartial: present.length < 3,
        quarterCount: present.length,
      });
    }
    for (const col of yearCols) {
      display.push(col);
    }
  }
  return display;
}
