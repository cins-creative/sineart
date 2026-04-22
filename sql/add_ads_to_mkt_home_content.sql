-- Them 2 cot cho ad banner vao bang singleton mkt_home_content.
--   ads           : noi dung HTML (admin dan truc tiep vao)
--   visible_where : dieu kien hien thi — 'home' | 'class' | 'both'

alter table public.mkt_home_content
  add column if not exists ads text not null default '';

alter table public.mkt_home_content
  add column if not exists visible_where text not null default 'home';

-- Check constraint cho visible_where.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mkt_home_content_visible_where_check'
  ) then
    alter table public.mkt_home_content
      add constraint mkt_home_content_visible_where_check
      check (visible_where in ('home', 'class', 'both'));
  end if;
end $$;

-- Dam bao anon / authenticated / service_role co quyen truy cap sau khi alter.
grant select on public.mkt_home_content to anon, authenticated;
grant all on public.mkt_home_content to service_role;
