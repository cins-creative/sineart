-- ql_thong_tin_hoc_vien: lower(trim(email)) + UNIQUE index (partial)
-- Run in Supabase SQL Editor. Fails if duplicate emails remain after normalization.

BEGIN;

UPDATE public.ql_thong_tin_hoc_vien
SET email = lower(trim(email))
WHERE email IS NOT NULL AND trim(email) <> '';

DO $$
DECLARE
  dup_groups integer;
BEGIN
  SELECT count(*)::integer INTO dup_groups
  FROM (
    SELECT lower(trim(email)) AS e
    FROM public.ql_thong_tin_hoc_vien
    WHERE email IS NOT NULL AND trim(email) <> ''
    GROUP BY 1
    HAVING count(*) > 1
  ) sub;

  IF dup_groups > 0 THEN
    RAISE EXCEPTION
      'Còn % nhóm email trùng sau khi chuẩn hoá. Gộp hoặc xóa trùng rồi chạy lại.',
      dup_groups;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ql_thong_tin_hoc_vien_email_lower_unique
ON public.ql_thong_tin_hoc_vien (lower(trim(email)))
WHERE email IS NOT NULL AND trim(email) <> '';

COMMIT;
