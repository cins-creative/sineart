-- Ghi danh từ admin: INSERT chỉ (hoc_vien_id, lop_hoc). Môn học suy ra từ ql_lop_hoc.mon_hoc — không dùng cột mon_hoc_id.
-- Một số DB còn trigger cũ tham chiếu mon_hoc_id (không tồn tại) → INSERT qua PostgREST lỗi.
-- Supabase không cho set session_replication_role → tắt trigger USER trên bảng trong lúc INSERT rồi bật lại.

CREATE OR REPLACE FUNCTION public.admin_insert_ql_quan_ly_hoc_vien(
  p_hoc_vien_id bigint,
  p_lop_hoc bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
BEGIN
  IF p_hoc_vien_id IS NULL OR p_hoc_vien_id <= 0 OR p_lop_hoc IS NULL OR p_lop_hoc <= 0 THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;

  ALTER TABLE public.ql_quan_ly_hoc_vien DISABLE TRIGGER USER;

  INSERT INTO public.ql_quan_ly_hoc_vien (hoc_vien_id, lop_hoc)
  VALUES (p_hoc_vien_id, p_lop_hoc)
  RETURNING id INTO new_id;

  ALTER TABLE public.ql_quan_ly_hoc_vien ENABLE TRIGGER USER;

  RETURN new_id;
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      ALTER TABLE public.ql_quan_ly_hoc_vien ENABLE TRIGGER USER;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_insert_ql_quan_ly_hoc_vien(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_insert_ql_quan_ly_hoc_vien(bigint, bigint) TO service_role;

COMMENT ON FUNCTION public.admin_insert_ql_quan_ly_hoc_vien(bigint, bigint) IS
  'Thêm ql_quan_ly_hoc_vien (hoc_vien_id, lop_hoc). Tắt trigger USER tạm thời; sửa trigger trên DB là giải pháp lâu dài.';

NOTIFY pgrst, 'reload schema';

-- Chẩn đoán trigger (chạy riêng trong SQL Editor nếu cần):
-- SELECT tgname, pg_get_triggerdef(t.oid)
-- FROM pg_trigger t
-- WHERE t.tgrelid = 'public.ql_quan_ly_hoc_vien'::regclass AND NOT t.tgisinternal;
