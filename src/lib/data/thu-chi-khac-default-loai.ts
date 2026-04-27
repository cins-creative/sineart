/**
 * Danh mục mặc định Thu chi khác — thứ tự hiển thị cố định (đồng bộ brief Sine Art).
 * Khớp `giai_nghia` trong `tc_loai_thu_chi`; server sẽ insert các dòng chưa tồn tại.
 */
export const TC_LOAI_THU_CHI_KHAC_DEFAULT_LABELS = [
  "Lương giảng viên",
  "Lương vận hành",
  "Chi phí trích trước",
  "Chi phí quà, sinh nhật,..",
  "Chi phí dụng cụ dùng trong đào tạo",
  "Chi phí MKT, Web, phần mềm",
  "Chi phí video, mẫu vẽ, ...dùng cho đào tạo",
  "Chi phí khấu hao TSCĐ, CCDC",
  "Chi phí điện, nước, internet",
  "Chi phí mặt bằng",
  "Chi phí ngân hàng",
  "Chi phí họa cụ dùng cho lớp Kids",
  "Chi phí nhận hàng mua họa cụ",
  "Chi phí bằng tiền khác",
] as const;

export function normalizeLoaiThuChiLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
