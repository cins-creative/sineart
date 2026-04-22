-- ============================================================
-- MIGRATION V2: bo email_mau_base, dung email_prefix lam base
-- ============================================================
-- Chay SAU khi da chay rotate_mau_email.sql (V1).
-- - email_prefix (text) giu phan truoc @, vd: "hvmhh01"
-- - Base email reconstruct = email_prefix || "@gmail.com"
-- - Cot email = rotated hang ngay: email_prefix || {6digits} || "@gmail.com"
-- ============================================================


-- 1. Fill email_prefix cho HV mau bi thieu (tu email_mau_base neu con, hoac tu email)
UPDATE ql_thong_tin_hoc_vien
SET email_prefix = split_part(COALESCE(email_mau_base, email), '@', 1)
WHERE is_hoc_vien_mau = true
  AND (email_prefix IS NULL OR email_prefix = '')
  AND COALESCE(email_mau_base, email) IS NOT NULL
  AND position('@' in COALESCE(email_mau_base, email)) > 1;


-- 2. Drop trigger va function cu tham chieu email_mau_base
DROP TRIGGER IF EXISTS sine_hv_mau_email_trg ON ql_thong_tin_hoc_vien;
DROP FUNCTION IF EXISTS sine_hv_mau_email_trg();
DROP FUNCTION IF EXISTS sine_rotate_all_mau_emails();
DROP FUNCTION IF EXISTS sine_revert_all_mau_emails();
-- Giu: sine_vn_today(), sine_compute_mau_email() vi khong tham chieu email_mau_base


-- 3. Drop cot email_mau_base
ALTER TABLE ql_thong_tin_hoc_vien
  DROP COLUMN IF EXISTS email_mau_base;


-- 4. Rotate-all: dung email_prefix + "@gmail.com" lam base
CREATE OR REPLACE FUNCTION sine_rotate_all_mau_emails() RETURNS integer
LANGUAGE plpgsql
AS $FN$
DECLARE
  v_today date := sine_vn_today();
  v_count int  := 0;
  r record;
  v_base text;
  v_new  text;
BEGIN
  PERFORM set_config('sine.bypass_mau_trg', '1', true);

  FOR r IN
    SELECT id, email, email_prefix
    FROM ql_thong_tin_hoc_vien
    WHERE is_hoc_vien_mau = true
      AND email_prefix IS NOT NULL
      AND email_prefix <> ''
  LOOP
    v_base := r.email_prefix || '@gmail.com';
    v_new  := sine_compute_mau_email(r.id, v_base, v_today);
    IF v_new IS DISTINCT FROM r.email THEN
      UPDATE ql_thong_tin_hoc_vien SET email = v_new WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  PERFORM set_config('sine.bypass_mau_trg', '0', true);
  RETURN v_count;
END;
$FN$;


-- 5. Revert-all: khoi phuc email = email_prefix + "@gmail.com"
CREATE OR REPLACE FUNCTION sine_revert_all_mau_emails() RETURNS integer
LANGUAGE plpgsql
AS $FN$
DECLARE
  v_count int := 0;
BEGIN
  PERFORM set_config('sine.bypass_mau_trg', '1', true);
  UPDATE ql_thong_tin_hoc_vien
    SET email = email_prefix || '@gmail.com'
    WHERE is_hoc_vien_mau = true
      AND email_prefix IS NOT NULL
      AND email_prefix <> '';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('sine.bypass_mau_trg', '0', true);
  RETURN v_count;
END;
$FN$;


-- 6. Trigger: rotate/restore email khi toggle mau hoac sua email/email_prefix
CREATE OR REPLACE FUNCTION sine_hv_mau_email_trg() RETURNS trigger
LANGUAGE plpgsql
AS $FN$
DECLARE
  v_today  date := sine_vn_today();
  v_bypass text;
  v_base   text;
  v_prefix text;
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
      IF NEW.email_prefix IS NULL OR NEW.email_prefix = '' THEN
        NEW.email_prefix := split_part(NEW.email, '@', 1);
      END IF;
      v_base := NEW.email_prefix || '@gmail.com';
      NEW.email := sine_compute_mau_email(NEW.id, v_base, v_today);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE ---------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN

    -- A) Bat co mau (false/null -> true): luu prefix, rotate
    IF NEW.is_hoc_vien_mau = true
       AND (OLD.is_hoc_vien_mau IS DISTINCT FROM true)
    THEN
      IF NEW.email IS NOT NULL AND position('@' in NEW.email) > 1 THEN
        IF NEW.email_prefix IS NULL OR NEW.email_prefix = '' THEN
          NEW.email_prefix := split_part(NEW.email, '@', 1);
        END IF;
        v_base := NEW.email_prefix || '@gmail.com';
        NEW.email := sine_compute_mau_email(NEW.id, v_base, v_today);
      END IF;
      RETURN NEW;
    END IF;

    -- B) Tat co mau (true -> false/null): khoi phuc email theo prefix
    IF (OLD.is_hoc_vien_mau IS NOT DISTINCT FROM true)
       AND (NEW.is_hoc_vien_mau IS DISTINCT FROM true)
    THEN
      IF OLD.email_prefix IS NOT NULL AND OLD.email_prefix <> '' THEN
        NEW.email := OLD.email_prefix || '@gmail.com';
      END IF;
      RETURN NEW;
    END IF;

    -- C) Dang la mau, admin sua email_prefix -> rotate lai theo prefix moi
    IF NEW.is_hoc_vien_mau = true
       AND OLD.is_hoc_vien_mau = true
       AND NEW.email_prefix IS DISTINCT FROM OLD.email_prefix
       AND NEW.email_prefix IS NOT NULL
       AND NEW.email_prefix <> ''
    THEN
      v_base := NEW.email_prefix || '@gmail.com';
      NEW.email := sine_compute_mau_email(NEW.id, v_base, v_today);
      RETURN NEW;
    END IF;

    -- D) Dang la mau, admin sua email truc tiep -> lay prefix moi lam base
    --    Neu input trung rotation hien tai -> no-op (admin save nguyen form)
    IF NEW.is_hoc_vien_mau = true
       AND OLD.is_hoc_vien_mau = true
       AND NEW.email IS DISTINCT FROM OLD.email
       AND NEW.email IS NOT NULL
       AND position('@' in NEW.email) > 1
    THEN
      IF OLD.email_prefix IS NOT NULL
         AND OLD.email_prefix <> ''
         AND NEW.email = sine_compute_mau_email(NEW.id, OLD.email_prefix || '@gmail.com', v_today)
      THEN
        RETURN NEW;
      END IF;

      v_prefix := split_part(NEW.email, '@', 1);
      NEW.email_prefix := v_prefix;
      NEW.email := sine_compute_mau_email(NEW.id, v_prefix || '@gmail.com', v_today);
      RETURN NEW;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$FN$;

CREATE TRIGGER sine_hv_mau_email_trg
  BEFORE INSERT OR UPDATE ON ql_thong_tin_hoc_vien
  FOR EACH ROW
  EXECUTE FUNCTION sine_hv_mau_email_trg();


-- 7. Rotate ngay sau migration (vi cot email hien tai co the da lech)
SELECT sine_rotate_all_mau_emails();


-- ============================================================
-- KIEM TRA
-- ============================================================
-- SELECT id, full_name, email_prefix, email, is_hoc_vien_mau
-- FROM ql_thong_tin_hoc_vien WHERE is_hoc_vien_mau = true;
--
-- Ky vong: email_prefix = "hvmhh01", email = "hvmhh01{6digits}@gmail.com"
-- ============================================================