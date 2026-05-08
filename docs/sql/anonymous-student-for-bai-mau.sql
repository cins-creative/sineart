-- Tra cứu học viên ẩn danh (ql_thong_tin_hoc_vien) để gán hv_bai_hoc_vien.ten_hoc_vien cho bài mẫu phòng học.
-- Sau khi có id: đặt biến môi trường ANONYMOUS_STUDENT_ID=<id> trên Vercel (tuỳ chọn).

SELECT id, full_name, email, email_prefix, created_at
FROM ql_thong_tin_hoc_vien
WHERE lower(trim(full_name)) IN ('ẩn danh', 'an danh')
   OR full_name ILIKE '%ẩn danh%'
ORDER BY id;
