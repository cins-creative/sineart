# Sine Art – Project Context for Claude Code

> Đọc file này trước khi làm bất cứ việc gì.
> Xem thêm: `SITE_STRUCTURE.md` (routing + URL rules), `HOMEPAGE_BRIEF.md` (data mapping trang chủ), `.claude/skills/sineart-design/SKILL.md` (design system).

---

## Tổng quan

Sine Art (`sineart.vn`) là trường mỹ thuật tại Việt Nam, ~350 học viên.
Stack: Next.js 14 App Router + TypeScript + Tailwind + Supabase.

---

## Design System — QUAN TRỌNG

Sine Art có design system riêng được dựng từ Claude Design.
**Khi tạo hoặc sửa bất kỳ UI component nào, LUÔN tuân thủ design system này.**

### Nguồn chính thức

| Nguồn | Mục đích |
|-------|----------|
| `.cursorrules` (root) | Rule auto-load cho Cursor mọi chat |
| `.claude/skills/sineart-design/SKILL.md` | Skill file — đọc trước khi làm UI |
| `.claude/skills/sineart-design/README.md` | Tài liệu đầy đủ về design system |
| `.claude/skills/sineart-design/HOW-TO-USE.md` | Hướng dẫn áp dụng |
| `src/styles/design-tokens.css` | CSS variables (colors, typography) — đã import vào globals |
| `public/fonts/` | Font files (Quicksand, Be Vietnam Pro) |
| `public/brand/` | Logo, icon, illustration |

### Brand tokens tóm tắt

- **Gradient chính:** `#F8A568 → #EE5CA2` (CTA, điểm nhấn, featured card)
- **Secondary:** `#BB89F8` (teacher accent, highlight phụ)
- **Font public site:** Quicksand
- **Font admin/HR:** Be Vietnam Pro
- **Ảnh:** LUÔN dùng Cloudflare Images URL format `imagedelivery.net/...`

### Quy tắc áp dụng

- Trước khi viết UI component mới, đọc `.claude/skills/sineart-design/SKILL.md`
- Dùng CSS variables từ `design-tokens.css` — không hardcode hex trong component
- Dùng Tailwind utility class đã map sang token (xem `tailwind.config.ts`) thay vì arbitrary value
- Không tự sáng tạo màu/spacing/radius mới — đề xuất thêm vào design system trước nếu cần
- Component layout phải match pattern trong `README.md` của skill (card, button, form, modal)

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS + `cn()` (clsx + tailwind-merge) |
| Backend | Supabase Postgres — `izqoovekasfsapvbxmgm.supabase.co` |
| Auth | Email login đối chiếu `hr_nhan_su.email` |
| File storage | Cloudflare Images |
| API proxy | Cloudflare Worker — `sine-art-api.nguyenthanhtu-nkl.workers.dev` |
| Deploy | Vercel |

---

## Cấu trúc thư mục

```
sineart-web/
  .cursorrules                # Design system rule cho Cursor
  .claude/
    skills/
      sineart-design/         # Design system skill (Claude Design export)
        SKILL.md
        README.md
        HOW-TO-USE.md
        colors_and_type.css
  public/
    fonts/                    # Quicksand, Be Vietnam Pro
    brand/                    # Logo, icon, illustration
  src/
    app/                      # App Router — xem SITE_STRUCTURE.md để biết toàn bộ routes
      (home)/
        page.tsx              # Trang chủ — xem HOMEPAGE_BRIEF.md
      khoa-hoc/
        page.tsx
        [slug]/page.tsx
      gallery/
        page.tsx
        [mon]/page.tsx
      tra-cuu-thong-tin/
        page.tsx
        [slug]/page.tsx
      tong-hop-de-thi/
        page.tsx
        [slug]/page.tsx
      blogs/
        page.tsx
        [slug]/page.tsx
      mau-ve/
        page.tsx
        [slug]/page.tsx
      ebook/
        page.tsx
        [slug]/page.tsx
      thi-thu/
        page.tsx
        [slug]/page.tsx
      tinh-diem/page.tsx
      donghocphi/page.tsx
      hr/
        layout.tsx            # Auth check middleware
        [role]/page.tsx
      hiring/
        [slug]/page.tsx

    components/
      ui/                     # Base: button, input, modal...
      features/               # Feature-specific components

    lib/
      supabase/
        client.ts             # createBrowserClient
        server.ts             # createServerComponentClient
      utils.ts                # cn() helper

    styles/
      design-tokens.css       # Import từ Claude Design

    types/
      homepage.ts             # MonHoc, BaiHocVien, NhanSu, DanhGia
      index.ts                # Tất cả types
```

