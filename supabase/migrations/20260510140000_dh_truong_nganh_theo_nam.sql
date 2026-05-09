-- Chi tieu + diem chuan theo (truong, nganh, nam tuyen sinh).

create table if not exists public.dh_truong_nganh_theo_nam (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  truong_dai_hoc bigint not null
    references public.dh_truong_dai_hoc (id)
    on delete cascade,
  nganh_dao_tao bigint not null
    references public.dh_nganh_dao_tao (id)
    on delete cascade,
  nam_tuyen_sinh integer not null
    check (nam_tuyen_sinh >= 2000 and nam_tuyen_sinh <= 2100),
  chi_tieu integer null
    check (chi_tieu is null or chi_tieu >= 0),
  diem_chuan numeric null
    check (diem_chuan is null or diem_chuan >= 0),
  ghi_chu text null,
  unique (truong_dai_hoc, nganh_dao_tao, nam_tuyen_sinh)
);

create index if not exists dh_truong_nganh_theo_nam_truong_nam_idx
  on public.dh_truong_nganh_theo_nam (truong_dai_hoc, nam_tuyen_sinh);

grant usage on schema public to postgres, service_role;
grant select, insert, update, delete on table public.dh_truong_nganh_theo_nam to postgres, service_role;