-- Enable RLS (an toàn: idempotent)
ALTER TABLE public.tra_cuu_thong_tin ENABLE ROW LEVEL SECURITY;

-- Drop policy cũ nếu có để rerun
DROP POLICY IF EXISTS "tra_cuu_public_read" ON public.tra_cuu_thong_tin;

-- Cho phép anon + authenticated SELECT toàn bộ rows
-- (nội dung public, có thể thắt chặt sau bằng cách filter theo published_at is not null)
CREATE POLICY "tra_cuu_public_read"
  ON public.tra_cuu_thong_tin
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Đảm bảo anon/authenticated có quyền SELECT ở lớp GRANT
GRANT SELECT ON public.tra_cuu_thong_tin TO anon, authenticated;