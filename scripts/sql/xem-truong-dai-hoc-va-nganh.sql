-- Xem dữ liệu tham chiếu trường ĐH & ngành (đồng bộ với đóng học phí / tra cứu).
-- Chạy từng khối trong Supabase -> SQL Editor.

-- 1) Danh sách trường đại học
select
  id,
  ten_truong_dai_hoc,
  score
from public.dh_truong_dai_hoc
order by ten_truong_dai_hoc;

-- 2) Danh sách ngành đào tạo
select
  id,
  ten_nganh
from public.dh_nganh_dao_tao
order by ten_nganh;

-- 3) Cặp trường <-> ngành hợp lệ (bảng nối)
select
  t.id as truong_id,
  t.ten_truong_dai_hoc,
  n.id as nganh_id,
  n.ten_nganh
from public.dh_truong_nganh j
join public.dh_truong_dai_hoc t on t.id = j.truong_dai_hoc
join public.dh_nganh_dao_tao n on n.id = j.nganh_dao_tao
order by t.ten_truong_dai_hoc, n.ten_nganh;

-- 4) Mỗi trường có bao nhiêu ngành
select
  t.id,
  t.ten_truong_dai_hoc,
  count(j.nganh_dao_tao)::int as so_nganh
from public.dh_truong_dai_hoc t
left join public.dh_truong_nganh j on j.truong_dai_hoc = t.id
group by t.id, t.ten_truong_dai_hoc
order by t.ten_truong_dai_hoc;
