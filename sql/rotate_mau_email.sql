-- ============================================================
-- ROTATION EMAIL CHO HOC VIEN MAU (anti-scrape)
-- ============================================================
-- Voi cac HV co is_hoc_vien_mau = true, cot `email` tu dong doi moi ngay
-- thanh dang `{base_prefix}{6_digits}@{domain}`.
--   Vd base:   hvmhh01@gmail.com
--       hom nay:    hvmhh01548730@gmail.com
--       ngay mai:   hvmhh01112349@gmail.com
--
-- 6 so la hash deterministic md5(ngay_VN + id + prefix) -> cung ngay cung
-- HV luon ra cung chuoi, doi o thoi diem 00:00 gio VN.
--
-- Email goc luu o cot moi `email_mau_base` (chi co gia tri khi mau = true).
-- `email_prefix` giu nguyen base -> admin van search theo prefix duoc.
--
-- Lich: pg_cron 17:00 UTC = 00:00 Asia/Ho_Chi_Minh.
-- ============================================================


-- ============================================================
-- 1. Cot luu email goc
-- ============================================================
ALTER TABLE ql_thong_tin_hoc_vien
  ADD COLUMN IF NOT EXISTS email_mau_base text;

COMMENT ON COLUMN ql_thong_tin_hoc_vien.email_mau_base IS
  'Email goc cua hoc vien mau truoc khi rotation. NULL neu is_hoc_vien_mau = false.';


-- ============================================================
-- 2. Helper: ngay hom nay theo gio VN (UTC+7)
-- ============================================================
CREATE OR REPLACE FUNCTION sine_vn_today() RETURNS date
LANGUAGE sql
STABLE
AS $FN$
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$FN$;


-- ============================================================
-- 3. Ham tinh email rotated tu (id, base_email, ngay)
--    Hash md5(ngay:id:prefix) -> 32-bit unsigned -> mod 1_000_000 -> pad 6 so
-- ============================================================
CREATE OR REPLACE FUNCTION sine_compute_mau_email(
  p_id          bigint,
  p_base_email  text,
  p_date        date
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $FN$
DECLARE
  v_at     int;
  v_prefix text;
  v_domain text;
  v_seed   text;
  v_hash   bigint;
  v_suffix text;
BEGIN
  IF p_base_email IS NULL OR p_base_email = '' THEN
    RETURN p_base_email;
  END IF;

  v_at := position('@' in p_base_email);
  IF v_at <= 1 THEN
    RETURN p_base_email;
  END IF;

  v_prefix := substring(p_base_email from 1 for v_at - 1);
  v_domain := substring(p_base_email from v_at + 1);

  v_seed := to_char(p_date, 'YYYY-MM-DD') || ':' || p_id::text || ':' || lower(v_prefix);

  v_hash := (('x' || substring(md5(v_seed) from 1 for 8))::bit(32)::bigint)
            & x'FFFFFFFF'::bigint;

  v_suffix := lpad((v_hash % 1000000)::text, 6, '0');
  RETURN v_prefix || v_suffix || '@' || v_domain;
END;
$FN$;


-- ============================================================
-- 4. Trigger: duy tri `email` khi bat/tat co mau hoac admin sua email
--    Bypass bang GUC `sine.bypass_mau_trg = '1'` (dung cho job rotate).
-- ============================================================
CREATE OR REPLACE FUNCTION sine_hv_mau_email_trg() RETURNS trigger
LANGUAGE plpgsql
AS $FN$
DECLARE
  v_today  date := sine_vn_today();
  v_bypass text;
BEGIN
  v_bypass := current_setting('sine.bypass_mau_trg', true);
  IF v_bypass = '1' THEN
    RETURN NEW;
  END IF;

  -- INSERT ---------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_hoc_vien_mau = true
       AND NEW.email IS NOT NULL
       AND position('@' in NEW.email) > 1
    THEN
      IF NEW.email_mau_base IS NULL THEN
        NEW.email_mau_base := NEW.email;
      END IF;
      NEW.email := sine_compute_mau_email(NEW.id, NEW.email_mau_base, v_today);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE ---------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN

    -- A) bat co mau (false/null -> true): luu email hien tai lam base, rotate
    IF NEW.is_hoc_vien_mau = true
       AND (OLD.is_hoc_vien_mau IS DISTINCT FROM true)
    THEN
      IF NEW.email IS NOT NULL AND position('@' in NEW.email) > 1 THEN
        NEW.email_mau_base := NEW.email;
        NEW.email := sine_compute_mau_email(NEW.id, NEW.email, v_today);
      END IF;
      RETURN NEW;
    END IF;

    -- B) tat co mau (true -> false/null): khoi phuc email goc, xoa base
    IF (OLD.is_hoc_vien_mau IS NOT DISTINCT FROM true)
       AND (NEW.is_hoc_vien_mau IS DISTINCT FROM true)
    THEN
      IF OLD.email_mau_base IS NOT NULL THEN
        NEW.email := OLD.email_mau_base;
      END IF;
      NEW.email_mau_base := NULL;
      RETURN NEW;
    END IF;

    -- C) dang la mau, admin sua email -> treat input lam base moi, rotate
    IF NEW.is_hoc_vien_mau = true
       AND OLD.is_hoc_vien_mau = true
       AND NEW.email IS DISTINCT FROM OLD.email
       AND NEW.email IS NOT NULL
       AND position('@' in NEW.email) > 1
    THEN
      IF OLD.email_mau_base IS NOT NULL
         AND NEW.email = sine_compute_mau_email(NEW.id, OLD.email_mau_base, v_today)
      THEN
        RETURN NEW;
      END IF;

      NEW.email_mau_base := NEW.email;
      NEW.email := sine_compute_mau_email(NEW.id, NEW.email, v_today);
      RETURN NEW;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$FN$;

