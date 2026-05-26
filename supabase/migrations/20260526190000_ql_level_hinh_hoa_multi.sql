-- Cho phep `ql_lop_hoc.level_hinh_hoa` nhan nhieu gia tri (CSV) + them bang master de
-- tu van vien tu bo sung nhan moi ma khong can migration tay.
--
-- 1. Bo CHECK constraint cu (chi cho 3 gia tri co dinh).
-- 2. Tao bang `ql_level_hinh_hoa` luu danh sach nhan dung cho dropdown.
-- 3. Seed 3 gia tri mac dinh de tuong thich du lieu cu.

alter table public.ql_lop_hoc
  drop constraint if exists ql_lop_hoc_level_hinh_hoa_check;

comment on column public.ql_lop_hoc.level_hinh_hoa is
  'Danh sach Loai Hinh hoa cua lop - CSV (vd "Chuyen tuong,Chuyen chan dung"). Tach bang dau phay. Moi gia tri nen ton tai trong bang ql_level_hinh_hoa.';

create table if not exists public.ql_level_hinh_hoa (
  id bigserial primary key,
  ten text not null,
  thu_tu integer not null default 999,
  created_at timestamptz not null default now()
);

create unique index if not exists ql_level_hinh_hoa_ten_unique
  on public.ql_level_hinh_hoa (ten);

comment on table public.ql_level_hinh_hoa is
  'Danh sach preset Loai Hinh hoa hien thi trong dropdown admin. Tu van vien them moi qua UI.';

insert into public.ql_level_hinh_hoa (ten, thu_tu)
values
  (N''Chuyên tượng'', 10),
  (N''Chuyên chân dung'', 20),
  (N''Chuyên toàn thân'', 30)
on conflict (ten) do nothing;

alter table public.ql_level_hinh_hoa enable row level security;

drop policy if exists "anon read ql_level_hinh_hoa" on public.ql_level_hinh_hoa;
create policy "anon read ql_level_hinh_hoa"
  on public.ql_level_hinh_hoa
  for select
  to anon, authenticated
  using (true);

grant select on public.ql_level_hinh_hoa to anon, authenticated;
grant all on public.ql_level_hinh_hoa to service_role;
grant usage, select on sequence public.ql_level_hinh_hoa_id_seq to service_role;

notify pgrst, ''reload schema'';