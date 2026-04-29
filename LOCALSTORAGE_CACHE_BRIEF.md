# Brief: cache client (localStorage) — trang cần sửa

> Mục tiêu: **hiển thị nhanh từ cache** (~30 bản ghi tóm tắt mỗi vùng), **fetch dữ liệu mới** ở background, cập nhật UI + ghi lại cache.  
> Tài liệu này chỉ **liệt kê trang public** cần xem xét; **không** bao gồm admin/HR trừ khi có yêu cầu riêng.

Xem thêm ngữ cảnh site: `SITE_STRUCTURE.md`, `HOMEPAGE_BRIEF.md`.

---

## Nguyên tắc khi triển khai

| Hạng mục | Gợi ý |
|----------|--------|
| Key `localStorage` | Prefix rõ (vd: `sineart.cache.*`), **theo route hoặc theo section** để không đè lẫn nhau. |
| Payload | Chỉ **metadata** (id, title, slug, thumbnail URL, date…) — **không** base64 ảnh / HTML dài. |
| Giới hạn | ~30 item / key hoặc ngân sách tổng ~vài trăm KB; tránh đầy quota ~5–10 MB/origin. |
| Trang chi tiết `[slug]` | Ưu tiên cache **danh sách** trước; chi tiết có thể cache **bản xem gần nhất** tùy ROI (tuỳ chọn). |
| SEO | Server Components + `revalidate` vẫn là nguồn chuẩn; cache client bổ trợ **lượt quay lại**, không thay thế tối ưu server. |

---

## Ưu tiên (P0 → P2)

- **P0** — Trang tải nhiều block / nhiều user thấy sớm: trang chủ, danh sách nội dung chính.  
- **P1** — Danh sách dài, quay lại nhiều: blog, ebook, tra cứu, đề thi, gallery.  
- **P2** — Ít item hoặc ít traffic hơn: thi thử, kiến thức nền tảng (hub), phòng học (nếu fetch nặng).

---

## Bảng trang cần rà soát / sửa

### P0 — Trang chủ

| Route | File trong repo | Gợi ý cache (section) |
|-------|-----------------|-------------------------|
| `/` | `src/app/page.tsx` | Theo block trong `HOMEPAGE_BRIEF`: môn học / bài học viên / nhân sự / đánh giá — **mỗi block một key** hoặc một object `home:{...}` có version. |

### P0 — Khóa học

| Route | File | Gợi ý |
|-------|------|--------|
| `/khoa-hoc` | `src/app/khoa-hoc/page.tsx` | Danh sách môn/lớp (tóm tắt). |
| `/khoa-hoc/[slug]` | `src/app/khoa-hoc/[slug]/page.tsx` | Tuỳ chọn: cache preview lớp theo `slug` nếu payload nhỏ. |

### P1 — Gallery

| Route | File | Gợi ý |
|-------|------|--------|
| `/gallery` | `src/app/gallery/page.tsx` | ~30 bài mới nhất (hoặc theo tab nếu có filter — **một key mỗi tab**). |
| `/gallery/[mon]` | `src/app/gallery/[mon]/page.tsx` | Cache theo `mon` (vd: `hinh-hoa`, …). |

### P1 — Blog / Ebook / CMS lists

| Route | File | Gợi ý |
|-------|------|--------|
| `/blogs` | `src/app/blogs/page.tsx` | 30 bài mới nhất (meta + slug). |
| `/blogs/[slug]` | `src/app/blogs/[slug]/page.tsx` | Tuỳ chọn: cache bài đang đọc (cân nhắc kích thước nội dung). |
| `/ebook` | `src/app/ebook/page.tsx` | 30 ebook mới nhất. |
| `/ebook/[slug]` | `src/app/ebook/[slug]/page.tsx` | Tuỳ chọn giống blog. |

### P1 — Tra cứu / đề thi

| Route | File | Gợi ý |
|-------|------|--------|
| `/tra-cuu-thong-tin` | `src/app/tra-cuu-thong-tin/page.tsx` | 30 bài mới nhất (danh sách). |
| `/tra-cuu-thong-tin/[slug]` | `src/app/tra-cuu-thong-tin/[slug]/page.tsx` | Tuỳ chọn theo slug. |
| `/tong-hop-de-thi` | `src/app/tong-hop-de-thi/page.tsx` | 30 đề mới nhất. |
| `/tong-hop-de-thi/[slug]` | `src/app/tong-hop-de-thi/[slug]/page.tsx` | Tuỳ chọn. |

