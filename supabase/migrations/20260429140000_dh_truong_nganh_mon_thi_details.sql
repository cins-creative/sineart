-- Môn thi + chi tiết trên bảng junction dh_truong_nganh (không dùng bảng riêng).
-- Nếu đã tạo dh_truong_nganh_thi trước đó: migration này DROP bảng đó.

drop table if exists public.dh_truong_nganh_thi;

alter table public.dh_truong_nganh
  add column if not exists mon_thi text[] not null default '{}'::text[],
  add column if not exists details text;

comment on column public.dh_truong_nganh.mon_thi is 'text[] — các nhãn cố định trong app (DH_MON_THI_HOP_LE): Xét duyệt, Hình họa…, Trang trí màu, Bố cục màu';
comment on column public.dh_truong_nganh.details is 'Ghi chú thêm cho cặp trường–ngành';

grant select, insert, update, delete on table public.dh_truong_nganh to postgres, service_role;
