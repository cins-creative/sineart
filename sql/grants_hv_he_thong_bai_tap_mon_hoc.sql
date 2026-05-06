-- Run in Supabase SQL Editor if saves fail with:
--   "permission denied for table hv_he_thong_bai_tap_mon_hoc"
--
-- PostgREST uses DB roles: anon, authenticated, service_role.
-- Tables created manually often lack GRANTs for service_role (writes).

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.hv_he_thong_bai_tap_mon_hoc to postgres, service_role;
grant select on table public.hv_he_thong_bai_tap_mon_hoc to anon, authenticated;

-- Identity / serial column for inserts (ignore error if column is not serial)
do $do$
declare
  seq text;
begin
  select pg_get_serial_sequence('public.hv_he_thong_bai_tap_mon_hoc', 'id') into seq;
  if seq is not null then
    execute format('grant usage, select on sequence %s to service_role', seq);
  end if;
end $do$;
