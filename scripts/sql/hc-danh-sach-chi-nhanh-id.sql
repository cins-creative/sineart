-- Phân tách danh mục họa cụ theo chi nhánh (`ql_chi_nhanh`).
-- Chạy trong Supabase SQL Editor trước khi dùng lọc chi nhánh trên admin.

ALTER TABLE hc_danh_sach_san_pham
  ADD COLUMN IF NOT EXISTS chi_nhanh_id bigint REFERENCES ql_chi_nhanh(id);

CREATE INDEX IF NOT EXISTS idx_hc_danh_sach_san_pham_chi_nhanh_id
  ON hc_danh_sach_san_pham(chi_nhanh_id);

-- Gán toàn bộ mặt hàng hiện có vào chi nhánh Tân Phú (mặc định).
UPDATE hc_danh_sach_san_pham
SET chi_nhanh_id = (
  SELECT id
  FROM ql_chi_nhanh
  WHERE ten ILIKE '%Tân Phú%' OR ten ILIKE '%Tan Phu%'
  ORDER BY id ASC
  LIMIT 1
)
WHERE chi_nhanh_id IS NULL;
