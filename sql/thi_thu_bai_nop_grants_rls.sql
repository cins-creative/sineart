-- thi_thu_bai_nop — grant / RLS (tham chiếu khi insert báo lỗi quyền trên Supabase)
-- Route /api/thi-thu/submit dùng SUPABASE_SERVICE_ROLE_KEY → service_role bypass RLS.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.thi_thu_bai_nop TO postgres;
GRANT ALL ON TABLE public.thi_thu_bai_nop TO service_role;
-- CHỈ nếu cần tắt RLS (rủi ro): ALTER TABLE public.thi_thu_bai_nop DISABLE ROW LEVEL SECURITY;
