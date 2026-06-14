-- GRANT quyen cho bang chuyen kho (chay SAU hc-chuyen-kho.sql neu gap "permission denied").
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.hc_chuyen_kho TO service_role;
GRANT ALL ON TABLE public.hc_chuyen_kho_chi_tiet TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hc_chuyen_kho TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hc_chuyen_kho_chi_tiet TO authenticated;

DO $$
DECLARE
  seq_name text;
BEGIN
  FOR seq_name IN
    SELECT pg_get_serial_sequence('public.hc_chuyen_kho', 'id')
    UNION
    SELECT pg_get_serial_sequence('public.hc_chuyen_kho_chi_tiet', 'id')
  LOOP
    IF seq_name IS NOT NULL THEN
      EXECUTE format(
        'GRANT USAGE, SELECT, UPDATE ON SEQUENCE %s TO service_role, authenticated',
        seq_name
      );
    END IF;
  END LOOP;
END $$;
