/**
 * Công cụ tính điểm xét tuyển — tham khảo theo quy định gần nhất.
 * Trước khi dùng cho tư vấn chính thức: đối chiếu lại đề án tuyển sinh từng trường / năm.
 */

export type CongThucInput = {
  key: string;
  label: string;
  diem_toi_da: number;
};

export type CongThuc = {
  mo_ta: string;
  inputs: CongThucInput[];
  tinh: (inputs: Record<string, number>) => number;
};

export type Truong = {
  id: string;
  ten: string;
  viet_tat: string;
  cac_mon: string[];
  cong_thuc: CongThuc;
  /** Điểm chuẩn năm gần nhất — key = tên ngành / chương */
  diem_chuan_gan_nhat: Record<string, number>;
};

export const DANH_SACH_TRUONG: Truong[] = [
  {
    id: "ufa",
    ten: "Đại học Mỹ thuật TP.HCM",
    viet_tat: "UFA",
    cac_mon: ["Hình họa", "Trang trí màu", "Bố cục màu"],
    cong_thuc: {
      mo_ta: "Điểm NK × 4 + Điểm Văn hóa (tổng 3 môn)",
      inputs: [
        { key: "nang_khieu", label: "Điểm năng khiếu (thang 25)", diem_toi_da: 25 },
        { key: "van_hoa", label: "Tổng điểm văn hóa 3 môn (thang 30)", diem_toi_da: 30 },
      ],
      tinh: (i) => Number(i.nang_khieu ?? 0) * 4 + Number(i.van_hoa ?? 0),
    },
    diem_chuan_gan_nhat: {
      "Hội họa": 85,
      "Đồ họa": 90,
      "Điêu khắc": 75,
      "Sư phạm Mỹ thuật": 70,
    },
  },
  {
    id: "uah",
    ten: "Đại học Kiến trúc TP.HCM",
    viet_tat: "UAH",
    cac_mon: ["Hình họa", "Trang trí màu"],
    cong_thuc: {
      mo_ta: "(Điểm NK / 25 × 10) × 2 + Điểm VH tổ hợp",
      inputs: [
        { key: "nang_khieu", label: "Điểm năng khiếu (thang 25)", diem_toi_da: 25 },
        { key: "toan", label: "Điểm Toán", diem_toi_da: 10 },
        { key: "van", label: "Điểm Văn", diem_toi_da: 10 },
        { key: "mon3", label: "Điểm môn 3 (Lý/Sử/Địa...)", diem_toi_da: 10 },
      ],
      tinh: (i) =>
        (Number(i.nang_khieu ?? 0) / 25) * 10 * 2 +
        Number(i.toan ?? 0) +
        Number(i.van ?? 0) +
        Number(i.mon3 ?? 0),
    },
    diem_chuan_gan_nhat: {
      "Kiến trúc": 21.5,
      "Thiết kế Đồ họa": 20.5,
      "Thiết kế Nội thất": 20.0,
      "Thiết kế Thời trang": 19.5,
    },
  },
  {
    id: "hcmute",
    ten: "Đại học Sư phạm Kỹ thuật TP.HCM",
    viet_tat: "HCMUTE",
    cac_mon: ["Hình họa", "Trang trí màu"],
    cong_thuc: {
      mo_ta: "Điểm NK × 2 + Điểm VH tổ hợp",
      inputs: [
        { key: "nang_khieu", label: "Điểm năng khiếu (thang 10)", diem_toi_da: 10 },
        { key: "toan", label: "Điểm Toán", diem_toi_da: 10 },
        { key: "van", label: "Điểm Văn", diem_toi_da: 10 },
        { key: "mon3", label: "Điểm môn 3", diem_toi_da: 10 },
      ],
      tinh: (i) =>
        Number(i.nang_khieu ?? 0) * 2 +
        Number(i.toan ?? 0) +
        Number(i.van ?? 0) +
        Number(i.mon3 ?? 0),
    },
    diem_chuan_gan_nhat: {
      "Thiết kế Đồ họa": 22.0,
    },
  },
  {
    id: "tdtu",
    ten: "Đại học Tôn Đức Thắng",
    viet_tat: "TDTU",
    cac_mon: ["Hình họa", "Trang trí màu"],
    cong_thuc: {
      mo_ta: "Điểm NK (thang 10) + Điểm VH tổ hợp",
      inputs: [
        { key: "nang_khieu", label: "Điểm năng khiếu (thang 10)", diem_toi_da: 10 },
        { key: "toan", label: "Điểm Toán", diem_toi_da: 10 },
        { key: "van", label: "Điểm Văn", diem_toi_da: 10 },
        { key: "mon3", label: "Điểm môn 3", diem_toi_da: 10 },
      ],
      tinh: (i) =>
        Number(i.nang_khieu ?? 0) +
        Number(i.toan ?? 0) +
        Number(i.van ?? 0) +
        Number(i.mon3 ?? 0),
    },
    diem_chuan_gan_nhat: {
      "Thiết kế Đồ họa": 20.5,
    },
  },
  {
    id: "vlu",
    ten: "Đại học Văn Lang",
    viet_tat: "VLU",
    cac_mon: ["Hình họa", "Trang trí màu", "Bố cục màu"],
    cong_thuc: {
      mo_ta: "Điểm NK (thang 10) × 2 + Điểm VH tổ hợp",
      inputs: [
        { key: "nang_khieu", label: "Điểm năng khiếu (thang 10)", diem_toi_da: 10 },
        { key: "toan", label: "Điểm Toán", diem_toi_da: 10 },
        { key: "van", label: "Điểm Văn", diem_toi_da: 10 },
        { key: "mon3", label: "Điểm môn 3", diem_toi_da: 10 },
      ],
      tinh: (i) =>
        Number(i.nang_khieu ?? 0) * 2 +
        Number(i.toan ?? 0) +
        Number(i.van ?? 0) +
        Number(i.mon3 ?? 0),
    },
    diem_chuan_gan_nhat: {
      "Thiết kế Đồ họa": 21.0,
      "Thiết kế Nội thất": 20.0,
      "Kiến trúc": 21.5,
    },
  },
  {
    id: "sgu",
    ten: "Đại học Sài Gòn",
    viet_tat: "SGU",
    cac_mon: ["Hình họa", "Trang trí màu"],
    cong_thuc: {
      mo_ta: "Điểm NK (thang 10) + Điểm VH tổ hợp",
      inputs: [
        { key: "nang_khieu", label: "Điểm năng khiếu (thang 10)", diem_toi_da: 10 },
        { key: "toan", label: "Điểm Toán", diem_toi_da: 10 },
        { key: "van", label: "Điểm Văn", diem_toi_da: 10 },
        { key: "mon3", label: "Điểm môn 3", diem_toi_da: 10 },
      ],
      tinh: (i) =>
        Number(i.nang_khieu ?? 0) +
        Number(i.toan ?? 0) +
        Number(i.van ?? 0) +
        Number(i.mon3 ?? 0),
    },
    diem_chuan_gan_nhat: {
      "Sư phạm Mỹ thuật": 18.5,
    },
  },
];

export function getTruongById(id: string): Truong | undefined {
  return DANH_SACH_TRUONG.find((t) => t.id === id);
}
