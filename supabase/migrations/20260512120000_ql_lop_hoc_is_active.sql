-- Lớp còn mở khai giảng / nhận đăng ký công khai. false = tạm dừng (copy UI: «Lớp hiện tạm dừng hoạt động»).
alter table public.ql_lop_hoc
  add column if not exists is_active boolean not null default true;

comment on column public.ql_lop_hoc.is_active is
  'true = lớp đang hoạt động bình thường; false = tạm dừng (hiển thị cảnh báo trên site & admin).';
