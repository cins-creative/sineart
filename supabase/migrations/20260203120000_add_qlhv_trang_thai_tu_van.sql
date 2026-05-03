-- ql_thong_tin_hoc_vien.trang_thai_tu_van (Lot A)
ALTER TABLE ql_thong_tin_hoc_vien
  ADD COLUMN IF NOT EXISTS trang_thai_tu_van text NOT NULL DEFAULT 'dang_hoc';

ALTER TABLE ql_thong_tin_hoc_vien
  DROP CONSTRAINT IF EXISTS ql_thong_tin_hoc_vien_trang_thai_tu_van_check;

ALTER TABLE ql_thong_tin_hoc_vien
  ADD CONSTRAINT ql_thong_tin_hoc_vien_trang_thai_tu_van_check
  CHECK (trang_thai_tu_van IN ('dang_hoc', 'nghi'));

CREATE INDEX IF NOT EXISTS idx_ql_thong_tin_hoc_vien_trang_thai_tu_van
  ON ql_thong_tin_hoc_vien (trang_thai_tu_van);