# Brief cho Claude Design — Cấu trúc HTML Thi thử (4 trang)

Tài liệu này mô tả cây **HTML / ngữ nghĩa** (outline) để thiết kế lại UI. Mọi nội dung gom **một file duy nhất** — không tách file con.

**Lưu ý URL:** Trong code, dynamic segment là **`[id]`** (UUID kỳ thi), **không** dùng slug tên kỳ. Đường dẫn thực tế:

- Public: `https://sineart.vn/thi-thu` và `https://sineart.vn/thi-thu/{id}`
- Admin: `.../admin/dashboard/thi-thu` và `.../admin/dashboard/thi-thu/{id}` (trang tạo mới: `.../admin/dashboard/thi-thu/new`)

---

## Chung: Admin — khung trang

Mọi route dưới `/admin/dashboard` dùng layout `AdminStaffShellLayout` → component **`AdminShell`**: sidebar, header, vùng nội dung. Các trang thi thử **admin** nằm trong **main** của shell (nội dung con bên dưới).

```html
<div>
  <aside>… menu dashboard …</aside>
  <div>
    <header>… (tuỳ shell) …</header>
    <main>
      <!-- nội dung từng trang admin bên dưới -->
    </main>
  </div>
</div>
```

---

## 1. `/admin/dashboard/thi-thu` — Danh sách kỳ thi

**Nguồn:** `ThiThuAdminListClient`

```html
<div>
  <div>
    <div>
      <p>Marketing</p>
      <h1>Thi thử</h1>
    </div>
    <a href="/admin/dashboard/thi-thu/new">Tạo kỳ thi mới</a>
  </div>

  <div>
    <select>
      <option>Tất cả môn</option>
      <option>Hình họa</option>
      <option>Trang trí màu</option>
      <option>Bố cục màu</option>
    </select>
    <select>
      <option>Tất cả trạng thái</option>
      <option>draft</option>
      <option>published</option>
    </select>
  </div>

  <div>
    <table>
      <thead>
        <tr>
          <th>Ảnh</th>
          <th>Tiêu đề</th>
          <th>Môn</th>
          <th>Giờ bắt đầu</th>
          <th>Trạng thái</th>
          <th>Bài nộp</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><div><img alt="" /></div></td>
          <td><a href="/admin/dashboard/thi-thu/{id}">Tiêu đề kỳ</a></td>
          <td>Tên môn</td>
          <td>Datetime</td>
          <td>draft | published</td>
          <td>Số bài nộp</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## 2. `/admin/dashboard/thi-thu/[id]` — Sửa kỳ (và `/new` — cùng form)

**Nguồn:** `ThiThuEditorClient` — trang `[id]` và `new` khác **state ban đầu** nhưng **cùng cây DOM**.

```html
<div>
  <div>
    <a href="/admin/dashboard/thi-thu">← Danh sách</a>
    <div>
      <a target="_blank" href="/thi-thu/{id}?preview=countdown">Preview countdown</a>
      <a target="_blank" href="/thi-thu/{id}?preview=exam_1">Preview exam</a>
    </div>
  </div>

  <h1>Sửa kỳ thi | Tạo kỳ thi</h1>

  <div>
    <button type="button">Thông tin</button>
    <button type="button">Đề thi</button>
    <button type="button">Lịch chấm bài</button>
    <button type="button">Bài nộp</button>
  </div>

  <!-- Tab: Thông tin -->
  <div>
    <label>Tiêu đề <input /></label>
    <label>Môn thi <select>…</select></label>
    <label>Giờ bắt đầu <input type="datetime-local" /></label>
    <!-- Môn Hình họa (có giải lao): -->
    <label>Giờ bắt đầu giải lao <input type="datetime-local" /></label>
    <label>Giờ kết thúc giải lao <input type="datetime-local" /></label>
    <label><input type="checkbox" /> Published</label>
    <label>Thumbnail (upload) <input type="file" /> <img /></label>
    <button type="button">Lưu thông tin</button>
    <p>URL public: <code>/thi-thu/{id}</code></p>
  </div>

  <!-- Tab: Đề thi — `ThiThuDeThiTab`, cần đã lưu kỳ có id -->
  <div>
    <div>
      <div>
        <label>Tiêu đề đề thi <input /></label>
        <button type="button">Xóa đề</button>
      </div>
      <div>
        <p>Ảnh đề</p>
        <label>+ Thêm ảnh <input type="file" multiple /></label>
        <div>
          <div><img /><button aria-label="Xóa ảnh">×</button></div>
        </div>
      </div>
      <button type="button">Lưu đề</button>
    </div>
    <button type="button">Thêm đề</button>
  </div>

  <!-- Tab: Lịch chấm bài -->
  <div>
    <label>Ảnh lịch chấm bài <input type="file" /> <img /></label>
    <button type="button">Lưu lịch chấm</button>
  </div>

  <!-- Tab: Bài nộp -->
  <div>
    <table>
      <thead>
        <tr>
          <th>Họ tên</th>
          <th>Facebook</th>
          <th>Giờ nộp</th>
          <th>Số ảnh</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Trang `/new`:** Khi chưa có `id`, tab **Đề thi** chỉ hiển thị dòng hướng dẫn lưu thông tin trước (không có bảng đề).

---

## 3. `/thi-thu` — Danh sách kỳ (public)

**Nguồn:** `page.tsx` + `ThiThuListClient`

