-- Chạy một lần trên Supabase SQL Editor để admin «Chi nhánh» có đủ trường như UI Framer.
-- Bảng nguồn: hr_ban (FK ql_lop_hoc.chi_nhanh_id → hr_ban.id)

alter table if exists public.hr_ban
  add column if not exists dia_chi text;

alter table if exists public.hr_ban
  add column if not exists sdt text;

alter table if exists public.hr_ban
  add column if not exists is_active boolean not null default true;

alter table if exists public.hr_ban
  add column if not exists created_at timestamptz not null default now();
