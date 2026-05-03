-- Loại Hình họa (single select)
alter table ql_lop_hoc
  add column if not exists level_hinh_hoa text;

alter table ql_lop_hoc drop constraint if exists ql_lop_hoc_level_hinh_hoa_check;

alter table ql_lop_hoc
  add constraint ql_lop_hoc_level_hinh_hoa_check
  check (
    level_hinh_hoa is null
    or level_hinh_hoa in ('Chuyên tượng', 'Chuyên chân dung', 'Chuyên toàn thân')
  );
