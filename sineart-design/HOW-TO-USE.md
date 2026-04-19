# Cách đưa vào Cursor

1. Copy toàn bộ thư mục này vào repo `sineart`, đổi tên thành `design-system/`.
2. Copy `.cursorrules` ra **root** của repo (ngang hàng `package.json`). Cursor đọc file này để tự đính kèm luật vào mọi prompt.
3. Trong `src/app/globals.css`, thêm dòng:
   ```css
   @import "../../design-system/colors_and_type.css";
   ```
4. Commit trên nhánh riêng để redesign:
   ```bash
   git checkout -b redesign/design-system
   git add design-system .cursorrules src/app/globals.css
   git commit -m "chore: add design system + cursor rules"
   ```
5. Trong Cursor mở chat:
   > Đọc `design-system/SKILL.md`. Redesign toàn bộ component trong `src/app/_components/` theo hệ thống này — thay hex/radius/shadow hardcoded bằng token, đổi icon sang Feather, radius mặc định 12px.

## Nội dung
- `colors_and_type.css` — token + @font-face Quicksand
- `SKILL.md` — luật thiết kế đầy đủ
- `README.md` — tổng quan hệ thống
- `.cursorrules` — luật rút gọn Cursor tự đọc
- `fonts/` — 5 file Quicksand .TTF
- `assets/brand/sine-art-brand-guide.png` — bộ nhận diện gốc
