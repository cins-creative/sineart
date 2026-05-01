# Sitemap — toàn bộ website Sine Art (repo `sineart-web`)

**Canonical:** `https://sineart.vn`  
**Sitemap máy (Next.js):** [`/sitemap.xml`](/sitemap.xml) — sinh bởi [`src/app/sitemap.ts`](../src/app/sitemap.ts), logic URL trong [`src/lib/seo/sitemap-data.ts`](../src/lib/seo/sitemap-data.ts).  
**Tài liệu URL gốc / SEO:** [`SITE_STRUCTURE.md`](../SITE_STRUCTURE.md)

File này là **bản tra cứu một chỗ** cho người làm product/dev; URL động (blog, tra cứu, đề thi, ebook, lớp…) **phụ thuộc dữ liệu Supabase** và có thể thay đổi theo thời gian.

---

## 1. Trang tĩnh có trong `buildSitemapEntries` (luôn có trong `/sitemap.xml` khi build)

| Đường dẫn | Ghi chú |
|-----------|---------|
| `/` | Trang chủ |
| `/khoa-hoc` | Danh sách khóa học |
| `/blogs` | Danh sách blog |
| `/gallery` | Gallery |
| `/tra-cuu-thong-tin` | Tra cứu thông tin (danh sách) |
| `/tong-hop-de-thi` | Tổng hợp đề thi |
| `/ebook` | Thư viện ebook |
| `/kien-thuc-nen-tang` | Hub kiến thức nền tảng |
| `/thi-thu` | Danh sách kỳ thi thử |
| `/donghocphi` | Đóng học phí |
| `/tinh-diem` | Công cụ tính điểm xét tuyển NK |

---

## 2. URL động — nguồn dữ liệu (theo `sitemap-data.ts`)

| Pattern | Nguồn |
|---------|--------|
| `/khoa-hoc/[slug]` | `ql_lop_hoc.url_class` (chuẩn hoá `normalizeClassSlug`) |
| `/blogs/[slug]` | `mkt_blogs` — `slug` = `slugifyTitle(title)` (không prefix `id-`; URL cũ `id-slug` → 308) |
| `/tra-cuu-thong-tin/[slug]` | `tra_cuu_thong_tin.slug` |
| `/tong-hop-de-thi/[slug]` | `fetchAllDeThiSlugs()` |
| `/ebook/[slug]` | `fetchAllEbooks()` |
| `/he-thong-bai-tap/[slug]` | `hv_he_thong_bai_tap.url_bai_tap` |

Slug có ký tự tiếng Việt được encode trong URL theo chuẩn HTTP (Next decode khi routing).

---

## 3. Kiến thức nền tảng — route tĩnh `/kien-thuc-nen-tang/*`

Các segment tĩnh được push trong `KIEN_THUC_STATIC_SEGMENTS` (xem [`sitemap-data.ts`](../src/lib/seo/sitemap-data.ts)).  
Ngoài ra trong App Router còn:

- `/kien-thuc-nen-tang/[slug]` — bài bổ sung / fallback động.

Danh sách thư mục `page.tsx` trực tiếp dưới `kien-thuc-nen-tang/` (trừ `[slug]`):

`cac-he-mau-vat-ly`, `ly-thuyet-vat-lieu`, `diem-tap-trung`, `giai-phau-cho-hoa-si`, `phuong-phap-ve-silhouette`, `nghe-thuat-chu-typography`, `phuong-phap-ve-gioi-han`, `he-thong-mau-munsell`, `shading-la-gi`, `thuoc-tinh-mau-sac`, `giai-phau-ban-tay`, `ly-thuyet-vat-lieu-pbr`, `bo-cuc-trong-tranh`, `gam-mau`, `cach-dieu`, `khong-gian-mau`, `co-nen-hoc-vong-ryb`, `phoi-canh-khi-quyen`, `phuong-phap-ve-cau-truc`, `phuong-phap-ve-force`, `bo-cuc-trong-thiet-ke`, `ly-thuyet-hoa-sac`, `phoi-canh-mat-ca`, `mau-sac-qua-thiet-bi-dien-tu`, `mo-hinh-cong-tru-mau`, `phoi-canh-panorama-360`, `phuong-phap-ky-hoa`, `ti-le-co-the-nguoi`, `ly-thuyet-phoi-canh`, `co-so-tao-hinh`, `bo-cuc-sac-do`, `giai-phau-ban-chan`, `nguyen-ly-thi-giac`, `giai-phau-chan-dung-nguoi`, `phoi-canh-song-song`.

