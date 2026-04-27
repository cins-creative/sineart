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

/** Layer 1 — chỉ tiêu tóm tắt (expand → L2 có Σ nhóm → L3 chi tiết). */
export const BCTC_LAYER1_KEYS = [
  "_tongDT",
  "_dtThuan",
  "_tongCP",
  "_lnTruocThue",
  "_lnSauThue",
] as const;

export type BctcLayer1Key = (typeof BCTC_LAYER1_KEYS)[number];

export const BCTC_LAYER1_DISPLAY_LABELS: Record<BctcLayer1Key, string> = {
  _tongDT: "Tổng doanh thu",
  _dtThuan: "Doanh thu thuần",
  _tongCP: "Tổng chi phí",
  _lnTruocThue: "Lợi nhuận trước thuế",
  _lnSauThue: "Lợi nhuận sau thuế",
};

/** Khối điều hướng L2/L3 trong báo cáo phân cấp. */
export type BctcNavBlock =
  | {
      kind: "rollup";
      id: string;
      title: string;
      /** Dòng Σ nhóm (Layer 2) — `RowDef` formula/result/input */
      subtotalKey: string;
      /** Chi tiết Layer 3 — ẩn đến khi mở khối */
      detailKeys: readonly string[];
    }
  | {
      kind: "flat";
      id: string;
      /** Optional section title row above rows */
      title?: string;
      rowKeys: readonly string[];
    };

