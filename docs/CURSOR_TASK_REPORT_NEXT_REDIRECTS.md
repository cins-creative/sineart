# Cursor Task Report — `next.config` SEO redirects

Sau khi hoàn thành task, điền đầy đủ các mục bên dưới rồi gửi lại file này.

---

## Task đã thực hiện

Thêm `redirects()` SEO (301/302) theo [`next-config-redirects-brief.md`](file:///c:/Users/DELL/Downloads/next-config-redirects-brief.md): gallery con → `/gallery`, thi-thu slug môn → `/thi-thu`, `/hr/*` và `/hiring/*` → `/` (302). Đồng thời **gỡ redirect cũ** `/tinh-diem` → `/tra-cuu-thong-tin` để trang công cụ [tính điểm](/tinh-diem) hoạt động.

---

## Files đã tạo mới

| File | Mô tả |
|------|-------|
| `docs/CURSOR_TASK_REPORT_NEXT_REDIRECTS.md` | Báo cáo task (template Cursor). |

---

## Files đã chỉnh sửa

| File | Thay đổi |
|------|----------|
| [`next.config.ts`](../next.config.ts) | Mở rộng `redirects()`: +9 rule mới; giữ `hoc-thu` → Facebook; **xóa** rule `/tinh-diem` → tra cứu (xung đột trang mới). |

---

## Files đã xóa

Không có

---

## Các quyết định kỹ thuật đã đưa ra

1. **Loại bỏ redirect `/tinh-diem` → `/tra-cuu-thong-tin`**  
   Brief “không xóa config đang có” nhưng rule này trái với trang `/tinh-diem` đã build; giữ lại sẽ 301 mọi request tới tra cứu. Ưu tiên chức năng trang mới + brief `/tinh-diem` không cần redirect ngoài.

2. **Thứ tự rule**  
   Rule cụ thể (`/gallery/...`, `/thi-thu/...`) đặt trước; `/hr/:path*` và `/hiring/:path*` đặt cuối.

---

## TODO / Chưa hoàn thành

- Khi có route `/gallery/[mon]` hoặc `/hiring/[slug]` thật, nên thay redirect tạm bằng đích đúng hoặc gỡ rule.

---

## Lỗi hoặc vấn đề phát sinh

Không có

---

## Cần review / xác nhận

1. **Redirect `/tinh-diem` cũ đã gỡ** — nếu production vẫn cần chuyển traffic cũ sang tra cứu, thảo luận lại (ví dụ chỉ redirect một path khác).
2. **`/hr/*` và `/hiring/*` → `/` (302)** — đúng brief; xác nhận không muốn trang “sắp có” hay thông báo 404 riêng.
3. Chạy **`curl -I http://localhost:3000/gallery/hinh-hoa`** sau khi `npm run dev` — expect `308` hoặc `301` + `location: /gallery` (Next có thể dùng 308 cho permanent).
