-- Run once on Supabase SQL Editor.
-- Payment method for import orders (modal + Thong ke thu chi).

ALTER TABLE hc_nhap_hoa_cu ADD COLUMN IF NOT EXISTS hinh_thuc_chi text;

