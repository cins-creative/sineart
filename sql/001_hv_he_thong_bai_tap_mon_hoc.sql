-- Migration: many-to-many hv_he_thong_bai_tap <-> ql_mon_hoc via junction table.
-- Keeps mon_hoc as single bigint (FK); trigger sets MIN(mon_hoc_id) from junction.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hv_he_thong_bai_tap_mon_hoc (
  bai_tap_id bigint NOT NULL
    REFERENCES public.hv_he_thong_bai_tap (id) ON DELETE CASCADE,
  mon_hoc_id bigint NOT NULL
    REFERENCES public.ql_mon_hoc (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bai_tap_id, mon_hoc_id)
);

CREATE INDEX IF NOT EXISTS idx_htbt_mon_hoc_mon
  ON public.hv_he_thong_bai_tap_mon_hoc (mon_hoc_id);

CREATE INDEX IF NOT EXISTS idx_htbt_mon_hoc_bai
  ON public.hv_he_thong_bai_tap_mon_hoc (bai_tap_id);

INSERT INTO public.hv_he_thong_bai_tap_mon_hoc (bai_tap_id, mon_hoc_id)
SELECT bt.id, bt.mon_hoc
FROM public.hv_he_thong_bai_tap AS bt
WHERE bt.mon_hoc IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.hv_he_thong_bai_tap_mon_hoc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hv_he_thong_bai_tap_mon_hoc_select_public"
  ON public.hv_he_thong_bai_tap_mon_hoc;

CREATE POLICY "hv_he_thong_bai_tap_mon_hoc_select_public"
  ON public.hv_he_thong_bai_tap_mon_hoc
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.sync_htbt_primary_mon_hoc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target bigint;
  v_min bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.bai_tap_id;
  ELSE
    target := NEW.bai_tap_id;
  END IF;

  SELECT MIN(j.mon_hoc_id) INTO v_min
  FROM public.hv_he_thong_bai_tap_mon_hoc AS j
  WHERE j.bai_tap_id = target;

  UPDATE public.hv_he_thong_bai_tap AS bt
  SET mon_hoc = v_min
  WHERE bt.id = target;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_htbt_mon_after_junction ON public.hv_he_thong_bai_tap_mon_hoc;

CREATE TRIGGER trg_sync_htbt_mon_after_junction
  AFTER INSERT OR UPDATE OR DELETE ON public.hv_he_thong_bai_tap_mon_hoc
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_htbt_primary_mon_hoc();

UPDATE public.hv_he_thong_bai_tap AS bt
SET mon_hoc = sub.min_mon
FROM (
  SELECT j.bai_tap_id, MIN(j.mon_hoc_id) AS min_mon
  FROM public.hv_he_thong_bai_tap_mon_hoc AS j
  GROUP BY j.bai_tap_id
) AS sub
WHERE bt.id = sub.bai_tap_id;

COMMIT;