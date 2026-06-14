-- Gắn chi nhánh cho phiếu nhập / bán họa cụ.
-- Chạy sau hc-danh-sach-chi-nhanh-id.sql (cần bảng ql_chi_nhanh).

ALTER TABLE hc_nhap_hoa_cu
  ADD COLUMN IF NOT EXISTS chi_nhanh_id bigint REFERENCES ql_chi_nhanh(id);

ALTER TABLE hc_don_ban_hoa_cu
  ADD COLUMN IF NOT EXISTS chi_nhanh_id bigint REFERENCES ql_chi_nhanh(id);

CREATE INDEX IF NOT EXISTS idx_hc_nhap_hoa_cu_chi_nhanh_id ON hc_nhap_hoa_cu(chi_nhanh_id);
CREATE INDEX IF NOT EXISTS idx_hc_don_ban_hoa_cu_chi_nhanh_id ON hc_don_ban_hoa_cu(chi_nhanh_id);

UPDATE hc_nhap_hoa_cu
SET chi_nhanh_id = (
  SELECT id FROM ql_chi_nhanh
  WHERE ten ILIKE '%Tân Phú%' OR ten ILIKE '%Tan Phu%'
  ORDER BY id ASC LIMIT 1
)
WHERE chi_nhanh_id IS NULL;

UPDATE hc_don_ban_hoa_cu
SET chi_nhanh_id = (
  SELECT id FROM ql_chi_nhanh
  WHERE ten ILIKE '%Tân Phú%' OR ten ILIKE '%Tan Phu%'
  ORDER BY id ASC LIMIT 1
)
WHERE chi_nhanh_id IS NULL;