---

## URL Rules — QUAN TRỌNG

- **Không tự đổi slug** bất kỳ route nào đã có trong sitemap
- Mọi thay đổi URL phải có 301 redirect trong `next.config.js`
- Slug tiếng Việt có dấu: Next.js tự decode — lưu dạng decode trong DB
- Xem toàn bộ routes hiện có trong `SITE_STRUCTURE.md`

---

## Schema Supabase

### Prefix `ql_` – Quản lý học vụ

#### `ql_thong_tin_hoc_vien` — Hồ sơ học viên
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| created_at | timestamptz | default now() |
| full_name | text NOT NULL | |
| email | text | |
| email_prefix | text | |
| sdt | text | |
| facebook | text | |
| sex | text | |
| nam_thi | integer | năm thi đại học |
| ngay_bat_dau | date | |
| ngay_ket_thuc | date | |
| is_hoc_vien_mau | boolean | default false |
| loai_khoa_hoc | text | |
> RLS: anon SELECT, INSERT, UPDATE, DELETE — bảng duy nhất anon được ghi

#### `ql_quan_ly_hoc_vien` — Enrollment (học viên ↔ lớp)
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| created_at | timestamptz | |
| hoc_vien_id | bigint FK → ql_thong_tin_hoc_vien.id | |
| lop_hoc | bigint FK → ql_lop_hoc.id | |
| status | text | default 'Đang học' |
| tien_do_hoc | bigint | FK → bài tập đang học |
| ghi_chu | text | |
| trang_thai | text | |
> RLS: anon SELECT

#### `ql_lop_hoc` — Lớp học
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| created_at | timestamptz | |
| class_name | text NOT NULL | tên ngắn |
| class_full_name | text | tên đầy đủ |
| mon_hoc | bigint FK → ql_mon_hoc.id | |
| chi_nhanh_id | bigint FK → hr_ban.id | |
| teacher | bigint FK → hr_nhan_su.id | |
| avatar | text | |
| url_class | text | slug dùng cho route /khoa-hoc/[slug] |
| device | text | thiết bị yêu cầu |
| lich_hoc | text | |
> RLS: anon SELECT

#### `ql_mon_hoc` — Môn học
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| created_at | timestamptz | |
| ten_mon_hoc | text NOT NULL | |
| thumbnail | text | |
| loai_khoa_hoc | text | |
| thu_tu_hien_thi | integer | default 99 — thứ tự trang chủ |
| is_featured | boolean | default false — featured card lớn |
| mo_ta_ngan | text | subtitle trang chủ |
| gradient_start | text | hex vd '#f8a668' |
| gradient_end | text | hex vd '#ee5b9f' |
> RLS: anon SELECT

#### `ql_hv_truong_nganh` — Trường & ngành thi của học viên
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| hoc_vien | bigint FK → ql_thong_tin_hoc_vien.id | |
| truong_dai_hoc | bigint FK → dh_truong_dai_hoc.id | |
| nganh_dao_tao | bigint FK → dh_nganh_dao_tao.id | |
| nam_thi | integer | |
| ghi_chu | text | |
> RLS: anon SELECT

#### `ql_danh_gia` — Đánh giá / testimonial
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| created_at | timestamptz | default now() |
| ten_nguoi | text NOT NULL | |
| avatar_url | text | |
| noi_dung | text NOT NULL | |
| so_sao | integer | default 5, CHECK 1–5 |
| khoa_hoc | bigint FK → ql_mon_hoc.id | nullable |
| thoi_gian_hoc | text | vd: '3 tháng' |
| nguon | text | default 'Google Maps' |
| hien_thi | boolean | default true |
> RLS: anon SELECT where hien_thi = true

---

### Prefix `hp_` – Học phí

#### `hp_don_thu_hoc_phi` — Đơn thu học phí
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ma_don | text | |
| ma_don_so | text | |
| student | bigint FK → ql_thong_tin_hoc_vien.id | |
| nguoi_tao | bigint FK → hr_nhan_su.id | |
| hinh_thuc_thu | text | default 'Chuyen khoan' |
| status | text | default 'Cho thanh toan' |
| giam_gia | numeric | default 0 |
| ngay_thanh_toan | date | |
> RLS: anon SELECT

#### `hp_thu_hp_chi_tiet` — Chi tiết dòng học phí
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| don_thu | bigint FK → hp_don_thu_hoc_phi.id | |
| nguoi_tao | bigint FK → hr_nhan_su.id | |
| khoa_hoc_vien | bigint FK → ql_quan_ly_hoc_vien.id | |
| goi_hoc_phi | bigint FK → hp_goi_hoc_phi.id | |
| ngay_dau_ky | date | |
| ngay_cuoi_ky | date | |
| status | text | default 'Cho thanh toan' |
> RLS: anon SELECT

