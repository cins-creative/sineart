-- Run once in Supabase SQL Editor.
-- Prevents duplicate nhap/ban headers from duplicate requests (double stock).

ALTER TABLE hc_nhap_hoa_cu ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS hc_nhap_hoa_cu_idempotency_key_uidx
  ON hc_nhap_hoa_cu (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND btrim(idempotency_key) <> '';

ALTER TABLE hc_don_ban_hoa_cu ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS hc_don_ban_hoa_cu_idempotency_key_uidx
  ON hc_don_ban_hoa_cu (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND btrim(idempotency_key) <> '';
