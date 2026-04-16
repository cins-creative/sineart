-- Cấp quyền cho service_role đọc/ghi bảng marketing media (PostgREST).
-- Chạy nếu gặp: permission denied for table mkt_quan_ly_media (kể cả khi dùng service role).

DO $m$
BEGIN
  IF to_regclass('public.mkt_quan_ly_media') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mkt_quan_ly_media TO service_role';
    EXECUTE 'GRANT ALL ON TABLE public.mkt_quan_ly_media TO postgres';
  END IF;
END
$m$;

NOTIFY pgrst, 'reload schema';