```html
<div class="sa-root sa-thi-thu">
  <nav><!-- NavBar site --></nav>

  <section class="page-hero">
    <div class="page-hero-bg"></div>
    <div class="shell">
      <div class="ph-eyebrow">
        <span class="dot" aria-hidden="true"></span>
        Phòng thi trực tuyến
      </div>
      <h1>Thi thử <em>Sine Art</em></h1>
      <p class="lead">Mô tả ngắn / lead</p>
    </div>
  </section>

  <div class="shell">
    <div class="card-grid">
      <article class="tt-card">
        <div class="aspect-video"><img /></div>
        <span><!-- badge môn --></span>
        <h2 class="tt-title">Tiêu đề kỳ</h2>
        <p class="tt-meta">Ngày giờ</p>
        <p>Trạng thái card (sắp diễn ra / đang…)</p>
        <a class="tt-btn" href="/thi-thu/{id}">Vào phòng thi</a>
        <!-- hoặc span disabled khi chưa mở phòng -->
      </article>
    </div>
  </div>

  <!-- Empty -->
  <div class="shell">Chưa có kỳ thi nào được công bố.</div>
</div>
```

---

## 4. `/thi-thu/[id]` — Phòng thi (public)

**Nguồn:** `page.tsx` (NavBar + padding desktop) + `ThiThuRoomClient` + `ThiThuExamProgressBar` + `ThiThuExamDeAccordion` + `ThiThuSubmitModal`.

Một URL duy nhất; **nội dung đổi theo phase** (không phải route con): `waiting` → `countdown` → `exam_1` / `exam_2` → `break` (nếu có) → `ended`.

```html
<div class="sa-root sa-thi-thu min-h-[100dvh]">
  <nav><!-- NavBar --></nav>
  <div>
    <div>
      <!-- Tuỳ admin + query ?preview=... -->
      <div>PREVIEW MODE — phase</div>

      <section>
        <p>Phòng thi chưa mở</p>
        <p>Mở phòng sau:</p>
        <p><!-- countdown MM:SS --></p>
        <a href="/thi-thu">← Danh sách kỳ thi</a>
      </section>

      <section>
        <img alt="Sine Art" />
        <p>Đếm ngược trước khi bắt đầu thi</p>
        <p><!-- countdown MM:SS --></p>
        <a href="/thi-thu">← Danh sách kỳ thi</a>
      </section>

      <section>
        <div>
          <span>Thi thử Sine Art {năm}</span>
          <p>Lớp {tên môn} online</p>
        </div>
        <p>Thời gian làm bài thi còn lại</p>
        <p><!-- HH:MM:SS --></p>

        <div>
          <!-- ThiThuExamProgressBar -->
          <div>
            <span aria-hidden="true">▼</span>
            <span>Nghỉ giải lao</span>
          </div>
          <div>
            <div></div>
          </div>
          <div>
            <div>
              <span aria-hidden="true">▲</span>
              <span>Label mốc (multiline)</span>
              <span>Chú thích mốc đặc biệt (tuỳ mốc)</span>
            </div>
          </div>
        </div>

        <div>
          <span>Giờ bắt đầu</span>
          <span>KẾT THÚC BUỔI THI<br />Giờ kết thúc</span>
        </div>

        <div>
          <h3>Đề thi</h3>
          <div>
            <details>
              <summary>
                <span><!-- chevron --></span>
                <span>Tiêu đề đề</span>
              </summary>
              <div>
                <div class="grid">
                  <button type="button"><img /></button>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div>
          <button type="button">Nộp bài</button>
        </div>
      </section>

      <section>
        <h2>Kết thúc buổi thi đợt 1</h2>
        <p>Hẹn bạn lại lúc …</p>
        <p><!-- countdown tới hết giải lao --></p>
        <img alt="Lịch chấm bài" />
      </section>

      <section>
        <h2>Kết thúc buổi thi</h2>
        <p>Cảm ơn các sĩ tử …</p>
        <img alt="Lịch chấm bài" />
        <a href="/thi-thu">← Về danh sách</a>
      </section>

      <div>
        <div role="dialog" aria-modal="true">
          <div>
            <h2>Nộp bài</h2>
            <button type="button">Đóng</button>
          </div>
          <label>Họ tên * <input /></label>
          <label>Facebook <input /></label>
          <div>
            <p>Ảnh bài làm *</p>
            <label><input type="file" multiple /></label>
            <ul>
              <li><img /><button>Xóa</button></li>
            </ul>
          </div>
          <label>Ghi chú <textarea></textarea></label>
          <button type="button">Gửi bài</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Bảng tham chiếu nhanh

| Route | Ghi chú |
|--------|---------|
| `/admin/dashboard/thi-thu` | Bảng + filter + CTA tạo mới |
| `/admin/dashboard/thi-thu/new` | Cùng form sửa kỳ, chưa có `id` |
| `/admin/dashboard/thi-thu/{id}` | Tab Thông tin / Đề / Lịch / Bài nộp |
| `/thi-thu` | Hero + grid card |
| `/thi-thu/{id}` | Phòng thi — nhiều `<section>` theo phase; modal nộp bài khi bấm CTA |

---

## Design system (tham chiếu nội bộ repo)

- Token / gradient brand: xem `.claude/skills/sineart-design/SKILL.md`, `src/app/thi-thu/ThiThuStyles.tsx` (scoped `.sa-thi-thu`, biến `--grad`, `--grad-start`, `--grad-end`).
- Font: Quicksand (body), Be Vietnam Pro (heading màn thi).

---

*File duy nhất — cập nhật khi cấu trúc component trong repo thay đổi.*
