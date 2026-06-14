-- Đơn bán họa cụ: mã CK (SC######) + trạng thái thanh toán (SePay / VietQR)
-- Chạy trong Supabase SQL Editor trước khi dùng luồng QR tự xác thực.

ALTER TABLE public.hc_don_ban_hoa_cu
  ADD COLUMN IF NOT EXISTS ma_don text,
  ADD COLUMN IF NOT EXISTS ma_don_so text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Đã thanh toán',
  ADD COLUMN IF NOT EXISTS ngay_thanh_toan date;

COMMENT ON COLUMN public.hc_don_ban_hoa_cu.ma_don_so IS 'Mã ngắn nội dung CK, vd SC000123 — webhook SePay regex SC\d{6}';
COMMENT ON COLUMN public.hc_don_ban_hoa_cu.status IS 'Chờ thanh toán | Đã thanh toán';

UPDATE public.hc_don_ban_hoa_cu
SET status = COALESCE(NULLIF(trim(status), ''), 'Đã thanh toán')
WHERE status IS NULL OR trim(status) = '';

CREATE UNIQUE INDEX IF NOT EXISTS hc_don_ban_hoa_cu_ma_don_so_key
  ON public.hc_don_ban_hoa_cu (ma_don_so)
  WHERE ma_don_so IS NOT NULL AND trim(ma_don_so) <> '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_don_ban_hoa_cu TO anon, authenticated, service_role;
