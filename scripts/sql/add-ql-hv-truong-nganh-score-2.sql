-- Điểm môn thi thứ 2 (theo thứ tự phần tử thứ 2 trong dh_truong_nganh.mon_thi).
alter table public.ql_hv_truong_nganh add column if not exists score_2 numeric;