export const BCTC_NAV_TREE: Record<BctcLayer1Key, readonly BctcNavBlock[]> = {
  _tongDT: [
    {
      kind: "flat",
      id: "dt-online",
      rowKeys: ["_dtOnline"],
    },
    {
      kind: "flat",
      id: "dt-offline",
      rowKeys: ["_dtOffline"],
    },
    {
      kind: "rollup",
      id: "dt-hh",
      title: "Doanh thu Hình họa",
      subtotalKey: "_dtHinhHoa",
      detailKeys: ["dtHHOnline", "dtHHOffline"],
    },
    {
      kind: "rollup",
      id: "dt-ttm",
      title: "Doanh thu Trang trí màu",
      subtotalKey: "_dtTTM",
      detailKeys: ["dtTTMOnline", "dtTTMOffline"],
    },
    {
      kind: "rollup",
      id: "dt-bcm",
      title: "Doanh thu BCM",
      subtotalKey: "_dtBCM",
      detailKeys: ["dtBCMOnline", "dtBCMOffline"],
    },
    {
      kind: "rollup",
      id: "dt-kids-bg",
      title: "Kids & Background (trong Doanh thu Online)",
      subtotalKey: "_l2SubKidsBackground",
      detailKeys: ["dtKids", "dtBackground"],
    },
    {
      kind: "rollup",
      id: "dt-khac",
      title: "Doanh thu khác (trong Tổng DT)",
      subtotalKey: "_l2SubDTKhacTrongTongDT",
      detailKeys: ["dtDichVu", "dtHoaCu"],
    },
    {
      kind: "flat",
      id: "dt-hdtc-ngoai-tong",
      title: "Hoạt động tài chính (ngoài Tổng DT — vào LN)",
      rowKeys: ["dtHoatDongTC"],
    },
    {
      kind: "rollup",
      id: "giam-tru",
      title: "Giảm trừ doanh thu",
      subtotalKey: "_l2SubGiamTru",
      detailKeys: ["ckKhuyenMai", "hangTraLai"],
    },
  ],
  _dtThuan: [
    {
      kind: "flat",
      id: "thuan-doi-chieu",
      title: "Đối chiếu DT thuần",
      rowKeys: ["_bridgeDtThuanGross", "_l2SubGiamTru", "_dtThuanEcho"],
    },
  ],
  _tongCP: [
    {
      kind: "rollup",
      id: "cp-luong",
      title: "Lương",
      subtotalKey: "_tongLuong",
      detailKeys: ["luongGVLuyenThi", "luongGVBackground", "luongVHDaoTao", "luongVHDichVu"],
    },
    {
      kind: "flat",
      id: "cp-bhxh",
      title: "BHXH nhân viên",
      rowKeys: ["bhxhNhanVien"],
    },
    {
      kind: "rollup",
      id: "cp-thue-phi",
      title: "Thuế VAT học viên + Thuế CC",
      subtotalKey: "_l2ThueVATCC",
      detailKeys: ["thueVATHV", "thueCC"],
    },
    {
      kind: "rollup",
      id: "cp-van-hanh",
      title: "Chi phí hoạt động",
      subtotalKey: "_l2CpPhiVanHanh",
      detailKeys: [
        "cpTrichTruoc",
        "cpTiecQua",
        "cpDaoTao",
        "cpWebsite",
        "cpPhanMem",
        "cpMarketing",
        "cpKhauHao",
        "cpDienNuoc",
        "cpMatBang",
        "cpNganHang",
        "cpTienKhac",
      ],
    },
    {
      kind: "rollup",
      id: "cp-tong-hop-nhanh",
      title: "CP hỗ trợ KD + CP cố định (nhánh)",
      subtotalKey: "_l2SubCpTongHopBranches",
      detailKeys: ["_cpHoTroKD", "_cpCoDinh"],
    },
  ],
  _lnTruocThue: [
    {
      kind: "flat",
      id: "ln-truoc-doi-chieu",
      title: "Đối chiếu LN trước thuế",
      rowKeys: ["_l2LnDtBridge", "_l2LnCpBridge", "_lnTruocEcho"],
    },
  ],
  _lnSauThue: [
    {
      kind: "flat",
      id: "ln-sau-doi-chieu",
      title: "Từ LN trước thuế (~94%)",
      rowKeys: ["_lnTruocEchoSau", "_l2LnSauFromTruoc", "_lnSauEcho"],
    },
  ],
};

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
    label: "Σ Doanh thu Hình họa",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtHHOnline) + n(c.dtHHOffline),
  },
  {
    key: "_dtTTM",
    label: "Σ Doanh thu Trang trí màu",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtTTMOnline) + n(c.dtTTMOffline),
  },
  {
    key: "_dtBCM",
    label: "Σ Doanh thu BCM",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtBCMOnline) + n(c.dtBCMOffline),
  },
  {
    key: "_dtOnline",
    label: "Doanh thu Online",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) =>
      n(c.dtTTMOnline) + n(c.dtHHOnline) + n(c.dtBCMOnline) + n(c.dtKids) + n(c.dtBackground),
  },
  {
    key: "_dtOffline",
    label: "Doanh thu Offline",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    formula: (c) => n(c.dtTTMOffline) + n(c.dtHHOffline) + n(c.dtBCMOffline),
  },
  { key: "__sec_dtkhac", label: "DOANH THU KHÁC", type: "section", color: "#8b5cf6" },
  { key: "dtDichVu", label: "Dịch vụ", type: "input", indent: 1 },
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

  /** —— Phân cấp L2/L3 (chỉ hiển thị, không map DB) —— */
  {
    key: "_l2SubDTLop",
    label: "Σ Doanh thu lớp học",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    bold: true,
    formula: (c) =>
      n(c.dtTTMOnline) +
      n(c.dtTTMOffline) +
      n(c.dtHHOnline) +
      n(c.dtHHOffline) +
      n(c.dtBCMOnline) +
      n(c.dtBCMOffline) +
      n(c.dtKids) +
      n(c.dtBackground),
  },
  {
    key: "_l2SubDTTheoMon",
    label: "Σ Doanh thu theo môn",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    bold: true,
    formula: (c) =>
      n(c.dtTTMOnline) +
      n(c.dtTTMOffline) +
      n(c.dtHHOnline) +
      n(c.dtHHOffline) +
      n(c.dtBCMOnline) +
      n(c.dtBCMOffline) +
      n(c.dtKids) +
      n(c.dtBackground),
  },
  {
    key: "_l2SubKidsBackground",
    label: "Σ Kids & Background",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    bold: true,
    formula: (c) => n(c.dtKids) + n(c.dtBackground),
  },
  {
    key: "_l2SubOnlineOfflineOnly",
    label: "Σ Tổng Online + Tổng Offline",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    bold: true,
    formula: (c) =>
      n(c.dtTTMOnline) +
      n(c.dtHHOnline) +
      n(c.dtBCMOnline) +
      n(c.dtKids) +
      n(c.dtBackground) +
      n(c.dtTTMOffline) +
      n(c.dtHHOffline) +
      n(c.dtBCMOffline),
  },
  {
    key: "_l2SubDTKhacTrongTongDT",
    label: "Σ Doanh thu khác (trong Tổng DT)",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    bold: true,
    formula: (c) => n(c.dtDichVu) + n(c.dtHoaCu),
  },
  {
    key: "_l2SubGiamTru",
    label: "Σ Giảm trừ (CK + hàng trả lại)",
    type: "formula",
    indent: 1,
    color: DS_AMBER,
    bold: true,
    formula: (c) => n(c.ckKhuyenMai) + n(c.hangTraLai),
  },
  {
    key: "_bridgeDtThuanGross",
    label: "Doanh thu gộp (theo Tổng DT)",
    type: "formula",
    indent: 1,
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
      n(c.dtHoaCu),
  },
  {
    key: "_dtThuanEcho",
    label: "Doanh thu thuần (= kiểm tra)",
    type: "result",
    indent: 1,
    color: DS_ACC,
    bold: true,
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
        n(c.dtHoaCu);
      return t - n(c.ckKhuyenMai) - n(c.hangTraLai);
    },
  },
  {
    key: "_l2CpPhiVanHanh",
    label: "Σ Chi phí hoạt động (trừ lương & BHXH)",
    type: "formula",
    indent: 1,
    color: DS_RED,
    bold: true,
    formula: (c) =>
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
  {
    key: "_l2ThueVATCC",
    label: "Σ Thuế VAT học viên + Thuế CC",
    type: "formula",
    indent: 1,
    color: DS_RED,
    bold: true,
    formula: (c) => n(c.thueVATHV) + n(c.thueCC),
  },
  {
    key: "_l2SubCpTongHopBranches",
    label: "Σ CP hỗ trợ KD + CP cố định (nhánh)",
    type: "formula",
    indent: 1,
    color: DS_ACC,
    bold: true,
    formula: (c) =>
      n(c.cpMarketing) +
      n(c.cpTiecQua) +
      n(c.cpWebsite) +
      n(c.cpPhanMem) +
      n(c.cpDienNuoc) +
      n(c.cpMatBang) +
      n(c.cpNganHang) +
      n(c.cpTienKhac),
  },
  {
    key: "_l2LnDtBridge",
    label: "Doanh thu sau giảm trừ (+ HĐTC)",
    type: "formula",
    indent: 1,
    color: "#EE5CA2",
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
      n(c.dtHoaCu) +
      n(c.dtHoatDongTC) -
      n(c.ckKhuyenMai) -
      n(c.hangTraLai),
  },
  {
    key: "_l2LnCpBridge",
    label: "Σ Chi phí (theo LN trước thuế)",
    type: "formula",
    indent: 1,
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
  {
    key: "_lnTruocEcho",
    label: "Lợi nhuận trước thuế (= kiểm tra)",
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
    key: "_lnTruocEchoSau",
    label: "LN trước thuế (tham chiếu)",
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
    key: "_l2LnSauFromTruoc",
    label: "LN trước × ~94% (= kiểm tra sau thuế)",
    type: "formula",
    indent: 1,
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
  {
    key: "_lnSauEcho",
    label: "Lợi nhuận sau thuế (= kiểm tra)",
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

export const ROW_DEF_MAP: Record<string, RowDef> = Object.fromEntries(ROWS.map((r) => [r.key, r]));

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

/** Gộp nhiều `ColData` (các tháng trong quý) — dùng cho cột Σ quý và YoY quý. */
export function mergeColDataInputs(cols: ColData[]): ColData {
  const result: ColData = {};
  for (const k of INPUT_KEYS) {
    const sum = Math.round(cols.reduce((acc, c) => acc + n(c[k]), 0));
    if (sum !== 0) result[k] = String(sum);
  }
  return result;
}

export const QUARTER_MONTHS: Record<number, string[]> = {
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
      const merged = mergeColDataInputs(present.map((c) => c.data));
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

/** Meta so sánh cùng kỳ năm trước — `comparable` = đủ dữ liệu để hiển thị %. */
export type PriorComparisonMeta = {
  priorColData: ColData | null;
  comparable: boolean;
};

/**
 * Cùng kỳ năm trước — chỉ dựa trên cột tháng gốc.
 * Quý: chỉ `comparable` khi **đủ 3 tháng** của quý đó cho **cả** năm hiện tại và năm trước
 * (vd. mới có tháng 4 của Q2 → không so được với Q2 năm trước).
 */
export function getPriorComparisonMeta(
  col: BaoCaoColumn,
  rawMonthCols: BaoCaoColumn[],
): PriorComparisonMeta {
  const y = parseInt(col.nam, 10);
  if (!Number.isFinite(y) || y <= 1) {
    return { priorColData: null, comparable: false };
  }
  const py = String(y - 1);

  if (col.isQuarter === true) {
    const m = /^q_(\d+)_Q(\d)$/.exec(col.id);
    if (!m) return { priorColData: null, comparable: false };
    const q = Number(m[2]);
    if (q < 1 || q > 4) return { priorColData: null, comparable: false };
    const qMonths = QUARTER_MONTHS[q];
    const currentInQ = rawMonthCols.filter(
      (c) => !c.isQuarter && c.nam === col.nam && qMonths.includes(c.thang),
    );
    const priorInQ = rawMonthCols.filter(
      (c) => !c.isQuarter && c.nam === py && qMonths.includes(c.thang),
    );
    const comparable = currentInQ.length === 3 && priorInQ.length === 3;
    const priorColData =
      comparable && priorInQ.length === 3
        ? mergeColDataInputs(priorInQ.map((c) => c.data))
        : null;
    return { priorColData, comparable };
  }

  const hit = rawMonthCols.find((c) => !c.isQuarter && c.nam === py && c.thang === col.thang);
  return {
    priorColData: hit ? hit.data : null,
    comparable: !!hit,
  };
}

export function getPriorPeriodColData(
  col: BaoCaoColumn,
  rawMonthCols: BaoCaoColumn[],
): ColData | null {
  return getPriorComparisonMeta(col, rawMonthCols).priorColData;
}
