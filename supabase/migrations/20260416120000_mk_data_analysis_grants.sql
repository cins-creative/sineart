-- Marketing analytics (admin /report-mkt): bảng mk_data_analysis + quyền cho service_role.
-- Lỗi "permission denied for table mk_data_analysis" xảy ra khi bảng tồn tại nhưng chưa GRANT cho role service_role (PostgREST).

CREATE TABLE IF NOT EXISTS public.mk_data_analysis (
  id text PRIMARY KEY,
  ngay_thang_nhap date UNIQUE,
  chi_phi_chay_ads double precision,
  fb_tin_nhan_ads double precision,
  fb_tin_nhan_tu_nhien double precision,
  ti_le_chuyen_doi_tin_nhan double precision,
  ti_le_chuyen_doi_sang_hoc_vien double precision,
  chi_phi_trung_binh_mot_tin_nhan double precision,
  fb_hoc_vien_moi double precision,
  fb_hoc_vien_nghi double precision,
  luot_xem double precision,
  nguoi_xem double precision,
  fb_luot_theo_doi double precision,
  fb_toc_do_phan_hoi_tin_nhan double precision,
  fb_luot_tuong_tac_voi_noi_dung double precision,
  fb_luot_truy_cap double precision,
  fb_so_luot_click_vao_lien_ket_ctr double precision,
  fb_so_luong_noi_dung_dang double precision,
  web_tong_pageviews double precision,
  web_so_nguoi_vao_web double precision,
  web_ti_le_thoat_bounce_rate double precision,
  web_thoi_gian_trung_binh_s double precision,
  group_hv_thanh_vien_hoat_dong double precision,
  group_st_thanh_vien_hoat_dong double precision,
  group_hv_noi_dung_moi double precision,
  group_st_noi_dung_moi double precision,
  group_hv_yeu_cau_tham_gia double precision,
  group_st_yeu_cau_tham_gia double precision,
  be_project_views double precision,
  be_appreciations double precision,
  be_followers double precision
);

ALTER TABLE public.mk_data_analysis ENABLE ROW LEVEL SECURITY;

-- Chỉ API dùng service_role (server Next.js); anon/authenticated không cần policy nếu không đọc client.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mk_data_analysis TO service_role;
GRANT ALL ON TABLE public.mk_data_analysis TO postgres;

COMMENT ON TABLE public.mk_data_analysis IS
  'Dữ liệu marketing theo kỳ (ngày). id thường dạng YYYY_MM_DD; app admin dùng service_role.';

NOTIFY pgrst, 'reload schema';
