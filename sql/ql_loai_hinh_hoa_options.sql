-- =============================================================
--  Loai Hinh hoa - multi-select + tu them options
-- =============================================================
--  - Bo CHECK constraint co dinh tren ql_lop_hoc.level_hinh_hoa
--    de cot nay luu duoc CSV (vd "Chuyen tuong, Chuyen chan dung")
--    va cac gia tri moi do tu van vien tu them.
--  - Tao bang options ql_loai_hinh_hoa_options de cac lop khac
--    co the chon lai gia tri moi da them.
--  - Idempotent - co the chay nhieu lan.
-- =============================================================

-- 1) Drop CHECK constraint khoa 3 gia tri
ALTER TABLE public.ql_lop_hoc
  DROP CONSTRAINT IF EXISTS ql_lop_hoc_level_hinh_hoa_check;

-- 2) Bang options
CREATE TABLE IF NOT EXISTS public.ql_loai_hinh_hoa_options (
  id          bigserial PRIMARY KEY,
  ten         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ql_loai_hinh_hoa_options_ten_unique UNIQUE (ten)
);

-- 3) Seed 3 gia tri mac dinh (idempotent)
INSERT INTO public.ql_loai_hinh_hoa_options (ten) VALUES
  ('Chuyên tượng'),
  ('Chuyên chân dung'),
  ('Chuyên toàn thân')
ON CONFLICT (ten) DO NOTHING;

-- 4) RLS - anon/authenticated chi SELECT; INSERT/UPDATE/DELETE qua service role
ALTER TABLE public.ql_loai_hinh_hoa_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ql_loai_hinh_hoa_options_public_read"
  ON public.ql_loai_hinh_hoa_options;

CREATE POLICY "ql_loai_hinh_hoa_options_public_read"
  ON public.ql_loai_hinh_hoa_options
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.ql_loai_hinh_hoa_options TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ql_loai_hinh_hoa_options_id_seq
  TO anon, authenticated;