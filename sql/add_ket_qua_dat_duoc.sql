-- ─────────────────────────────────────────────────────────────────────────────
-- Add column `ket_qua_dat_duoc` (JSONB) to `ql_mon_hoc`
-- Mục đích: mỗi môn có danh sách «Bạn sẽ học được gì» (khối .kd-out-grid) riêng,
--   cấu trúc chuẩn: JSON array of { title, desc }. 4–8 item/môn.
--   Code (src/app/khoa-hoc/_components/KhoaHocDetailView.tsx) dùng cột này
--   trước; nếu NULL/rỗng thì fallback bộ default theo nhóm (Luyện thi/Digital/
--   Kids/Bổ trợ) trong `khoa-hoc-detail-static.ts`.
-- RLS: anon SELECT đã mở sẵn trên `ql_mon_hoc` — không cần grant mới.
-- Không phụ thuộc extension `unaccent` — match bằng ILIKE đối với cả chuỗi có
-- dấu lẫn không dấu.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ql_mon_hoc
  ADD COLUMN IF NOT EXISTS ket_qua_dat_duoc JSONB;

COMMENT ON COLUMN public.ql_mon_hoc.ket_qua_dat_duoc IS
  'Danh sách năng lực đạt được sau khoá. JSONB array [{title, desc?}, ...]. 4–8 item. Hiển thị tại section #outcomes trên /khoa-hoc/[slug].';

-- Check constraint nhẹ: nếu có giá trị phải là array
ALTER TABLE public.ql_mon_hoc
  DROP CONSTRAINT IF EXISTS ql_mon_hoc_ket_qua_dat_duoc_is_array;
ALTER TABLE public.ql_mon_hoc
  ADD CONSTRAINT ql_mon_hoc_ket_qua_dat_duoc_is_array
  CHECK (ket_qua_dat_duoc IS NULL OR jsonb_typeof(ket_qua_dat_duoc) = 'array');

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED theo 4 nhóm — chỉ UPDATE khi cột đang NULL (không đè nội dung custom).
-- Match dựa trên ILIKE với cả chuỗi có dấu và không dấu để an toàn mọi biến
-- thể nhập liệu trên Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

-- Nhóm LUYỆN THI (8 item)
UPDATE public.ql_mon_hoc
SET ket_qua_dat_duoc = '[
  {"title":"Dựng hình chuẩn đề thi","desc":"Đo tỷ lệ, xác định trục, bố cục trang A3 theo format khối V/H."},
  {"title":"Kỹ thuật sáng – tối","desc":"Phân 5 sắc độ, đan nét, chuyển khối mềm đúng bài thi."},
  {"title":"Nguyên lý phối màu","desc":"Nóng – lạnh, tương phản, sắc xám trung gian có hệ thống."},
  {"title":"Bố cục điểm nhấn","desc":"Phân mảng, cân bằng, hướng nhìn dẫn vào nhân vật chính."},
  {"title":"Giải đề thực chiến","desc":"Làm đủ dạng đề đã ra qua các năm của trường bạn đăng ký."},
  {"title":"Quản lý thời gian thi","desc":"Hoàn thiện bài trong 240 phút, chia pha dựng – lên màu – chỉnh."},
  {"title":"Portfolio thi cử","desc":"Mỗi buổi có bài nộp, tối thiểu 20 tác phẩm đạt chuẩn."},
  {"title":"Feedback 1-1 sau buổi","desc":"Chấm trực tiếp từng học viên, sửa đến khi đạt yêu cầu."}
]'::jsonb
WHERE ket_qua_dat_duoc IS NULL
  AND (
       coalesce(loai_khoa_hoc, '') ILIKE '%luyện thi%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%luyen thi%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%ôn thi%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%on thi%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%đại học%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%dai hoc%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%luyện thi%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%luyen thi%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%ôn thi%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%on thi%'
  );

