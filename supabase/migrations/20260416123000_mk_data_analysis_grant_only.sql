-- Chỉ cấp quyền khi bảng public.mk_data_analysis đã tồn tại (tránh lỗi nếu migration CREATE chưa chạy trên môi trường đó).
-- Chạy thêm file này nếu bạn vẫn gặp: permission denied for table mk_data_analysis

DO $mk$
BEGIN
  IF to_regclass('public.mk_data_analysis') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mk_data_analysis TO service_role';
    EXECUTE 'GRANT ALL ON TABLE public.mk_data_analysis TO postgres';
  END IF;
END
$mk$;

NOTIFY pgrst, 'reload schema';