*(Nếu thêm folder mới: cập nhật `KIEN_THUC_STATIC_SEGMENTS` để URL có trong `sitemap.xml`.)*

---

## 4. Trang public khác — **có trong code**, không nhất thiết trong `buildSitemapEntries`

| Pattern | File | Ghi chú |
|---------|------|---------|
| `/thi-thu/[id]` | `app/thi-thu/[id]/page.tsx` | Phòng thi theo **id** kỳ (UUID/số trong DB), không phải slug 5 bài trong brief cũ |
| `/phong-hoc` | `app/phong-hoc/page.tsx` | |
| `/phong-hoc/[slug]` | `app/phong-hoc/[slug]/page.tsx` | |
| `/hoc-vien/[email]` | `app/hoc-vien/[email]/page.tsx` | Tra cứu theo email — có thể không index |

**Lưu ý:** `/gallery/[mon]` được mô tả trong [`SITE_STRUCTURE.md`](../SITE_STRUCTURE.md) (`hinh-hoa`, `trang-tri-mau`, `bo-cuc-mau`) nhưng **chưa có** route con trong `src/app/gallery/` (hiện chỉ có `gallery/page.tsx`).

---

## 5. Khóa học — slug cố định (brief SEO, khớp `SITE_STRUCTURE`)

Giữ nguyên URL khi đã public:

`hinh-hoa-online`, `hinh-hoa-online-cap-toc`, `offline`, `offline-cap-toc`, `background`, `trang-tri-mau-online`, `trang-tri-mau-online-cap-toc`, `bo-cuc-mau-online`, `hh01`, `hh02`, `hh03`, `hh04`, `ttm01`, `ttm02`, `ttm03`, `ttm04`, `bcm01`, `bcm02`.

Đầy đủ `/khoa-hoc/{slug}` khi slug xuất hiện trong Supabase (`url_class`).

---

## 6. Thi thử — brief marketing vs app hiện tại

[`SITE_STRUCTURE.md`](../SITE_STRUCTURE.md) liệt kê 5 slug demo:  
`hình-họa-đầu-tượng`, `hình-họa-chân-dung`, …  

Ứng dụng đang dùng **`/thi-thu` + `/thi-thu/[id]`** theo kỳ thi trong DB (`thi_thu_ky_thi`), không map 1-1 các slug trên trừ khi redirect/CMS chỉ định.

---

## 7. Khu vực nội bộ / không ưu tiên SEO public

| Prefix | Mục đích |
|--------|-----------|
| `/admin/*` | CMS, dashboard (đăng nhập) |
| `/admin/dashboard/*` | Quản trị: học viên, blog, ebook, thi thử, BCTC, … |

Không nên đưa vào `sitemap.xml` (google); có thể `noindex` theo layout/middleware.

Theo brief còn có **`/hr/*`**, **`/hiring/[slug]`** — **chưa thấy** thư mục `app/hr`, `app/hiring` trong repo hiện tại; khi thêm route cần bổ sung vào tài liệu này.

---

## 8. Route trong brief nhưng **chưa có** trong repo (roadmap)

| Nhóm | Ghi chú |
|------|---------|
| `/mau-ve`, `/mau-ve/[slug]` | SITE_STRUCTURE |
| `/gallery/[mon]` | Filter theo môn |

---

## 9. Cập nhật sitemap khi phát triển

1. Thêm URL tĩnh mới → `staticPaths` trong [`sitemap-data.ts`](../src/lib/seo/sitemap-data.ts).  
2. Thêm nhóm động → query Supabase + `push()` trong `buildSitemapEntries`.  
3. Giữ nguyên slug public đã có — mọi đổi URL cần **301** trong `next.config` (xem [`SITE_STRUCTURE.md`](../SITE_STRUCTURE.md)).

---

*Tạo để đồng bộ giữa marketing, SEO và codebase Next.js App Router.*