-- Nhóm DIGITAL (6 item)
UPDATE public.ql_mon_hoc
SET ket_qua_dat_duoc = '[
  {"title":"Thành thạo phần mềm","desc":"Photoshop / Procreate / Clip Studio — workflow từ sketch đến final."},
  {"title":"Kỹ thuật line digital","desc":"Pen pressure, line weight, đi nét sạch chuẩn illustrator."},
  {"title":"Rendering ánh sáng","desc":"Volume light, ambient, key – fill – rim light theo concept."},
  {"title":"Phối màu digital","desc":"Palette hài hòa, mood board, color harmony cho từng thể loại."},
  {"title":"Quy trình concept art","desc":"Từ ideation, thumbnail, rendering đến final render — đầy đủ pipeline."},
  {"title":"Portfolio ngành","desc":"6–10 tác phẩm đủ chất lượng apply studio / freelance thực tế."}
]'::jsonb
WHERE ket_qua_dat_duoc IS NULL
  AND (
       coalesce(loai_khoa_hoc, '') ILIKE '%digital%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%procreate%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%concept%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%illustration%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%vẽ số%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%ve so%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%figma%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%ui/ux%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%motion%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%digital%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%procreate%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%concept%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%illustration%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%vẽ số%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%ve so%'
  );

-- Nhóm KIDS (4 item)
UPDATE public.ql_mon_hoc
SET ket_qua_dat_duoc = '[
  {"title":"Phát triển quan sát","desc":"Nhìn vật thật, mô tả bằng hình — rèn tư duy thị giác từ nhỏ."},
  {"title":"Tự tin sáng tạo","desc":"Không sợ sai, dám thử vật liệu mới, hình thành phong cách cá nhân."},
  {"title":"Kỹ năng vận động tinh","desc":"Điều khiển bút, kiểm soát lực tay qua bài tập có hệ thống."},
  {"title":"Hoàn thành tác phẩm","desc":"Tính kiên trì qua dự án nhỏ 3–5 buổi, tự hào về kết quả."}
]'::jsonb
WHERE ket_qua_dat_duoc IS NULL
  AND (
       coalesce(loai_khoa_hoc, '') ILIKE '%kids%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%thiếu nhi%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%thieu nhi%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%khóa hè%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%khoa he%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%trại hè%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%trai he%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%summer%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%kids%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%thiếu nhi%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%thieu nhi%'
  );

-- Nhóm BỔ TRỢ (5 item)
UPDATE public.ql_mon_hoc
SET ket_qua_dat_duoc = '[
  {"title":"Nền tảng cơ bản","desc":"Đường nét, hình khối, phối cảnh — đủ dùng cho mọi hướng nghề."},
  {"title":"Khả năng quan sát","desc":"Đo đạc tỷ lệ, chuyển vật thể 3D sang hình vẽ 2D chuẩn."},
  {"title":"Kiến thức giải phẫu","desc":"Anatomy người và vật — phục vụ concept art, illustration."},
  {"title":"Đa dạng vật liệu","desc":"Chì, than, bút mực, acrylic, màu nước — mỗi chất liệu có bài riêng."},
  {"title":"Thói quen vẽ đều","desc":"Gắn kết đam mê qua portfolio cá nhân, sketchbook hàng ngày."}
]'::jsonb
WHERE ket_qua_dat_duoc IS NULL
  AND (
       coalesce(loai_khoa_hoc, '') ILIKE '%bổ trợ%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%bo tro%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%giải phẫu%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%giai phau%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%portfolio%'
    OR coalesce(loai_khoa_hoc, '') ILIKE '%workshop%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%bổ trợ%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%bo tro%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%giải phẫu%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%giai phau%'
    OR coalesce(ten_mon_hoc, '') ILIKE '%portfolio%'
  );

-- Fallback: bất kỳ môn nào còn NULL sau các bước trên → seed bộ LUYỆN THI
-- (vì trang chủ Sine Art thiên về luyện thi ĐH, an toàn hơn là để trống).
UPDATE public.ql_mon_hoc
SET ket_qua_dat_duoc = '[
  {"title":"Dựng hình chuẩn đề thi","desc":"Đo tỷ lệ, xác định trục, bố cục trang A3 theo format khối V/H."},
  {"title":"Kỹ thuật sáng – tối","desc":"Phân 5 sắc độ, đan nét, chuyển khối mềm đúng bài thi."},
  {"title":"Nguyên lý phối màu","desc":"Nóng – lạnh, tương phản, sắc xám trung gian có hệ thống."},
  {"title":"Bố cục điểm nhấn","desc":"Phân mảng, cân bằng, hướng nhìn dẫn vào nhân vật chính."},
  {"title":"Giải đề thực chiến","desc":"Làm đủ dạng đề đã ra qua các năm của trường bạn đăng ký."},
  {"title":"Feedback 1-1 sau buổi","desc":"Chấm trực tiếp từng học viên, sửa đến khi đạt yêu cầu."}
]'::jsonb
WHERE ket_qua_dat_duoc IS NULL;