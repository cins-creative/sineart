-- Admin / API dùng service role: trang Gói học phí cần đọc + ghi hp_combo_mon.
-- Nếu gặp: permission denied for table hp_combo_mon — chạy migration này hoặc copy GRANT vào SQL Editor.

DO $combo$
BEGIN
  IF to_regclass('public.hp_combo_mon') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hp_combo_mon TO service_role';
    EXECUTE 'GRANT ALL ON TABLE public.hp_combo_mon TO postgres';
  END IF;
END
$combo$;

NOTIFY pgrst, 'reload schema';
