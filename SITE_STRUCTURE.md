# Sine Art – Cấu trúc trang (Site Structure Brief)

> Dựa trên sitemap.xml hiện tại của `sineart.vn`.
> Dùng làm nền tảng rebuild Next.js App Router — không được thay đổi URL đã có.

---

## Tổng quan các nhóm URL

| Nhóm | Prefix | Số trang | Loại |
|------|--------|----------|------|
| Trang chủ | `/` | 1 | Static |
| Khoá học | `/khoa-hoc` | 14 | Dynamic |
| Gallery | `/gallery` | 4 | Static + filter |
| Tra cứu thông tin | `/tra-cuu-thong-tin` | ~80 | CMS/Dynamic |
| Tổng hợp đề thi | `/tong-hop-de-thi` | ~55 | CMS/Dynamic |
| Blog | `/blogs` | ~150+ | CMS/Dynamic |
| Mẫu vẽ | `/mau-ve` | ~55 | CMS/Dynamic |
| Ebook | `/ebook` | ~150+ | CMS/Dynamic |
| Thì thử | `/thi-thu` | 5 | Static/Dynamic |
| Tiện ích | `/tra-cuu-thong-tin`, `/donghocphi` | 2 | Tool |
| HR nội bộ | `/hr/*` | 6 | Protected |
| Tuyển dụng | `/hiring/*` | 1 | Static |
| Kiến thức nền tảng | `/kien-thuc-nen-tang` | 1 | CMS |

---

## Chi tiết từng route — Next.js App Router

---

### `/` — Trang chủ
```
app/page.tsx
```
Server Component. Fetch từ Supabase: `ql_mon_hoc`, `hv_bai_hoc_vien`, `hr_nhan_su`, `ql_danh_gia`.
Xem `HOMEPAGE_BRIEF.md` để biết chi tiết mapping.

---

### `/khoa-hoc` — Danh sách khoá học
```
app/khoa-hoc/page.tsx
```
Hiển thị tất cả khoá học. Fetch từ `ql_mon_hoc` + `ql_lop_hoc`.

#### `/khoa-hoc/[slug]` — Chi tiết khoá học
```
app/khoa-hoc/[slug]/page.tsx
```

Các slug hiện có — **giữ nguyên tất cả**:

| Slug | Mô tả |
|------|-------|
| `hinh-hoa-online` | Hình họa online |
| `hinh-hoa-online-cap-toc` | Hình họa online cấp tốc |
| `offline` | Lớp offline |
| `offline-cap-toc` | Offline cấp tốc |
| `background` | Background |
| `trang-tri-mau-online` | Trang trí màu online |
| `trang-tri-mau-online-cap-toc` | Trang trí màu online cấp tốc |
| `bo-cuc-mau-online` | Bố cục màu online |
| `hh01` `hh02` `hh03` `hh04` | Hình họa theo cấp độ |
| `ttm01` `ttm02` `ttm03` `ttm04` | Trang trí màu theo cấp độ |
| `bcm01` `bcm02` | Bố cục màu theo cấp độ |

> **Lưu ý:** `hh01–04`, `ttm01–04`, `bcm01–02` là slug tĩnh hiện tại.
> Khi rebuild có thể map sang `ql_lop_hoc.url_class` nếu muốn dynamic,
> nhưng phải dùng `generateStaticParams` + redirect từ slug cũ để không lệch URL.

---

### `/gallery` — Gallery tổng
```
app/gallery/page.tsx
```
Fetch `hv_bai_hoc_vien` WHERE `status = 'Hoàn thiện'`. Có filter tabs.

#### `/gallery/[mon]` — Gallery theo môn
```
app/gallery/[mon]/page.tsx
```

| Slug | Môn học |
|------|---------|
| `hinh-hoa` | Hình họa |
| `trang-tri-mau` | Trang trí màu |
| `bo-cuc-mau` | Bố cục màu |

> Cần thêm slug cho Digital và MT Cơ bản nếu muốn mở rộng.

---

### `/tra-cuu-thong-tin` — Tra cứu thông tin tuyển sinh
```
app/tra-cuu-thong-tin/page.tsx           ← Danh sách bài
app/tra-cuu-thong-tin/[slug]/page.tsx    ← Chi tiết bài
```

