-- hv_diem_danh: last_seen_at for classroom presence heartbeat
ALTER TABLE public.hv_diem_danh
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

COMMENT ON COLUMN public.hv_diem_danh.last_seen_at IS 'HV last presence ping (Phong hoc)';

UPDATE public.hv_diem_danh
SET last_seen_at = first_join_at
WHERE last_seen_at IS NULL AND first_join_at IS NOT NULL;
