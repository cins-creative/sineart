-- Thi thử — Supabase SQL Editor (lỗi 42501 / thiếu cột). Admin API dùng service_role (bypass RLS).

ALTER TABLE public.thi_thu_ky_thi
  ADD COLUMN IF NOT EXISTS video_sua_bai text,
  ADD COLUMN IF NOT EXISTS thoi_gian_sua_bai timestamptz;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.thi_thu_ky_thi TO postgres, service_role;
GRANT SELECT ON TABLE public.thi_thu_ky_thi TO anon, authenticated;

ALTER TABLE public.thi_thu_ky_thi ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = ''public'' AND tablename = ''thi_thu_ky_thi'' AND policyname = ''thi_thu_ky_thi_anon_select_published''
  ) THEN
    CREATE POLICY thi_thu_ky_thi_anon_select_published
      ON public.thi_thu_ky_thi
      FOR SELECT
      TO anon, authenticated
      USING (trang_thai = ''published'');
  END IF;
END $$;