~80 bài hiện có, toàn bộ là **dynamic slug**. Content từ CMS (Framer CMS hiện tại).

**Khi migrate Next.js:**
- Nếu dùng Supabase làm CMS: tạo bảng `cms_bai_viet` với cột `slug`, `loai` (tra-cuu / blog / de-thi...), `noi_dung` (markdown/html)
- Dùng `generateStaticParams` để pre-render tất cả slug → không thay đổi URL
- Hoặc dùng ISR (`revalidate: 3600`) cho phép cập nhật nội dung

> ⚠️ Đây là nhóm URL quan trọng nhất về SEO — có hàng chục bài đang rank Google.
> **Tuyệt đối không thay đổi slug.**

---

### `/tong-hop-de-thi` — Tổng hợp đề thi
```
app/tong-hop-de-thi/page.tsx
app/tong-hop-de-thi/[slug]/page.tsx
```

~55 đề thi. Cùng pattern với `/tra-cuu-thong-tin`.

> ⚠️ Nhiều slug có ký tự tiếng Việt encode (`%C4%91%E1%BB%81-thi-...`).
> Next.js tự handle decode — chỉ cần lưu slug dạng đã decode trong DB
> (`đề-thi-hình-họa-sine-art-mẫu-tĩnh-vật-1`).

---

### `/blogs` — Blog
```
app/blogs/page.tsx
app/blogs/[slug]/page.tsx
```

150+ bài blog. Nhiều bài là **content partnership** từ các trường đại học (HSU, Van Lang, TDTU...) — không phải content Sine Art viết.

> ⚠️ Cần xác nhận: các bài blog trường đại học này có cần giữ lại trên domain Sine Art không?
> Nếu giữ: migrate đủ sang CMS mới.
> Nếu không giữ: set up 301 redirect sang URL gốc của trường đó.

---

### `/mau-ve` — Mẫu vẽ tham khảo
```
app/mau-ve/page.tsx
app/mau-ve/[slug]/page.tsx
```

~55 mẫu, gồm:
- Tượng thạch cao (1–35)
- Mẫu tĩnh vật
- Mẫu chân dung
- Mẫu toàn thân
- Khối cơ bản

> Có thể map vào bảng `hv_he_thong_bai_tap` hoặc tạo bảng CMS riêng `cms_mau_ve`.

---

### `/ebook` — Thư viện ebook
```
app/ebook/page.tsx
app/ebook/[slug]/page.tsx
```

150+ ebook (toàn tiếng Anh, nhiều cuốn bản quyền nhạy cảm).

> ⚠️ Cần kiểm tra lại policy bản quyền trước khi migrate.
> Hiện tại đây là content quan trọng thu hút traffic từ Google.

---

### `/thi-thu` — Thi thử
```
app/thi-thu/page.tsx
app/thi-thu/[slug]/page.tsx
```

5 bài thi thử:
- `hình-họa-đầu-tượng`
- `hình-họa-chân-dung`
- `hình-họa-toàn-thân`
- `trang-trí-màu`
- `bố-cục-màu`

---

### `/kien-thuc-nen-tang` — Kiến thức nền tảng
```
app/kien-thuc-nen-tang/page.tsx
```

---

### `/tra-cuu-thong-tin` — Công cụ tra cứu (tool)
> Đây là trang **tool tra cứu điểm/thông tin học viên**, khác với section bài viết cùng tên.
> Cần xác nhận URL có trùng không hay là 2 trang riêng.

### `/donghocphi` — Đóng học phí
```
app/donghocphi/page.tsx
```
Trang thanh toán học phí. Cần auth hoặc tra cứu mã đơn.

---

### `/hr/*` — Trang nội bộ nhân sự (Protected)
```
app/hr/[role]/page.tsx
```

| Route | Đối tượng |
|-------|-----------|
| `/hr/media` | Nhân sự Media |
| `/hr/investment` | Đầu tư |
| `/hr/tuvan` | Tư vấn |
| `/hr/daotao` | Đào tạo |
| `/hr/hanhchinh` | Hành chính |
| `/hr/report` | Báo cáo |
| `/hr/mkt` | Marketing |