#### `hp_goi_hoc_phi` — Gói học phí (pricing)
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_goi_hoc_phi | text NOT NULL | |
| hoc_phi | numeric | default 0 |
| gia_giam | numeric | default 0 |
| mon_hoc | bigint FK → ql_mon_hoc.id | |
> RLS: anon SELECT

#### `hp_giao_dich_thanh_toan` — Giao dịch SePay webhook
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| gateway | text | |
| transaction_date | timestamptz | |
| transfer_amount | numeric | |
| transfer_type | text | |
| content | text | nội dung chuyển khoản |
| description | text | |
| ma_don_trich_xuat | text | parse từ content |
| raw_webhook | jsonb | payload gốc |
| account_number | text | STK nhận |

---

### Prefix `hv_` – Bài tập học viên

#### `hv_bai_hoc_vien` — Bài nộp của học viên
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_hoc_vien | bigint FK → ql_thong_tin_hoc_vien.id | |
| class | bigint FK → ql_lop_hoc.id | |
| thuoc_bai_tap | bigint FK → hv_he_thong_bai_tap.id | |
| photo | text | Cloudflare Images URL |
| score | numeric | |
| bai_mau | boolean | default false |
| status | text | default 'Chờ xác nhận' |
| ghi_chu | text | |
> RLS: anon SELECT where status = 'Hoàn thiện'

#### `hv_he_thong_bai_tap` — Danh sách bài tập
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_bai_tap | text NOT NULL | |
| bai_so | integer | |
| thumbnail | text | |
| mon_hoc | bigint FK → ql_mon_hoc.id | |
| url_bai_tap | text | |
> RLS: anon SELECT

---

### Prefix `hr_` – Nhân sự

#### `hr_nhan_su` — Nhân viên / giáo viên
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| full_name | text NOT NULL | |
| sdt | text | |
| email | text | dùng để login |
| avatar | text | Cloudflare Images URL |
| bank_name | text | |
| bank_stk | text | |
| portfolio | text[] | default '{}' — mảng URL ảnh tác phẩm |
| bio | text | giới thiệu ngắn trang chủ |
| nam_kinh_nghiem | integer | default 0 |
| mon_day | bigint[] | default '{}' — array FK → ql_mon_hoc.id |
> RLS: anon SELECT

#### `hr_ban` — Chi nhánh
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_ban | text NOT NULL | |

#### `hr_bang_tinh_luong` — Bảng lương
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| nhan_vien | bigint FK → hr_nhan_su.id | |
| luong_co_ban | numeric | default 0 |
| tro_cap | numeric | default 0 |
| tam_ung | numeric | default 0 |
| thuong | numeric | default 0 |
| lich_diem_danh | bigint FK → hr_lich_diem_danh.id | |

#### `hr_lich_diem_danh` — Điểm danh theo tháng
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| thang | text | |
| nam | text | |
| so_buoi_lam_viec | integer | |
| nhan_vien | bigint FK → hr_nhan_su.id | |
| bang_tinh_luong | bigint FK → hr_bang_tinh_luong.id | |
| so_buoi_nghi_trong_thang | integer | default 0 |
| tong_buoi_lam_viec_trong_thang | integer | default 0 |

---

### Prefix `hc_` – Hoạ cụ

#### `hc_danh_sach_san_pham` — Danh mục sản phẩm
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_hang | text NOT NULL | |
| loai_san_pham | text | |
| gia_nhap | numeric | default 0 |
| gia_ban | numeric | default 0 |
| ton_kho | integer | default 0 |
| thumbnail | text | |
> RLS: anon SELECT

#### `hc_don_ban_hoa_cu` — Đơn bán
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| nguoi_ban | bigint FK → hr_nhan_su.id | |
| khach_hang | bigint FK → ql_thong_tin_hoc_vien.id | |
| hinh_thuc_thu | text | default 'Tien mat' |

#### `hc_ban_hc_chi_tiet` — Chi tiết đơn bán
| Cột | Type | Ghi chú |
|-----|------|---------|
| don_ban | bigint FK → hc_don_ban_hoa_cu.id | |
| mat_hang | bigint FK → hc_danh_sach_san_pham.id | |
| so_luong_ban | integer | default 1 |