### P2 — Khác

| Route | File | Gợi ý |
|-------|------|--------|
| `/thi-thu` | `src/app/thi-thu/page.tsx` | Ít bài (~5) — cache nhẹ, ROI UX nhỏ nhưng đơn giản. |
| `/thi-thu/[slug]` | `src/app/thi-thu/[slug]/page.tsx` | Tuỳ chọn. |
| `/kien-thuc-nen-tang` | `src/app/kien-thuc-nen-tang/page.tsx` | Hub + link con — cache danh mục/tóm tắt nếu có fetch. |
| Các trang con `/kien-thuc-nen-tang/*` | `src/app/kien-thuc-nen-tang/**/page.tsx` | Chỉ khi có danh sách động hoặc nặng; **ưu tiên thấp**. |
| `/phong-hoc` | `src/app/phong-hoc/page.tsx` | Nếu có API danh sách phòng — xem xét. |
| `/phong-hoc/[slug]` | `src/app/phong-hoc/[slug]/page.tsx` | Tuỳ chọn. |
| `/he-thong-bai-tap/[slug]` | `src/app/he-thong-bai-tap/[slug]/page.tsx` | Tuỳ nếu user học viên quay lại nhiều. |

---

## Admin — đã triển khai stale-while-revalidate (`localStorage`)

> Chỉ danh sách nội bộ; dữ liệu nhạy cảm trên máy trình duyệt admin. Key prefix `sineart.admin.cache.v1.*`.  
> Khi `router.refresh()` sau thao tác, server gửi `reloadSignal` mới → client refetch + cập nhật cache.

| Route | File chính | Key `localStorage` | Ghi chú |
|-------|------------|--------------------|--------|
| `/admin/dashboard/quan-ly-hoc-vien` | `QuanLyHocVienBootstrap.tsx`, `quan-ly-hoc-vien-local-cache.ts` | `sineart.admin.cache.v1.quan-ly-hoc-vien` | Tối đa 30 học viên mới nhất (trim); helper `QUAN_LY_HOC_VIEN_CACHE_MAX_STUDENTS`. |
| `/admin/dashboard/quan-ly-nhan-su` | `QuanLyNhanSuBootstrap.tsx`, `quan-ly-nhan-su-local-cache.ts` | `sineart.admin.cache.v1.quan-ly-nhan-su` | Tối đa 30 nhân sự đầu danh sách (cùng sort API); `chi_nhanh` / ban / phòng giữ full để dropdown; helper `QUAN_LY_NHAN_SU_CACHE_MAX_STAFF`. |

---

## Trang **không** ghi trong brief này (mặc định chưa cache client)

| Nhóm | Lý do |
|------|--------|
| `src/app/admin/**` (ngoài các route trong bảng Admin phía trên) | Nội bộ + PII — chỉ thêm khi có brief riêng. |
| `src/app/hoc-vien/**` | Dữ liệu cá nhân — xử lý riêng, không gợi ý `localStorage` chung. |
| `/donghocphi` | Công cụ thanh toán / tra cứu — không cache nhầm PII. |

---

## Checklist khi sửa **một** trang

1. [ ] Xác định **query Supabase/API** trả về gì — chỉ serialize field cần hiển thị list/card.  
2. [ ] Định **tên key** + **version** (khi đổi shape JSON, tăng version hoặc đổi key để tránh parse lỗi).  
3. [ ] Luồng: mount → đọc cache → render (hoặc hydrate) → fetch → so sánh/cập nhật → `setItem`.  
4. [ ] Xử lý lỗi: quota đầy, `JSON.parse` fail, private mode — fallback fetch-only.  
5. [ ] QA: F5, tab mới, lần đầu không cache, sau khi CMS đổi dữ liệu có reflect sau refresh logic.

---

## Ghi chú sitemap

`SITE_STRUCTURE.md` còn nhắc `/mau-ve` — **chưa thấy** route tương ứng trong `src/app` tại thời điểm tạo file này. Khi thêm route, bổ sung một dòng vào bảng P1 tương tự blog/ebook.

---

*Tài liệu brief — cập nhật khi thêm route public mới hoặc đổi chiến lược cache.*
