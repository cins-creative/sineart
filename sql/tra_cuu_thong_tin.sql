-- Schema for "Tra cuu thong tin" module (public.tra_cuu_thong_tin)
-- Run once in Supabase SQL editor. Idempotent.
-- See: /admin/dashboard/quan-ly-tra-cuu and /tra-cuu-thong-tin[/slug] routes.

-- 1) Enum of article types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tra_cuu_type_enum') then
    create type public.tra_cuu_type_enum as enum (
      'phuong-thuc-tuyen-sinh',
      'diem-chuan',
      'cach-tinh-diem',
      'chuong-trinh-hoc',
      'kinh-nghiem-thi',
      'ti-le-choi'
    );
  end if;
end$$;

-- 2) Main table
create table if not exists public.tra_cuu_thong_tin (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  slug            text not null unique,
  title           text not null,
  thumbnail_url   text,
  thumbnail_alt   text,
  nam             integer,
  excerpt         text,
  content         text,
  structured_html text,
  is_featured     boolean not null default false,
  published_at    timestamptz not null default now(),
  truong_ids      bigint[] not null default '{}'::bigint[],
  type            public.tra_cuu_type_enum[] not null default '{}'::public.tra_cuu_type_enum[]
);

-- 3) updated_at trigger
create or replace function public.tra_cuu_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$;

drop trigger if exists trg_tra_cuu_set_updated_at on public.tra_cuu_thong_tin;
create trigger trg_tra_cuu_set_updated_at
before update on public.tra_cuu_thong_tin
for each row execute function public.tra_cuu_set_updated_at();

-- 4) Indexes
create index if not exists idx_tra_cuu_published_at  on public.tra_cuu_thong_tin (published_at desc);
create index if not exists idx_tra_cuu_is_featured   on public.tra_cuu_thong_tin (is_featured) where is_featured = true;
create index if not exists idx_tra_cuu_truong_ids    on public.tra_cuu_thong_tin using gin (truong_ids);
create index if not exists idx_tra_cuu_type          on public.tra_cuu_thong_tin using gin (type);

-- 5) RLS: public read, writes via service role (bypasses RLS by default)
alter table public.tra_cuu_thong_tin enable row level security;
drop policy if exists "tra_cuu public read" on public.tra_cuu_thong_tin;
create policy "tra_cuu public read" on public.tra_cuu_thong_tin for select using (true);

-- Notes:
-- * dh_truong_dai_hoc already exists in schema (id, ten_truong_dai_hoc).
--   tra_cuu_thong_tin.truong_ids is an array of those ids.
-- * If later you want to use truong slugs in URLs, add:
--     alter table public.dh_truong_dai_hoc add column if not exists slug text;
-- 6) Grants (required even with service_role -- PostgreSQL table grants != RLS bypass)
grant all on public.tra_cuu_thong_tin to service_role;
grant all on sequence public.tra_cuu_thong_tin_id_seq to service_role;
grant select on public.tra_cuu_thong_tin to anon;
grant select on public.tra_cuu_thong_tin to authenticated;
