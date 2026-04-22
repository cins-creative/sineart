-- Fix: grant privileges cho anon / authenticated / service_role tren bang mkt_home_content.
-- RLS policy chi co tac dung sau khi role da co base GRANT tuong ung.
-- Chay file nay NEU ban gap loi "permission denied for table mkt_home_content".

grant usage on schema public to anon, authenticated, service_role;

-- Anon + authenticated chi doc (RLS policy da cho phep select).
grant select on public.mkt_home_content to anon, authenticated;

-- Service role full quyen (bypass RLS tu dong).
grant all on public.mkt_home_content to service_role;

-- Sequence (neu co default id auto-increment — phong truong hop future).
do $$
declare
  seq_name text;
begin
  for seq_name in
    select pg_get_serial_sequence('public.mkt_home_content', column_name)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mkt_home_content'
      and pg_get_serial_sequence('public.mkt_home_content', column_name) is not null
  loop
    execute format('grant usage, select, update on sequence %s to anon, authenticated, service_role', seq_name);
  end loop;
end $$;
