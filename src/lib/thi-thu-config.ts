/** Theo brief `brief-thi-thu-final` — không lưu DB. */

export type MonThiKey = "hinh_hoa" | "trang_tri_mau" | "bo_cuc_mau";

/** Mỗi mốc: phút elapsed trên timeline + label hiển thị dưới marker. */
export type MocTimelineEntry = { phut: number; label: string };

export type MonThiConfig = {
  label: string;
  thoi_luong_phut: number;
  moc_timeline: MocTimelineEntry[];
  /** Text nhỏ multiline tại các mốc quan trọng (phút → nội dung). */
  nhan_moc_dac_biet: Partial<Record<number, string>>;
  phut_hien_nop_bai: number;
  co_giai_lao: boolean;
  color: string;
};

export const MON_THI_CONFIG: Record<MonThiKey, MonThiConfig> = {
  hinh_hoa: {
    label: "Hình họa",
    thoi_luong_phut: 360,
    moc_timeline: [
      { phut: 0, label: "0\nphút" },
      { phut: 45, label: "45\nphút" },
      { phut: 90, label: "90\nphút" },
      { phut: 135, label: "135\nphút" },
      { phut: 180, label: "180\nphút" },
      { phut: 225, label: "225\nphút" },
      { phut: 270, label: "270\nphút" },
      { phut: 315, label: "315\nphút" },
      { phut: 360, label: "360\nphút" },
    ],
    nhan_moc_dac_biet: {
      225: "Nộp bài\n+ Chân dung\n+ Tượng\n+ Tĩnh vật",
      360: "Nộp bài\nToàn thân",
    },
    phut_hien_nop_bai: 225,
    co_giai_lao: true,
    color: "var(--cat-hh)",
  },
  trang_tri_mau: {
    label: "Trang trí màu",
    thoi_luong_phut: 270,
    moc_timeline: [
      { phut: 0, label: "0\nphút" },
      { phut: 30, label: "30\nphút" },
      { phut: 60, label: "1\ngiờ" },
      { phut: 90, label: "1 giờ\n30 phút" },
      { phut: 120, label: "2\ngiờ" },
      { phut: 150, label: "2 giờ\n30 phút" },
      { phut: 180, label: "3\ngiờ" },
      { phut: 210, label: "3 giờ\n30 phút" },
      { phut: 240, label: "4\ngiờ" },
      { phut: 270, label: "4 giờ\n30 phút" },
    ],
    nhan_moc_dac_biet: {
      270: "Nộp bài\nTrang trí màu",
    },
    phut_hien_nop_bai: 270,
    co_giai_lao: false,
    color: "var(--cat-tt)",
  },
  bo_cuc_mau: {
    label: "Bố cục màu",
    thoi_luong_phut: 300,
    moc_timeline: [
      { phut: 0, label: "0\nphút" },
      { phut: 60, label: "1\ngiờ" },
      { phut: 120, label: "2\ngiờ" },
      { phut: 180, label: "3\ngiờ" },
      { phut: 240, label: "4\ngiờ" },
      { phut: 300, label: "5\ngiờ" },
    ],
    nhan_moc_dac_biet: {
      300: "Nộp bài\nBố cục màu",
    },
    phut_hien_nop_bai: 300,
    co_giai_lao: false,
    color: "var(--cat-bc)",
  },
};

export function getMonConfig(mon: MonThiKey): MonThiConfig {
  return MON_THI_CONFIG[mon];
}

export function isMonThiKey(s: string): s is MonThiKey {
  return s === "hinh_hoa" || s === "trang_tri_mau" || s === "bo_cuc_mau";
}