DROP TRIGGER IF EXISTS sine_hv_mau_email_trg ON ql_thong_tin_hoc_vien;
CREATE TRIGGER sine_hv_mau_email_trg
  BEFORE INSERT OR UPDATE ON ql_thong_tin_hoc_vien
  FOR EACH ROW
  EXECUTE FUNCTION sine_hv_mau_email_trg();


-- ============================================================
-- 5. Rotate-all: job chay moi ngay
-- ============================================================
CREATE OR REPLACE FUNCTION sine_rotate_all_mau_emails() RETURNS integer
LANGUAGE plpgsql
AS $FN$
DECLARE
  v_today date := sine_vn_today();
  v_count int  := 0;
  r record;
  v_new text;
BEGIN
  PERFORM set_config('sine.bypass_mau_trg', '1', true);

  FOR r IN
    SELECT id, email, email_mau_base
    FROM ql_thong_tin_hoc_vien
    WHERE is_hoc_vien_mau = true
      AND email_mau_base IS NOT NULL
      AND position('@' in email_mau_base) > 1
  LOOP
    v_new := sine_compute_mau_email(r.id, r.email_mau_base, v_today);
    IF v_new IS DISTINCT FROM r.email THEN
      UPDATE ql_thong_tin_hoc_vien
        SET email = v_new
        WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  PERFORM set_config('sine.bypass_mau_trg', '0', true);
  RETURN v_count;
END;
$FN$;


-- ============================================================
-- 6. Revert-all: khoi phuc email goc (khi disable feature)
-- ============================================================
CREATE OR REPLACE FUNCTION sine_revert_all_mau_emails() RETURNS integer
LANGUAGE plpgsql
AS $FN$
DECLARE
  v_count int := 0;
BEGIN
  PERFORM set_config('sine.bypass_mau_trg', '1', true);
  UPDATE ql_thong_tin_hoc_vien
    SET email = email_mau_base,
        email_mau_base = NULL
    WHERE is_hoc_vien_mau = true
      AND email_mau_base IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('sine.bypass_mau_trg', '0', true);
  RETURN v_count;
END;
$FN$;


-- ============================================================
-- 7. Backfill: luu email hien tai cua cac HV mau lam base + rotate ngay
-- ============================================================
DO $FN$
BEGIN
  PERFORM set_config('sine.bypass_mau_trg', '1', true);

  UPDATE ql_thong_tin_hoc_vien
    SET email_mau_base = email
    WHERE is_hoc_vien_mau = true
      AND email IS NOT NULL
      AND position('@' in email) > 1
      AND email_mau_base IS NULL;

  PERFORM set_config('sine.bypass_mau_trg', '0', true);
END $FN$;

SELECT sine_rotate_all_mau_emails();


-- ============================================================
-- 8. Lich pg_cron: 00:00 gio VN = 17:00 UTC
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $FN$
BEGIN
  PERFORM cron.unschedule('sine-rotate-hv-mau-email');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $FN$;

SELECT cron.schedule(
  'sine-rotate-hv-mau-email',
  '0 17 * * *',
  $CRON$SELECT sine_rotate_all_mau_emails();$CRON$
);


-- ============================================================
-- PHUONG AN B (khong co pg_cron)
-- ============================================================
-- Bo phan "8." o tren, thay bang 1 trong 3 cach:
--
--  1) Goi thu cong trong Supabase Studio -> SQL editor:
--       SELECT sine_rotate_all_mau_emails();
--
--  2) Vercel Cron goi Next.js API:
--       const sb = createClient(URL, SERVICE_ROLE_KEY);
--       await sb.rpc("sine_rotate_all_mau_emails");
--     vercel.json: { "crons": [{ "path": "/api/cron/rotate-mau-email", "schedule": "0 17 * * *" }] }
--
--  3) Cloudflare Worker scheduled trigger (cron = "0 17 * * *"):
--       fetch(SUPABASE_URL + "/rest/v1/rpc/sine_rotate_all_mau_emails",
--             { method: "POST", headers: { apikey, Authorization } });
-- ============================================================


-- ============================================================
-- KIEM TRA / DEBUG
-- ============================================================
-- Xem base + email hom nay cua tat ca HV mau:
--   SELECT id, full_name, email_mau_base, email, email_prefix
--   FROM ql_thong_tin_hoc_vien
--   WHERE is_hoc_vien_mau = true;
--
-- Goi rotate thu cong (tra ve so rows doi):
--   SELECT sine_rotate_all_mau_emails();
--
-- Xem pg_cron job:
--   SELECT * FROM cron.job WHERE jobname = 'sine-rotate-hv-mau-email';
--
-- Xem lich su chay:
--   SELECT * FROM cron.job_run_details
--     WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'sine-rotate-hv-mau-email')
--     ORDER BY start_time DESC LIMIT 10;
--
-- Thu rotation cho 1 email + ngay cu the:
--   SELECT sine_compute_mau_email(123, 'hvmhh01@gmail.com', '2026-04-21');
-- ============================================================