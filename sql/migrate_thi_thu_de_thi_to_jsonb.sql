-- Gộp đề thi vào thi_thu_ky_thi.de_thi (jsonb), bỏ bảng thi_thu_de_thi.
-- Chạy từng bước trong Supabase SQL Editor; sao lưu DB trước.

ALTER TABLE public.thi_thu_ky_thi
  ADD COLUMN IF NOT EXISTS de_thi jsonb NOT NULL DEFAULT ''[]''::jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = ''thi_thu_de_thi'') THEN
    UPDATE public.thi_thu_ky_thi k
    SET de_thi = COALESCE(sub.j, ''[]''::jsonb)
    FROM (
      SELECT
        ky_thi_id,
        jsonb_agg(
          jsonb_build_object(
            ''tieu_de'', tieu_de,
            ''anh_urls'', COALESCE(to_jsonb(anh_urls), ''[]''::jsonb),
            ''thu_tu'', thu_tu
          )
          ORDER BY thu_tu
        ) AS j
      FROM public.thi_thu_de_thi
      GROUP BY ky_thi_id
    ) sub
    WHERE k.id = sub.ky_thi_id::uuid;

    DROP TABLE public.thi_thu_de_thi;
  END IF;
END $$;

COMMENT ON COLUMN public.thi_thu_ky_thi.de_thi IS ''Mảng đề thi: [{ tieu_de, anh_urls[], thu_tu }]'';
