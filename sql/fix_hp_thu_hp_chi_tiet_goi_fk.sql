-- Align FK với bảng gói mà web/API đang dùng (mặc định hp_goi_hoc_phi_new).
-- Lỗi: insert ... hp_thu_hp_chi_tiet violates foreign key hp_thu_hp_chi_tiet_goi_hoc_phi_fkey
--
-- Chạy trong Supabase → SQL Editor. Nếu ADD CONSTRAINT báo lỗi, kiểm tra các dòng
-- hp_thu_hp_chi_tiet cũ: goi_hoc_phi phải tồn tại trong bảng đích.
--
-- Nếu bạn gộp dữ liệu vào một bảng tên hp_goi_hoc_phi (không có _new), đổi REFERENCES
-- cho khớp tên bảng thật trên DB.

ALTER TABLE public.hp_thu_hp_chi_tiet
  DROP CONSTRAINT IF EXISTS hp_thu_hp_chi_tiet_goi_hoc_phi_fkey;

ALTER TABLE public.hp_thu_hp_chi_tiet
  ADD CONSTRAINT hp_thu_hp_chi_tiet_goi_hoc_phi_fkey
  FOREIGN KEY (goi_hoc_phi)
  REFERENCES public.hp_goi_hoc_phi_new (id);
