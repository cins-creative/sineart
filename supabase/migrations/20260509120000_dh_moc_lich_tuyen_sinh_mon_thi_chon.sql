-- Admission milestones per university + year (time stored as free text).
-- Also adds ql_hv_truong_nganh.mon_thi_chon for admin filtering by exam subject.

create table if not exists public.dh_moc_lich_tuyen_sinh (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  truong_dai_hoc bigint not null
    references public.dh_truong_dai_hoc (id)
    on delete cascade,
  nam_tuyen_sinh integer not null
    check (nam_tuyen_sinh >= 2000 and nam_tuyen_sinh <= 2100),
  ten_moc text null,
  thoi_gian_mo_ta text not null,
  ghi_chu text null,
  nguon_thong_bao text null,
  thu_tu integer not null default 0,
  cap_nhat_luc timestamptz not null default now()
);

comment on table public.dh_moc_lich_tuyen_sinh is
  'Moc lich tuyen sinh: truong DH x nam; thoi gian dang text.';

create index if not exists dh_moc_lich_tuyen_sinh_truong_nam_idx
  on public.dh_moc_lich_tuyen_sinh (truong_dai_hoc, nam_tuyen_sinh);

alter table public.ql_hv_truong_nganh
  add column if not exists mon_thi_chon text null;

comment on column public.ql_hv_truong_nganh.mon_thi_chon is
  'Mon thi cu the HV chon; map voi dh_truong_nganh.mon_thi.';