#### `hc_nhap_hoa_cu` — Đơn nhập kho
| Cột | Type | Ghi chú |
|-----|------|---------|
| nha_cung_cap | text | |
| nguoi_nhap | bigint FK → hr_nhan_su.id | |

#### `hc_nhap_hoa_cu_chi_tiet` — Chi tiết nhập kho
| Cột | Type | Ghi chú |
|-----|------|---------|
| don_nhap | bigint FK → hc_nhap_hoa_cu.id | |
| mat_hang | bigint FK → hc_danh_sach_san_pham.id | |
| so_luong_nhap | integer | default 1 |

---

### Prefix `tc_` – Tài chính khác

#### `tc_thu_chi_khac`
| Cột | Type | Ghi chú |
|-----|------|---------|
| tieu_de | text NOT NULL | |
| chu_thich | text | |
| thu | numeric | default 0 |
| chi | numeric | default 0 |
| hinh_thuc | text | default 'Tien mat' |
| loai_thu_chi_id | bigint FK → tc_loai_thu_chi.id | |
| nguoi_tao_id | bigint FK → hr_nhan_su.id | |
> RLS: anon SELECT

#### `tc_loai_thu_chi`
| Cột | Type | Ghi chú |
|-----|------|---------|
| giai_nghia | text NOT NULL | |
| loai_thu_chi | text | default 'Chi' |
> RLS: anon SELECT

---

### Prefix `dh_` – Đại học (dữ liệu tham chiếu)

#### `dh_truong_dai_hoc`
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_truong_dai_hoc | text NOT NULL | |
| score | numeric | điểm chuẩn |

#### `dh_nganh_dao_tao`
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | bigint PK | |
| ten_nganh | text NOT NULL | |

#### `dh_truong_nganh` — Junction trường ↔ ngành
| Cột | Type |
|-----|------|
| truong_dai_hoc | bigint FK → dh_truong_dai_hoc.id |
| nganh_dao_tao | bigint FK → dh_nganh_dao_tao.id |

---

## Quy tắc Supabase

- **Anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`): client-side read
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`): server-side only, bypass RLS
- REST API **không** FK-join qua views — chỉ join trên real tables
- `ql_thong_tin_hoc_vien`: bảng duy nhất anon được INSERT/UPDATE/DELETE
- `hv_bai_hoc_vien`: anon chỉ đọc `status = 'Hoàn thiện'`
- `ql_danh_gia`: anon chỉ đọc `hien_thi = true`
- `hr/*` routes: yêu cầu auth — kiểm tra session trong middleware

---

## Cloudflare Worker

```
Base URL: sine-art-api.nguyenthanhtu-nkl.workers.dev

POST /upload-cf-images   → upload ảnh lên Cloudflare Images
POST /delete-cf-image    → xóa ảnh theo imageId
```

---

## Conventions

- `cn()` từ `@/lib/utils` cho className — không inline string concatenation
- Không khởi tạo Supabase client trong component — import từ `@/lib/supabase/`
- `createServerComponentClient` cho Server Components
- `createBrowserClient` cho Client Components
- Không dùng `any` — type đầy đủ, xem `src/types/`
- Không dùng `pages/` router — App Router only
- Không commit `.env.local`
- Không dùng Airtable cho feature mới
- Fetch trong Server Components, truyền data xuống client qua props
- Không fetch client-side trừ khi cần real-time hoặc user interaction
- UI component phải tuân thủ design system tại `.claude/skills/sineart-design/`
- Màu/font/spacing phải dùng token từ `design-tokens.css`, không hardcode

---

## Fetch pattern chuẩn

```ts
// Server Component
import { createServerComponentClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createServerComponentClient()
  const { data, error } = await supabase
    .from('ql_mon_hoc')
    .select('id, ten_mon_hoc, gradient_start, gradient_end')
    .order('thu_tu_hien_thi')

  if (error) throw error
  return <Component data={data} />
}
```

```ts
// Revalidate strategy
export const revalidate = 3600 // đặt ở đầu page.tsx
```

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| `SITE_STRUCTURE.md` | Toàn bộ routes, URL rules, redirect strategy, CMS strategy |
| `HOMEPAGE_BRIEF.md` | Data mapping chi tiết cho trang chủ, Supabase queries, TypeScript types |
| `.cursorrules` | Design system rule — Cursor auto-load mọi chat |
| `.claude/skills/sineart-design/SKILL.md` | Design system skill — đọc trước khi làm UI |
| `.claude/skills/sineart-design/README.md` | Tài liệu đầy đủ design system (colors, typography, components) |
| `.claude/skills/sineart-design/HOW-TO-USE.md` | Hướng dẫn áp dụng design system |
