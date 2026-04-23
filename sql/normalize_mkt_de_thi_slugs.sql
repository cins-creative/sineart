-- Chuẩn hoá slug mkt_de_thi về dạng ASCII (không dấu, chỉ a-z0-9-)
-- KHÔNG cần extension unaccent. Dùng translate() tay cho bảng chữ cái tiếng Việt.
-- Idempotent: chạy nhiều lần không hỏng (chỉ update row có diff).

-- ─── Helper function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sineart_slug_ascii(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT
    trim(both '-' FROM
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(
              translate(
                coalesce(txt, ''),
                'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
                'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydaaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
              )
            ),
            '[^a-z0-9]+', '-', 'g'   -- mọi ký tự không hợp lệ → dash
          ),
          '-+', '-', 'g'             -- gộp dash liên tiếp
        ),
        '^-|-$', '', 'g'             -- dash đầu/cuối
      )
    );
$func$;

-- ─── Preview (SELECT thử trước khi UPDATE) ──────────────────────────────
-- SELECT id, slug AS old_slug, public.sineart_slug_ascii(slug) AS new_slug
-- FROM public.mkt_de_thi
-- WHERE slug IS NOT NULL
--   AND slug <> public.sineart_slug_ascii(slug)
-- ORDER BY id;

-- ─── Dedupe: nếu ASCII slug trùng nhau → thêm suffix -2, -3, ... theo id ASC
WITH target AS (
  SELECT id, slug,
         public.sineart_slug_ascii(slug) AS ascii_slug
  FROM public.mkt_de_thi
  WHERE slug IS NOT NULL
    AND slug <> public.sineart_slug_ascii(slug)
),
ranked AS (
  SELECT
    id,
    slug,
    ascii_slug,
    ROW_NUMBER() OVER (PARTITION BY ascii_slug ORDER BY id) AS rn
  FROM target
),
planned AS (
  SELECT
    r.id,
    r.slug AS old_slug,
    CASE
      WHEN r.rn = 1 AND NOT EXISTS (
        SELECT 1 FROM public.mkt_de_thi m
        WHERE m.slug = r.ascii_slug AND m.id <> r.id
      ) THEN r.ascii_slug
      ELSE r.ascii_slug || '-' || r.rn::text
    END AS new_slug
  FROM ranked r
)
UPDATE public.mkt_de_thi m
SET slug = p.new_slug,
    updated_at = now()
FROM planned p
WHERE m.id = p.id
  AND m.slug <> p.new_slug;

-- ─── Verify: phải không còn slug có dấu ────────────────────────────────
-- SELECT COUNT(*) AS remaining_unicode_slugs
-- FROM public.mkt_de_thi
-- WHERE slug ~ '[^a-z0-9-]';