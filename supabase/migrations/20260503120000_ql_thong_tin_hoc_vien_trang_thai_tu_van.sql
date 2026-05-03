-- Lượt A — ql_thong_tin_hoc_vien.trang_thai_tu_van ('dang_hoc' | 'nghi', default 'dang_hoc')
-- Không chạy UPDATE — existing rows nhận DEFAULT.
--
-- Supabase SQL Editor: CREATE INDEX CONCURRENTLY không chạy trong transaction.
-- Nếu lỗi: chạy khối ALTER + ADD CONSTRAINT trước, rồi chạy riêng CREATE INDEX CONCURRENTLY,
-- hoặc dùng CREATE INDEX không CONCURRENTLY (fallback cuối file).

ALTER TABLE public.ql_thong_tin_hoc_vien
  ADD COLUMN IF NOT EXISTS trang_thai_tu_van text NOT NULL DEFAULT 'dang_hoc';

ALTER TABLE public.ql_thong_tin_hoc_vien
  DROP CONSTRAINT IF EXISTS ql_thong_tin_hoc_vien_trang_thai_tu_van_check;

ALTER TABLE public.ql_thong_tin_hoc_vien
  ADD CONSTRAINT ql_thong_tin_hoc_vien_trang_thai_tu_van_check
  CHECK (trang_thai_tu_van IN ('dang_hoc', 'nghi'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ql_thong_tin_hoc_vien_trang_thai_tu_van
  ON public.ql_thong_tin_hoc_vien (trang_thai_tu_van);

-- Fallback nếu không dùng được CONCURRENTLY:
-- CREATE INDEX IF NOT EXISTS idx_ql_thong_tin_hoc_vien_trang_thai_tu_van
--   ON public.ql_thong_tin_hoc_vien (trang_thai_tu_van);
