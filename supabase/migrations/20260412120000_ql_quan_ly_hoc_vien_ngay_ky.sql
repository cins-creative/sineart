-- Kỳ học phí trên ghi danh (đồng bộ từ hp_thu_hp_chi_tiet khi đơn chuyển sang Đã thanh toán).
-- Chạy trên Supabase SQL Editor hoặc qua CLI: supabase db push

ALTER TABLE ql_quan_ly_hoc_vien
  ADD COLUMN IF NOT EXISTS ngay_dau_ky date,
  ADD COLUMN IF NOT EXISTS ngay_cuoi_ky date;

COMMENT ON COLUMN ql_quan_ly_hoc_vien.ngay_dau_ky IS
  'Ngày bắt đầu kỳ học phí / gia hạn (ghi khi thanh toán đơn — khớp chi tiết hp_thu_hp_chi_tiet).';

COMMENT ON COLUMN ql_quan_ly_hoc_vien.ngay_cuoi_ky IS
  'Ngày kết thúc kỳ dự kiến (theo gói so_buoi tại thời điểm tạo đơn).';
