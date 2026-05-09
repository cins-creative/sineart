-- Migrate thi_thu_ky_thi.thoi_gian_sua_bai: time -> timestamptz (Asia/Ho_Chi_Minh calendar date of exam start + wall clock).

BEGIN;

ALTER TABLE public.thi_thu_ky_thi
  ALTER COLUMN thoi_gian_sua_bai TYPE timestamptz
  USING (
    CASE
      WHEN thoi_gian_sua_bai IS NULL THEN NULL
      ELSE (
        (
          (thoi_gian_bat_dau AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          + thoi_gian_sua_bai
        )
        AT TIME ZONE 'Asia/Ho_Chi_Minh'
      )
    END
  );

COMMENT ON COLUMN public.thi_thu_ky_thi.thoi_gian_sua_bai IS
  'Wall-clock time (VN) for video review session; distinct from exam start.' ;

COMMIT;