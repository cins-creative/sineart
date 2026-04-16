-- Nếu bạn đã chạy migration tạo admin_insert_ql_quan_ly_hoc_vien trước khi có dòng NOTIFY trong file cũ,
-- chạy lệnh này (hoặc chạy lại toàn bộ 20260415140000_admin_insert_qlhv_enrollment.sql) để PostgREST nạp lại schema.
NOTIFY pgrst, 'reload schema';
