-- Bang CMS noi dung trang chu Sine Art.
-- Singleton (chi 1 dong, id = 1) + JSONB de schema mem.
-- Admin service role ghi (bypass RLS). Anon SELECT de public site doc.

create table if not exists public.mkt_home_content (
  id smallint primary key default 1,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by bigint references public.hr_nhan_su(id) on delete set null
);

-- Singleton constraint — chi cho phep dung 1 dong id = 1.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mkt_home_content_singleton_id'
  ) then
    alter table public.mkt_home_content
      add constraint mkt_home_content_singleton_id check (id = 1);
  end if;
end $$;

-- Seed dong id = 1 (content rong — client merge voi DEFAULT_HOME_CONTENT).
insert into public.mkt_home_content (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- RLS: anon SELECT; moi ghi do service role.
alter table public.mkt_home_content enable row level security;

drop policy if exists "mkt_home_content anon select" on public.mkt_home_content;
create policy "mkt_home_content anon select"
  on public.mkt_home_content
  for select
  to anon
  using (true);

-- GRANT: Supabase yeu cau role co base privilege ngoai RLS policy.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.mkt_home_content to anon, authenticated;
grant all on public.mkt_home_content to service_role;

-- Tu dong cap nhat updated_at khi update.
create or replace function public.set_mkt_home_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mkt_home_content_set_updated_at on public.mkt_home_content;
create trigger mkt_home_content_set_updated_at
  before update on public.mkt_home_content
  for each row execute function public.set_mkt_home_content_updated_at();
