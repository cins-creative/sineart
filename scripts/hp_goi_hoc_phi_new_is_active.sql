-- Chạy trên Supabase SQL Editor (bảng hp_goi_hoc_phi_new).

ALTER TABLE public.hp_goi_hoc_phi_new
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.hp_goi_hoc_phi_new.is_active IS
  'true = hiển thị khi đóng học phí; false = ẩn khỏi picker đóng HP.';

CREATE INDEX IF NOT EXISTS hp_goi_hoc_phi_new_is_active_idx
  ON public.hp_goi_hoc_phi_new (is_active)
  WHERE is_active = true;