> Tất cả route `/hr/*` cần xác thực. Nên dùng middleware Next.js kiểm tra session.
> Login đối chiếu `hr_nhan_su.email` (xem CLAUDE.md).

---

### `/hiring/[slug]` — Tuyển dụng
```
app/hiring/[slug]/page.tsx
```

Hiện có: `/hiring/uidesigner`. Có thể mở rộng.

---

## Redirect cần thiết khi rebuild

Nếu có bất kỳ URL nào bị đổi, phải set 301 trong `next.config.js`:

```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      // Ví dụ nếu đổi slug:
      // {
      //   source: '/khoa-hoc/hh01',
      //   destination: '/khoa-hoc/hinh-hoa-co-ban',
      //   permanent: true,
      // },
    ]
  },
}
```

> **Nguyên tắc:** Không thay đổi URL nào đã tồn tại trong sitemap trừ khi có redirect 301.

---

## Nhóm URL theo độ ưu tiên SEO

### 🔴 Cao — Không được đổi URL, cần migrate đầy đủ content
- `/tra-cuu-thong-tin/[slug]` — bài viết tuyển sinh, đang rank Google
- `/blogs/[slug]` — blog traffic lớn
- `/tong-hop-de-thi/[slug]` — từ khóa đặc thù cao
- `/ebook/[slug]` — traffic tự nhiên lớn
- `/khoa-hoc/[slug]` — trang chuyển đổi chính

### 🟡 Trung bình — Migrate nhưng ít urgent hơn
- `/mau-ve/[slug]`
- `/gallery/[mon]`
- `/thi-thu/[slug]`
- `/kien-thuc-nen-tang`

### 🟢 Thấp — Có thể rebuild từ đầu
- `/hr/*` (nội bộ, không index)
- `/hiring/*`
- `/donghocphi`

---

## Gợi ý cấu trúc thư mục Next.js

```
src/app/
  page.tsx                              ← Trang chủ
  layout.tsx                            ← Root layout (font, nav, footer)

  khoa-hoc/
    page.tsx                            ← Danh sách khoá học
    [slug]/
      page.tsx                          ← Chi tiết khoá học

  gallery/
    page.tsx                            ← Gallery tổng
    [mon]/
      page.tsx                          ← Gallery theo môn

  tra-cuu-thong-tin/
    page.tsx
    [slug]/
      page.tsx

  tong-hop-de-thi/
    page.tsx
    [slug]/
      page.tsx

  blogs/
    page.tsx
    [slug]/
      page.tsx

  mau-ve/
    page.tsx
    [slug]/
      page.tsx

  ebook/
    page.tsx
    [slug]/
      page.tsx

  thi-thu/
    page.tsx
    [slug]/
      page.tsx

  kien-thuc-nen-tang/
    page.tsx

  tinh-diem/
    page.tsx

  donghocphi/
    page.tsx

  hiring/
    [slug]/
      page.tsx

  hr/                                   ← Protected group
    layout.tsx                          ← Auth middleware check
    [role]/
      page.tsx
```

---

## CMS strategy cho content động

Hiện tại Framer CMS quản lý toàn bộ blog, tra cứu, đề thi, mẫu vẽ, ebook.

Khi migrate Next.js có 3 lựa chọn:

**Option A — Giữ Framer CMS, fetch qua API** *(nhanh nhất)*
- Dùng Framer CMS API để fetch content vào Next.js
- Không cần migrate nội dung
- Downside: phụ thuộc Framer

**Option B — Migrate sang Supabase** *(long-term tốt nhất)*
- Tạo bảng `cms_bai_viet(id, slug, tieu_de, noi_dung, loai, created_at, hien_thi)`
- `loai`: `'blog' | 'tra-cuu' | 'de-thi' | 'mau-ve' | 'ebook'`
- Migration script: export từ Framer → import vào Supabase

**Option C — Headless CMS** *(Sanity, Contentful)*
- Tốt nếu team non-technical cần edit content
- Thêm dependency

> **Gợi ý cho Sine Art:** Option B — Supabase đã là backend chính,
> thêm 1 bảng CMS là đủ, không cần service ngoài.
