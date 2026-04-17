-- Nhãn "gói đặc biệt" (dropdown + giá trị tùy chỉnh) trên admin gói học phí.
ALTER TABLE public.hp_goi_hoc_phi_new
  ADD COLUMN IF NOT EXISTS special text;

COMMENT ON COLUMN public.hp_goi_hoc_phi_new.special IS
  'Gói đặc biệt — chuỗi tùy chọn (gợi ý từ các giá trị đã dùng; nhân viên có thể nhập mới).';
