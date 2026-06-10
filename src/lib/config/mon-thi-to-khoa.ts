/** Mapping nghiệp vụ Sine Art — key theo `edu_mon_thi.ma` (CINS). */
export const MON_TO_KHOA: Record<
  string,
  {
    khoaGoiY: string[];
    loTrinhThang: [number, number];
  }
> = {
  hinh_hoa_dau_tuong: { khoaGoiY: ["Hình họa"], loTrinhThang: [3, 6] },
  hinh_hoa_chan_dung: { khoaGoiY: ["Hình họa"], loTrinhThang: [3, 6] },
  hinh_hoa_toan_than: { khoaGoiY: ["Hình họa"], loTrinhThang: [3, 6] },
  bo_cuc_mau: { khoaGoiY: ["Bố cục màu", "Trang trí màu"], loTrinhThang: [2, 4] },
  trang_tri_mau: { khoaGoiY: ["Trang trí màu"], loTrinhThang: [2, 4] },
  bo_cuc_cham_noi: { khoaGoiY: ["Hình họa"], loTrinhThang: [3, 6] },
  tuong_tron: { khoaGoiY: ["Hình họa"], loTrinhThang: [3, 6] },
};

const DEFAULT_KHOA = "Hình họa · Trang trí màu · Bố cục màu";
const DEFAULT_LO_TRINH = "3–6 tháng";

export function buildKhoaVaLoTrinh(maList: string[]): { khoaNenHoc: string; loTrinh: string } {
  const khoaSet: string[] = [];
  let minLo = Number.POSITIVE_INFINITY;
  let maxLo = Number.NEGATIVE_INFINITY;

  for (const ma of maList) {
    const cfg = MON_TO_KHOA[ma];
    if (!cfg) continue;
    for (const k of cfg.khoaGoiY) {
      if (!khoaSet.includes(k)) khoaSet.push(k);
    }
    minLo = Math.min(minLo, cfg.loTrinhThang[0]);
    maxLo = Math.max(maxLo, cfg.loTrinhThang[1]);
  }

  if (khoaSet.length === 0) {
    return { khoaNenHoc: DEFAULT_KHOA, loTrinh: DEFAULT_LO_TRINH };
  }

  return {
    khoaNenHoc: khoaSet.join(" · "),
    loTrinh: `${minLo}–${maxLo} tháng`,
  };
}
